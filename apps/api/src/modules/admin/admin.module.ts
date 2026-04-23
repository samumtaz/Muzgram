import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { AuditLogEntity } from '../../database/entities/audit-log.entity';
import { CityEntity } from '../../database/entities/city.entity';
import { ListingEntity } from '../../database/entities/listing.entity';
import { NotificationLogEntity } from '../../database/entities/notification-log.entity';
import { NotificationEntity } from '../../database/entities/notification.entity';
import { BillingModule } from '../billing/billing.module';
import { SupportModule } from '../support/support.module';
import { UsersModule } from '../users/users.module';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      CityEntity,
      ListingEntity,
      AuditLogEntity,
      NotificationLogEntity,
      NotificationEntity,
    ]),
    BillingModule,
    SupportModule,
    UsersModule,
  ],
  controllers: [AdminController],
  providers: [AdminService],
})
export class AdminModule {}
