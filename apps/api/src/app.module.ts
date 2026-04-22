import { BullModule } from '@nestjs/bull';
import { CacheModule } from '@nestjs/cache-manager';
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { APP_INTERCEPTOR, APP_GUARD } from '@nestjs/core';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { TypeOrmModule } from '@nestjs/typeorm';

import { redisStore } from 'cache-manager-redis-yet';

import { AuditInterceptor } from './common/interceptors/audit.interceptor';

import { AnalyticsModule } from './modules/analytics/analytics.module';
import { AuthModule } from './modules/auth/auth.module';
import { BillingModule } from './modules/billing/billing.module';
import { EventsModule } from './modules/events/events.module';
import { LeadsModule } from './modules/leads/leads.module';
import { SearchModule } from './modules/search/search.module';
import { FeedModule } from './modules/feed/feed.module';
import { GeoModule } from './modules/geo/geo.module';
import { ListingsModule } from './modules/listings/listings.module';
import { MediaModule } from './modules/media/media.module';
import { ModerationModule } from './modules/moderation/moderation.module';
import { NotificationsModule } from './modules/notifications/notifications.module';
import { PostsModule } from './modules/posts/posts.module';
import { ProvidersModule } from './modules/providers/providers.module';
import { SavesModule } from './modules/saves/saves.module';
import { UsersModule } from './modules/users/users.module';
import { dataSourceOptions } from './database/data-source';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      cache: true,
    }),

    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: () => ({
        ...dataSourceOptions,
        autoLoadEntities: true,
      }),
    }),

    CacheModule.registerAsync({
      isGlobal: true,
      inject: [ConfigService],
      useFactory: async (config: ConfigService) => ({
        store: redisStore,
        url: config.get<string>('REDIS_URL'),
        ttl: 60 * 1000,
      }),
    }),

    BullModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        redis: config.get<string>('REDIS_URL'),
        defaultJobOptions: {
          attempts: 3,
          backoff: { type: 'exponential', delay: 2000 },
          removeOnComplete: 100,
          removeOnFail: 50,
        },
      }),
    }),

    ThrottlerModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        throttlers: [
          {
            ttl: config.get<number>('RATE_LIMIT_TTL', 60) * 1000,
            limit: config.get<number>('RATE_LIMIT_MAX', 120),
          },
        ],
      }),
    }),

    AnalyticsModule,
    AuthModule,
    BillingModule,
    LeadsModule,
    SearchModule,
    UsersModule,
    FeedModule,
    ListingsModule,
    EventsModule,
    ProvidersModule,
    PostsModule,
    SavesModule,
    GeoModule,
    MediaModule,
    NotificationsModule,
    ModerationModule,
  ],
  providers: [
    // Throttler guard applied globally
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    // Audit interceptor — writes moderation_actions on admin mutations (DI-aware)
    { provide: APP_INTERCEPTOR, useClass: AuditInterceptor },
  ],
})
export class AppModule {}
