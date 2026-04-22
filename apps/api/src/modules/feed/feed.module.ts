import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { CommunityPostEntity } from '../../database/entities/community-post.entity';
import { EventEntity } from '../../database/entities/event.entity';
import { ListingEntity } from '../../database/entities/listing.entity';
import { SaveEntity } from '../../database/entities/save.entity';
import { FeedController } from './feed.controller';
import { FeedScoringService } from './feed-scoring.service';
import { FeedService } from './feed.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([ListingEntity, EventEntity, CommunityPostEntity, SaveEntity]),
  ],
  controllers: [FeedController],
  providers: [FeedService, FeedScoringService],
  exports: [FeedService],
})
export class FeedModule {}
