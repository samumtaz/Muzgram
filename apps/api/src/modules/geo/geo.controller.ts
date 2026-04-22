import { Controller, Get, Query } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';

import { IsNumber } from 'class-validator';
import { Type } from 'class-transformer';

import { Public } from '../../common/decorators/public.decorator';
import { GeoService } from './geo.service';

class DetectCityQueryDto {
  @Type(() => Number)
  @IsNumber()
  lat: number;

  @Type(() => Number)
  @IsNumber()
  lng: number;
}

@ApiTags('geo')
@Controller('geo')
export class GeoController {
  constructor(private readonly geoService: GeoService) {}

  @Public()
  @Get('cities')
  @ApiOperation({ summary: 'Get all active service cities' })
  getCities() {
    return this.geoService.getAllActive();
  }

  @Public()
  @Get('detect-city')
  @ApiOperation({ summary: 'Detect which city a coordinate falls in' })
  detectCity(@Query() query: DetectCityQueryDto) {
    return this.geoService.detectCity(query.lat, query.lng);
  }
}
