import { BullModule } from '@nestjs/bull';
import { Module } from '@nestjs/common';

import { UsersModule } from '../users/users.module';
import { AnalyticsController } from './analytics.controller';
import { ANALYTICS_QUEUE } from './analytics.constants';
import { AnalyticsProcessor } from './analytics.processor';
import { AnalyticsService } from './analytics.service';

@Module({
  imports: [BullModule.registerQueue({ name: ANALYTICS_QUEUE }), UsersModule],
  controllers: [AnalyticsController],
  providers: [AnalyticsService, AnalyticsProcessor],
  exports: [AnalyticsService],
})
export class AnalyticsModule {}
