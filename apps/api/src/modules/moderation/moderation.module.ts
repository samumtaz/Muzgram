import { BullModule } from '@nestjs/bull';
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { CommunityPostEntity } from '../../database/entities/community-post.entity';
import { EventEntity } from '../../database/entities/event.entity';
import { ListingEntity } from '../../database/entities/listing.entity';
import { ReportEntity } from '../../database/entities/report.entity';
import { ModerationController } from './moderation.controller';
import { ModerationService } from './moderation.service';

export const MODERATION_QUEUE = 'moderation';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      ReportEntity,
      ListingEntity,
      EventEntity,
      CommunityPostEntity,
    ]),
    BullModule.registerQueue({ name: MODERATION_QUEUE }),
  ],
  controllers: [ModerationController],
  providers: [ModerationService],
  exports: [ModerationService],
})
export class ModerationModule {}
