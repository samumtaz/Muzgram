import { Module } from '@nestjs/common';

import { ListingsModule } from '../listings/listings.module';
import { ProvidersController } from './providers.controller';
import { ProvidersService } from './providers.service';

// Service providers (Connect tab) are a filtered view of Listings
// with mainCategory = 'connect'. No separate entities needed.
@Module({
  imports: [ListingsModule],
  controllers: [ProvidersController],
  providers: [ProvidersService],
})
export class ProvidersModule {}
