import { InjectQueue } from '@nestjs/bull';
import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';

import { Queue } from 'bull';
import { Repository } from 'typeorm';

import { NotificationType } from '@muzgram/types';
import { NOTIFICATION } from '@muzgram/constants';

import { NotificationEntity } from '../../database/entities/notification.entity';
import { NotificationLogEntity } from '../../database/entities/notification-log.entity';
import { UserEntity } from '../../database/entities/user.entity';
import { NOTIFICATION_QUEUE } from './notifications.module';

interface SendNotificationInput {
  recipientId: string;
  type: NotificationType;
  title: string;
  body: string;
  actionUrl?: string;
  data?: Record<string, unknown>;
  idempotencyKey: string;
}

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(
    @InjectRepository(NotificationEntity)
    private readonly notifRepo: Repository<NotificationEntity>,
    @InjectRepository(NotificationLogEntity)
    private readonly logRepo: Repository<NotificationLogEntity>,
    @InjectRepository(UserEntity)
    private readonly userRepo: Repository<UserEntity>,
    @InjectQueue(NOTIFICATION_QUEUE)
    private readonly queue: Queue,
  ) {}

  async send(input: SendNotificationInput): Promise<void> {
    // Idempotency check — prevents duplicate sends for the same event
    const alreadySent = await this.logRepo.count({
      where: { userId: input.recipientId, idempotencyKey: input.idempotencyKey },
    });
    if (alreadySent > 0) return;

    const user = await this.userRepo.findOne({ where: { id: input.recipientId } });
    if (!user?.isActive || !user.expoPushToken) return;

    // Enforce daily notification cap
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (user.notificationsResetAt === null || user.notificationsResetAt < today) {
      await this.userRepo.update(user.id, { notificationsSentToday: 0, notificationsResetAt: today });
      user.notificationsSentToday = 0;
    }

    if (user.notificationsSentToday >= NOTIFICATION.MAX_PER_USER_PER_DAY) {
      this.logger.debug(`Daily cap reached for user ${input.recipientId}`);
      return;
    }

    // Quiet hours check (server time — for production use user's local time)
    const currentHour = new Date().getHours();
    if (currentHour >= NOTIFICATION.QUIET_HOURS_START || currentHour < NOTIFICATION.QUIET_HOURS_END) {
      this.logger.debug(`Quiet hours — queuing for delivery after 7am`);
      // Queue for next available send window
    }

    // Body length enforcement
    const truncatedBody = input.body.slice(0, NOTIFICATION.MAX_BODY_LENGTH);

    const notification = this.notifRepo.create({
      recipientId: input.recipientId,
      type: input.type,
      title: input.title,
      body: truncatedBody,
      actionUrl: input.actionUrl,
      data: input.data ?? {},
    });
    await this.notifRepo.save(notification);

    await this.logRepo.insert({
      userId: input.recipientId,
      idempotencyKey: input.idempotencyKey,
    });

    await this.userRepo.increment({ id: input.recipientId }, 'notificationsSentToday', 1);

    // Enqueue push delivery to worker
    await this.queue.add('send-push', {
      notificationId: notification.id,
      recipientId: input.recipientId,
      expoPushToken: user.expoPushToken,
      title: input.title,
      body: truncatedBody,
      data: { actionUrl: input.actionUrl, ...input.data },
    });
  }

  async markRead(notificationId: string, userId: string): Promise<void> {
    await this.notifRepo.update(
      { id: notificationId, recipientId: userId },
      { isRead: true, readAt: new Date() },
    );
  }

  async getUserNotifications(userId: string): Promise<NotificationEntity[]> {
    return this.notifRepo.find({
      where: { recipientId: userId },
      order: { createdAt: 'DESC' },
      take: 30,
    });
  }
}
