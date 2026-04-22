import { Controller, Get, Query } from '@nestjs/common';
import { ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';

import { IsEnum, IsNumber, IsOptional, IsString, Max, Min } from 'class-validator';
import { Transform, Type } from 'class-transformer';

import { ListingMainCategory } from '@muzgram/types';
import { FEED_DEFAULT_RADIUS_KM, FEED_MAX_RADIUS_KM } from '@muzgram/constants';

import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Public } from '../../common/decorators/public.decorator';
import { UserEntity } from '../../database/entities/user.entity';
import { FeedService } from './feed.service';

class FeedQueryDto {
  @Type(() => Number)
  @IsNumber()
  @Min(-90)
  @Max(90)
  lat: number;

  @Type(() => Number)
  @IsNumber()
  @Min(-180)
  @Max(180)
  lng: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0.5)
  @Max(FEED_MAX_RADIUS_KM)
  radiusKm?: number;

  @IsOptional()
  @IsEnum(ListingMainCategory)
  category?: ListingMainCategory;

  @IsOptional()
  @IsString()
  cursor?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @Max(50)
  limit?: number;
}

class MapPinsQueryDto {
  @Type(() => Number)
  @IsNumber()
  lat: number;

  @Type(() => Number)
  @IsNumber()
  lng: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @Max(FEED_MAX_RADIUS_KM)
  radiusKm?: number;
}

@ApiTags('feed')
@Controller('feed')
export class FeedController {
  constructor(private readonly feedService: FeedService) {}

  @Public()
  @Get()
  @ApiOperation({ summary: 'Get scored, ranked proximity feed' })
  @ApiQuery({ name: 'lat', required: true, type: Number })
  @ApiQuery({ name: 'lng', required: true, type: Number })
  @ApiQuery({ name: 'radiusKm', required: false, type: Number })
  @ApiQuery({ name: 'category', required: false, enum: ListingMainCategory })
  @ApiQuery({ name: 'cursor', required: false, type: String })
  getFeed(@Query() query: FeedQueryDto, @CurrentUser() user?: UserEntity) {
    return this.feedService.getFeed({
      ...query,
      radiusKm: query.radiusKm ?? FEED_DEFAULT_RADIUS_KM,
      userId: user?.id,
    });
  }

  @Public()
  @Get('map')
  @ApiOperation({ summary: 'Get map pins for all nearby content' })
  getMapPins(@Query() query: MapPinsQueryDto) {
    return this.feedService.getMapPins(
      query.lat,
      query.lng,
      query.radiusKm ?? FEED_DEFAULT_RADIUS_KM,
    );
  }
}
