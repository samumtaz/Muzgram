import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { LessThan, Repository } from 'typeorm';

import { EventStatus } from '@muzgram/types';
import { EventEntity } from '../../database/entities/event.entity';

@Injectable()
export class EventsCronService {
  private readonly logger = new Logger(EventsCronService.name);

  constructor(
    @InjectRepository(EventEntity)
    private readonly events: Repository<EventEntity>,
  ) {}

  // Runs every day at 2am — marks events completed 30 days after they ended
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
}
