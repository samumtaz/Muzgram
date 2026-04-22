import { InjectQueue } from '@nestjs/bull';
import { Injectable, Logger } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { Queue } from 'bull';
import { DataSource } from 'typeorm';

import { AnalyticsEventDto } from './dto/batch-events.dto';
import { SessionStartDto } from './dto/session-start.dto';

const VALID_EVENT_NAMES = new Set([
  'feed_viewed', 'feed_card_tapped', 'map_opened', 'map_pin_tapped',
  'explore_opened', 'category_tapped', 'save_toggled', 'share_tapped',
  'directions_tapped', 'call_tapped', 'whatsapp_tapped', 'lead_submitted',
  'search_performed', 'search_result_tapped', 'post_created', 'event_created',
  'business_created', 'app_opened', 'session_ended', 'halal_radar_opened',
  'halal_radar_result_tapped',
]);

const MAX_EVENT_AGE_MS = 24 * 60 * 60 * 1000; // 24 hours

@Injectable()
export class AnalyticsService {
  private readonly logger = new Logger(AnalyticsService.name);

  constructor(
    @InjectQueue('notifications')
    private readonly queue: Queue,
    @InjectDataSource()
    private readonly db: DataSource,
  ) {}

  async queueEvents(events: AnalyticsEventDto[], userId: string) {
    const now = Date.now();

    const valid = events.filter((e) => {
      if (!VALID_EVENT_NAMES.has(e.eventName)) return false;
      const age = now - new Date(e.occurredAt).getTime();
      return age >= 0 && age <= MAX_EVENT_AGE_MS;
    });

    if (valid.length === 0) return;

    // Enqueue for bulk insert by worker (fire-and-forget)
    await this.queue.add(
      'analytics-batch',
      { userId, events: valid },
      { attempts: 2, removeOnComplete: true, removeOnFail: 50 },
    );
  }

  async recordSession(dto: SessionStartDto, userId: string) {
    // Synchronous write — used for D7/D30 retention metric in docs/15
    await this.db.query(
      `INSERT INTO activity_logs (user_id, event_name, properties, occurred_at)
       VALUES ($1, $2, $3, NOW())
       ON CONFLICT DO NOTHING`,
      [
        userId,
        'session_start',
        JSON.stringify({
          source: dto.source,
          pushType: dto.pushType ?? null,
          appVersion: dto.appVersion ?? null,
          platform: dto.platform ?? null,
          sessionId: dto.sessionId ?? null,
        }),
      ],
    ).catch((err: Error) => {
      // Gracefully degrade — session tracking failure never surfaces to user
      this.logger.warn(`Session record failed: ${err.message}`);
    });
  }

  // Called by worker to process the queue batch
  async insertEventBatch(userId: string, events: AnalyticsEventDto[]) {
    if (events.length === 0) return;

    const values = events
      .map(
        (_, i) =>
          `($${i * 4 + 1}, $${i * 4 + 2}, $${i * 4 + 3}::jsonb, $${i * 4 + 4}::timestamptz)`,
      )
      .join(', ');

    const params = events.flatMap((e) => [
      userId,
      e.eventName,
      JSON.stringify(e.properties ?? {}),
      e.occurredAt,
    ]);

    await this.db.query(
      `INSERT INTO activity_logs (user_id, event_name, properties, occurred_at)
       VALUES ${values}
       ON CONFLICT DO NOTHING`,
      params,
    );
  }
}
