import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { LeadEntity } from '../../database/entities/lead.entity';
import { ListingEntity } from '../../database/entities/listing.entity';
import { UsersModule } from '../users/users.module';
import { LeadsController } from './leads.controller';
import { LeadsService } from './leads.service';

@Module({
  imports: [TypeOrmModule.forFeature([LeadEntity, ListingEntity]), UsersModule],
  controllers: [LeadsController],
  providers: [LeadsService],
  exports: [LeadsService],
})
export class LeadsModule {}
