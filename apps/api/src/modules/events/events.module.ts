import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { CityEntity } from '../../database/entities/city.entity';
import { EventEntity } from '../../database/entities/event.entity';
import { ListingCategoryEntity } from '../../database/entities/listing-category.entity';
import { SaveEntity } from '../../database/entities/save.entity';
import { EventsController } from './events.controller';
import { EventsCronService } from './events.cron';
import { EventSyncService } from './event-sync.service';
import { EventsService } from './events.service';

@Module({
  imports: [TypeOrmModule.forFeature([EventEntity, ListingCategoryEntity, SaveEntity, CityEntity])],
  controllers: [EventsController],
  providers: [EventsService, EventsCronService, EventSyncService],
  exports: [EventsService],
})
export class EventsModule {}
