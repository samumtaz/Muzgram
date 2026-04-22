import { Body, Controller, Get, Param, ParseUUIDPipe, Post } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';

import { IsEnum, IsNotEmpty, IsOptional, IsString } from 'class-validator';

import { ContentType, ReportReason } from '@muzgram/types';

import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { UserEntity } from '../../database/entities/user.entity';
import { ModerationService } from './moderation.service';

class SubmitReportDto {
  @IsEnum(ContentType)
  contentType: ContentType;

  @IsNotEmpty()
  @IsString()
  contentId: string;

  @IsEnum(ReportReason)
  reason: ReportReason;

  @IsOptional()
  @IsString()
  notes?: string;
}

class ReviewContentDto {
  @IsEnum(ContentType)
  contentType: ContentType;

  @IsNotEmpty()
  @IsString()
  contentId: string;

  @IsEnum(['approve', 'reject'])
  action: 'approve' | 'reject';

  @IsOptional()
  @IsString()
  reason?: string;
}

@ApiTags('moderation')
@Controller('moderation')
export class ModerationController {
  constructor(private readonly moderationService: ModerationService) {}

  @Post('report')
  @ApiOperation({ summary: 'Submit a report on a listing, event, or post' })
  report(@Body() dto: SubmitReportDto, @CurrentUser() user: UserEntity) {
    return this.moderationService.submitReport(
      user,
      dto.contentType,
      dto.contentId,
      dto.reason,
      dto.notes,
    );
  }

  // Admin-only endpoints — in production, guard with an admin role check
  @Get('queue')
  @ApiOperation({ summary: '[ADMIN] Get all pending content awaiting review' })
  getQueue() {
    return this.moderationService.getPendingContent();
  }

  @Post('review')
  @ApiOperation({ summary: '[ADMIN] Approve or reject a content item' })
  review(@Body() dto: ReviewContentDto, @CurrentUser() user: UserEntity) {
    if (dto.action === 'approve') {
      return this.moderationService.approveContent(dto.contentType, dto.contentId, user.id);
    }
    return this.moderationService.rejectContent(
      dto.contentType,
      dto.contentId,
      user.id,
      dto.reason ?? 'Policy violation',
    );
  }
}
