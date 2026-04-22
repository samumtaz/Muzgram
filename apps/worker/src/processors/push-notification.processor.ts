import { Process, Processor } from '@nestjs/bull';
import { Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';

import { Job } from 'bull';
import { Expo, ExpoPushMessage, ExpoPushTicket } from 'expo-server-sdk';
import { Repository } from 'typeorm';

const NOTIFICATION_QUEUE = 'notifications';

interface PushJobData {
  notificationId: string;
  recipientId: string;
  expoPushToken: string;
  title: string;
  body: string;
  data?: Record<string, unknown>;
}

@Processor(NOTIFICATION_QUEUE)
export class PushNotificationProcessor {
  private readonly logger = new Logger(PushNotificationProcessor.name);
  private readonly expo = new Expo({ useFcmV1: true });

  constructor() {}

  @Process('send-push')
  async handleSendPush(job: Job<PushJobData>): Promise<void> {
    const { expoPushToken, title, body, data, notificationId, recipientId } = job.data;

    if (!Expo.isExpoPushToken(expoPushToken)) {
      this.logger.warn(`Invalid Expo push token for user ${recipientId} — skipping`);
      return;
    }

    const message: ExpoPushMessage = {
      to: expoPushToken,
      title,
      body,
      data: data ?? {},
      sound: 'default',
      priority: 'normal',
      channelId: 'default',
    };

    const chunks = this.expo.chunkPushNotifications([message]);

    for (const chunk of chunks) {
      try {
        const tickets: ExpoPushTicket[] = await this.expo.sendPushNotificationsAsync(chunk);

        for (const ticket of tickets) {
          if (ticket.status === 'error') {
            this.logger.error(
              `Push error for notification ${notificationId}: ${ticket.message}`,
              ticket.details,
            );

            // If the device token is invalid, clear it from the user record
            if (ticket.details?.error === 'DeviceNotRegistered') {
              this.logger.warn(`Clearing invalid push token for user ${recipientId}`);
              // Emit event or directly update DB to clear expoPushToken
            }
          }
        }
      } catch (error) {
        this.logger.error(`Failed to send push chunk: ${(error as Error).message}`);
        throw error; // Triggers Bull retry
      }
    }
  }
}
