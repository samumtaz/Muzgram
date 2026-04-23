import { BullModule } from '@nestjs/bull';
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { NotificationEntity } from '../../database/entities/notification.entity';
import { NotificationLogEntity } from '../../database/entities/notification-log.entity';
import { UserEntity } from '../../database/entities/user.entity';
import { UsersModule } from '../users/users.module';
import { NOTIFICATION_QUEUE } from './notifications.constants';
import { NotificationsController } from './notifications.controller';
import { NotificationsProcessor } from './notifications.processor';
import { NotificationsService } from './notifications.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([NotificationEntity, NotificationLogEntity, UserEntity]),
    BullModule.registerQueue({ name: NOTIFICATION_QUEUE }),
    UsersModule,
  ],
  controllers: [NotificationsController],
  providers: [NotificationsService, NotificationsProcessor],
  exports: [NotificationsService],
})
export class NotificationsModule {}
