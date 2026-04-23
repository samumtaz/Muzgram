import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';

import { IsEnum, IsNotEmpty, IsOptional, IsString } from 'class-validator';

import { ContentType, ReportReason } from '@muzgram/types';

import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { AdminGuard } from '../../common/guards/admin.guard';
import { ClerkAuthGuard } from '../../common/guards/clerk-auth.guard';
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
  @UseGuards(ClerkAuthGuard)
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

  @Get('queue')
  @UseGuards(ClerkAuthGuard, AdminGuard)
  @ApiOperation({ summary: '[ADMIN] Get all pending content awaiting review' })
  getQueue() {
    return this.moderationService.getPendingContent();
  }

  @Post('review')
  @UseGuards(ClerkAuthGuard, AdminGuard)
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
