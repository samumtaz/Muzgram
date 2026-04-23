import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { ListingEntity } from '../../database/entities/listing.entity';
import { ProvidersController } from './providers.controller';
import { ProvidersService } from './providers.service';

@Module({
  imports: [TypeOrmModule.forFeature([ListingEntity])],
  controllers: [ProvidersController],
  providers: [ProvidersService],
})
export class ProvidersModule {}
