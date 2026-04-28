import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { LessThan, Repository } from 'typeorm';

import { EventStatus } from '@muzgram/types';
import { EventEntity } from '../../database/entities/event.entity';
import { EventSyncService } from './event-sync.service';

@Injectable()
export class EventsCronService {
  private readonly logger = new Logger(EventsCronService.name);

  constructor(
    @InjectRepository(EventEntity)
    private readonly events: Repository<EventEntity>,
    private readonly eventSync: EventSyncService,
  ) {}

  // 2am — archive old completed events
  @Cron(CronExpression.EVERY_DAY_AT_2AM)
  async archiveCompletedEvents() {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - 30);

    const result = await this.events.update(
      {
        status: EventStatus.ACTIVE,
        endAt: LessThan(cutoff),
      },
      { status: EventStatus.COMPLETED },
    );

    if (result.affected) {
      this.logger.log(`Archived ${result.affected} completed event(s)`);
    }
  }

  // 3am — pull fresh events from Ticketmaster + Eventbrite
  @Cron(CronExpression.EVERY_DAY_AT_3AM)
  async syncExternalEvents() {
    this.logger.log('Starting external event sync...');
    const { synced, skipped } = await this.eventSync.syncAll();
    this.logger.log(`External sync done — ${synced} upserted, ${skipped} skipped`);
  }
}
