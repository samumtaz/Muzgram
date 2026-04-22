import { DataSource, DataSourceOptions } from 'typeorm';

import { SnakeNamingStrategy } from './snake-naming.strategy';
import { CityEntity } from './entities/city.entity';
import { CommunityPostEntity } from './entities/community-post.entity';
import { DailySpecialEntity } from './entities/daily-special.entity';
import { EventEntity } from './entities/event.entity';
import { LeadEntity } from './entities/lead.entity';
import { ListingCategoryEntity } from './entities/listing-category.entity';
import { ListingEntity } from './entities/listing.entity';
import { MediaAssetEntity } from './entities/media-asset.entity';
import { NotificationEntity } from './entities/notification.entity';
import { NotificationLogEntity } from './entities/notification-log.entity';
import { ReportEntity } from './entities/report.entity';
import { SaveEntity } from './entities/save.entity';
import { UserEntity } from './entities/user.entity';
import { PaymentEntity } from '../modules/billing/entities/payment.entity';
import { SubscriptionEntity } from '../modules/billing/entities/subscription.entity';
import { AuditLogEntity } from './entities/audit-log.entity';

export const dataSourceOptions: DataSourceOptions = {
  type: 'postgres',
  // Migrations use direct connection (bypasses PgBouncer — required for DDL)
  url: process.env.DATABASE_DIRECT_URL ?? process.env.DATABASE_URL,
  entities: [
    CityEntity,
    UserEntity,
    ListingCategoryEntity,
    ListingEntity,
    DailySpecialEntity,
    EventEntity,
    CommunityPostEntity,
    LeadEntity,
    SaveEntity,
    MediaAssetEntity,
    NotificationEntity,
    NotificationLogEntity,
    ReportEntity,
    SubscriptionEntity,
    PaymentEntity,
    AuditLogEntity,
  ],
  migrations: ['dist/apps/api/src/database/migrations/*.js'],
  namingStrategy: new SnakeNamingStrategy(),
  ssl: { rejectUnauthorized: false },
  logging: process.env.NODE_ENV === 'development',
};

export const AppDataSource = new DataSource(dataSourceOptions);
