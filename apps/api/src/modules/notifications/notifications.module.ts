import { BullModule } from '@nestjs/bull';
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { NotificationEntity } from '../../database/entities/notification.entity';
import { NotificationLogEntity } from '../../database/entities/notification-log.entity';
import { UserEntity } from '../../database/entities/user.entity';
import { NotificationsService } from './notifications.service';

export const NOTIFICATION_QUEUE = 'notifications';

@Module({
  imports: [
    TypeOrmModule.forFeature([NotificationEntity, NotificationLogEntity, UserEntity]),
    BullModule.registerQueue({ name: NOTIFICATION_QUEUE }),
  ],
  providers: [NotificationsService],
  exports: [NotificationsService],
})
export class NotificationsModule {}
