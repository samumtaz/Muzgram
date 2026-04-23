import { Controller, Get, Query, UseGuards } from '@nestjs/common';

import { ClerkAuthGuard } from '../../common/guards/clerk-auth.guard';
import { SearchService } from './search.service';

@Controller('v1/search')
@UseGuards(ClerkAuthGuard)
export class SearchController {
  constructor(private readonly searchService: SearchService) {}

  @Get()
  async search(
    @Query('q') q: string,
    @Query('city_id') cityId?: string,
    @Query('city_slug') citySlug?: string,
    @Query('category') category?: string,
    @Query('lat') lat?: string,
    @Query('lng') lng?: string,
    @Query('radius_meters') radiusMeters?: string,
    @Query('limit') limit?: string,
  ) {
    if (!q || q.length < 2) {
      return {
        type: '/errors/validation-error',
        title: 'Validation Error',
        status: 422,
        detail: 'Search query must be at least 2 characters.',
      };
    }

    return this.searchService.search({
      q: q.slice(0, 100),
      cityId,
      citySlug,
      category,
      lat: lat ? parseFloat(lat) : undefined,
      lng: lng ? parseFloat(lng) : undefined,
      radiusMeters: radiusMeters ? parseInt(radiusMeters, 10) : undefined,
      limit: limit ? parseInt(limit, 10) : undefined,
    });
  }

  @Get('suggest')
  async suggest(
    @Query('q') q: string,
    @Query('city_id') cityId?: string,
    @Query('city_slug') citySlug?: string,
  ) {
    if (!q || q.length < 1) {
      return { suggestions: [] };
    }
    return this.searchService.suggest(q.slice(0, 50), cityId, citySlug);
  }
}
