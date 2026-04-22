import { Body, Controller, HttpCode, Post, UseGuards } from '@nestjs/common';

import { ClerkAuthGuard } from '../../common/guards/clerk-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { UserEntity } from '../../database/entities/user.entity';
import { AnalyticsService } from './analytics.service';
import { BatchEventsDto } from './dto/batch-events.dto';
import { SessionStartDto } from './dto/session-start.dto';

@Controller('v1/analytics')
@UseGuards(ClerkAuthGuard)
export class AnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  // Fire-and-forget — ALWAYS returns 200 even on failure (docs/08)
  @Post('events')
  @HttpCode(200)
  async batchEvents(@Body() dto: BatchEventsDto, @CurrentUser() user: UserEntity) {
    try {
      await this.analyticsService.queueEvents(dto.events, user.id);
      return { data: { accepted: dto.events?.length ?? 0, queued: true } };
    } catch {
      return { data: { accepted: 0, queued: false } };
    }
  }

  // Session tracking — synchronous write for D7/D30 retention
  @Post('sessions')
  @HttpCode(200)
  async sessionStart(@Body() dto: SessionStartDto, @CurrentUser() user: UserEntity) {
    try {
      await this.analyticsService.recordSession(dto, user.id);
      return { data: { recorded: true } };
    } catch {
      return { data: { recorded: false } };
    }
  }
}
