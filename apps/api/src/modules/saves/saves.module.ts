import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { CommunityPostEntity } from '../../database/entities/community-post.entity';
import { EventEntity } from '../../database/entities/event.entity';
import { ListingEntity } from '../../database/entities/listing.entity';
import { SaveEntity } from '../../database/entities/save.entity';
import { UsersModule } from '../users/users.module';
import { SavesController } from './saves.controller';
import { SavesService } from './saves.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([SaveEntity, ListingEntity, EventEntity, CommunityPostEntity]),
    UsersModule,
  ],
  controllers: [SavesController],
  providers: [SavesService],
  exports: [SavesService],
})
export class SavesModule {}
