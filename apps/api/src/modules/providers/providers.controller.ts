import { Controller, Get, Query } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';

import { IsNumber, IsOptional, IsString, Max, Min } from 'class-validator';
import { Type } from 'class-transformer';

import { FEED_DEFAULT_RADIUS_KM } from '@muzgram/constants';

import { Public } from '../../common/decorators/public.decorator';
import { ProvidersService } from './providers.service';

class SearchProvidersQueryDto {
  @Type(() => Number)
  @IsNumber()
  lat: number;

  @Type(() => Number)
  @IsNumber()
  lng: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0.5)
  @Max(40)
  radiusKm?: number;

  @IsOptional()
  @IsString()
  category?: string;
}

@ApiTags('providers')
@Controller('providers')
export class ProvidersController {
  constructor(private readonly providersService: ProvidersService) {}

  @Public()
  @Get()
  @ApiOperation({ summary: 'Search service providers (Connect tab) near a location' })
  search(@Query() query: SearchProvidersQueryDto) {
    return this.providersService.searchNearby({
      lat: query.lat,
      lng: query.lng,
      radiusKm: query.radiusKm ?? FEED_DEFAULT_RADIUS_KM,
      categorySlug: query.category,
    });
  }
}
