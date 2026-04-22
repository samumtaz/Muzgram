import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { EventEntity } from '../../database/entities/event.entity';
import { ListingCategoryEntity } from '../../database/entities/listing-category.entity';
import { SaveEntity } from '../../database/entities/save.entity';
import { EventsController } from './events.controller';
import { EventsService } from './events.service';

@Module({
  imports: [TypeOrmModule.forFeature([EventEntity, ListingCategoryEntity, SaveEntity])],
  controllers: [EventsController],
  providers: [EventsService],
  exports: [EventsService],
})
export class EventsModule {}
