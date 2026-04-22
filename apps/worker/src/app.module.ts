import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { BullModule } from '@nestjs/bullmq';
import { TypeOrmModule } from '@nestjs/typeorm';

import { AppDataSource } from './database/data-source';
import { PushNotificationProcessor } from './processors/push-notification.processor';
import { ModerationProcessor } from './processors/moderation.processor';
import { FeedCacheProcessor } from './processors/feed-cache.processor';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),

    TypeOrmModule.forRootAsync({
      useFactory: () => ({
        ...AppDataSource.options,
        autoLoadEntities: false,
      }),
    }),

    BullModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        connection: {
          url: config.getOrThrow('REDIS_URL'),
          tls: config.get('REDIS_TLS') === 'true' ? {} : undefined,
        },
      }),
    }),

    BullModule.registerQueue(
      { name: 'notifications' },
      { name: 'moderation' },
      { name: 'feed-cache' },
    ),
  ],
  providers: [PushNotificationProcessor, ModerationProcessor, FeedCacheProcessor],
})
export class AppModule {}
