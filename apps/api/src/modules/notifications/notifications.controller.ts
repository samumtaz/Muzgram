import { Controller, Get, HttpCode, Param, ParseUUIDPipe, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';

import { ClerkAuthGuard } from '../../common/guards/clerk-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { UserEntity } from '../../database/entities/user.entity';
import { NotificationsService } from './notifications.service';

@ApiTags('notifications')
@Controller('v1/notifications')
@UseGuards(ClerkAuthGuard)
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Get()
  @ApiOperation({ summary: 'Get the authenticated user notification inbox (paginated)' })
  getInbox(
    @CurrentUser() user: UserEntity,
    @Query('cursor') cursor?: string,
    @Query('limit') limit?: string,
  ) {
    return this.notificationsService.getUserNotificationsPaged(user.id, cursor, Number(limit) || 30);
  }

  @Patch(':id/read')
  @ApiOperation({ summary: 'Mark a single notification as read' })
  markRead(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: UserEntity) {
    return this.notificationsService.markRead(id, user.id);
  }

  @Post('read-all')
  @HttpCode(204)
  @ApiOperation({ summary: 'Mark all notifications as read' })
  markAllRead(@CurrentUser() user: UserEntity) {
    return this.notificationsService.markAllRead(user.id);
  }
}
