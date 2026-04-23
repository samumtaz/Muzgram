import { Process, Processor } from '@nestjs/bull';
import { Logger } from '@nestjs/common';

import { Job } from 'bull';

import { ANALYTICS_QUEUE } from './analytics.constants';
import { AnalyticsService } from './analytics.service';
import { AnalyticsEventDto } from './dto/batch-events.dto';

interface AnalyticsBatchJob {
  userId: string;
  events: AnalyticsEventDto[];
}

@Processor(ANALYTICS_QUEUE)
export class AnalyticsProcessor {
  private readonly logger = new Logger(AnalyticsProcessor.name);

  constructor(private readonly analyticsService: AnalyticsService) {}

  @Process('analytics-batch')
  async handleBatch(job: Job<AnalyticsBatchJob>): Promise<void> {
    const { userId, events } = job.data;
    if (!events?.length) return;

    try {
      await this.analyticsService.insertEventBatch(userId, events);
      this.logger.debug(`Flushed ${events.length} analytics events for user ${userId}`);
    } catch (err) {
      this.logger.error(`Analytics batch insert failed: ${(err as Error).message}`);
      throw err;
    }
  }
}
