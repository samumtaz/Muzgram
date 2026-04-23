import { BullModule } from '@nestjs/bull';
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { CommunityPostEntity } from '../../database/entities/community-post.entity';
import { EventEntity } from '../../database/entities/event.entity';
import { ListingEntity } from '../../database/entities/listing.entity';
import { ReportEntity } from '../../database/entities/report.entity';
import { UsersModule } from '../users/users.module';
import { MODERATION_QUEUE } from './moderation.constants';
import { ModerationController } from './moderation.controller';
import { ModerationProcessor } from './moderation.processor';
import { ModerationService } from './moderation.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      ReportEntity,
      ListingEntity,
      EventEntity,
      CommunityPostEntity,
    ]),
    BullModule.registerQueue({ name: MODERATION_QUEUE }),
    UsersModule,
  ],
  controllers: [ModerationController],
  providers: [ModerationService, ModerationProcessor],
  exports: [ModerationService],
})
export class ModerationModule {}
