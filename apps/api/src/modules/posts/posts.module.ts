import { BullModule } from '@nestjs/bull';
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { CommunityPostEntity } from '../../database/entities/community-post.entity';
import { MODERATION_QUEUE } from '../moderation/moderation.constants';
import { PostsController } from './posts.controller';
import { PostsService } from './posts.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([CommunityPostEntity]),
    BullModule.registerQueue({ name: MODERATION_QUEUE }),
  ],
  controllers: [PostsController],
  providers: [PostsService],
  exports: [PostsService],
})
export class PostsModule {}
