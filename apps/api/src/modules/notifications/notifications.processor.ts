import { Process, Processor } from '@nestjs/bull';
import { Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';

import { Job } from 'bull';
import { Expo, ExpoPushMessage, ExpoPushTicket } from 'expo-server-sdk';
import { Repository } from 'typeorm';

import { NotificationLogEntity } from '../../database/entities/notification-log.entity';
import { NOTIFICATION_QUEUE } from './notifications.constants';

interface PushJobData {
  notificationId: string;
  recipientId: string;
  expoPushToken: string;
  title: string;
  body: string;
  data?: Record<string, unknown>;
  idempotencyKey?: string;
}

@Processor(NOTIFICATION_QUEUE)
export class NotificationsProcessor {
  private readonly logger = new Logger(NotificationsProcessor.name);
  private readonly expo = new Expo({ accessToken: process.env.EXPO_ACCESS_TOKEN });

  constructor(
    @InjectRepository(NotificationLogEntity)
    private readonly logRepo: Repository<NotificationLogEntity>,
  ) {}

  @Process('send-push')
  async handleSendPush(job: Job<PushJobData>): Promise<void> {
    const { recipientId, expoPushToken, title, body, data, idempotencyKey } = job.data;

    if (!Expo.isExpoPushToken(expoPushToken)) {
      this.logger.warn(`Invalid Expo push token for user ${recipientId}`);
      await this.updateDeliveryStatus(recipientId, idempotencyKey, 'invalid_token');
      return;
    }

    const message: ExpoPushMessage = {
      to: expoPushToken,
      title,
      body,
      data: data ?? {},
      sound: 'default',
      priority: 'high',
    };

    try {
      const chunks = this.expo.chunkPushNotifications([message]);

      for (const chunk of chunks) {
        const tickets = await this.expo.sendPushNotificationsAsync(chunk);

        for (const ticket of tickets) {
          await this.processTicket(ticket, recipientId, idempotencyKey);
        }
      }
    } catch (err) {
      this.logger.error(`Push delivery failed for user ${recipientId}: ${(err as Error).message}`);
      await this.updateDeliveryStatus(recipientId, idempotencyKey, 'error');
      throw err; // re-throw so Bull retries
    }
  }

  private async processTicket(
    ticket: ExpoPushTicket,
    userId: string,
    idempotencyKey?: string,
  ): Promise<void> {
    if (!idempotencyKey) return;

    if (ticket.status === 'ok') {
      await this.logRepo.update(
        { userId, idempotencyKey },
        { expoTicketId: ticket.id, deliveryStatus: 'ok' },
      );
    } else {
      const details = (ticket as any).details;
      const errorCode: string = details?.error ?? 'unknown';
      this.logger.warn(`Push ticket error for user ${userId}: ${errorCode}`);
      await this.logRepo.update(
        { userId, idempotencyKey },
        { deliveryStatus: errorCode },
      );
    }
  }

  private async updateDeliveryStatus(
    userId: string,
    idempotencyKey: string | undefined,
    status: string,
  ): Promise<void> {
    if (!idempotencyKey) return;
    await this.logRepo.update({ userId, idempotencyKey }, { deliveryStatus: status }).catch(() => {});
  }
}
