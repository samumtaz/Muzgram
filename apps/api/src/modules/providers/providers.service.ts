import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';

import { Repository } from 'typeorm';

import { ListingMainCategory, ListingStatus } from '@muzgram/types';
import { FEED_DEFAULT_RADIUS_KM } from '@muzgram/constants';

import { ListingEntity } from '../../database/entities/listing.entity';

interface SearchProvidersOptions {
  lat: number;
  lng: number;
  radiusKm?: number;
  categorySlug?: string;
  cursor?: string;
}

@Injectable()
export class ProvidersService {
  constructor(
    @InjectRepository(ListingEntity)
    private readonly repo: Repository<ListingEntity>,
  ) {}

  async searchNearby(opts: SearchProvidersOptions): Promise<ListingEntity[]> {
    const radiusMeters = (opts.radiusKm ?? FEED_DEFAULT_RADIUS_KM) * 1000;

    const qb = this.repo
      .createQueryBuilder('l')
      .leftJoinAndSelect('l.category', 'category')
      .addSelect(
        `ST_Distance(l.location::geography, ST_SetSRID(ST_MakePoint(:lng, :lat), 4326)::geography) / 1000`,
        'distanceKm',
      )
      .where(
        `ST_DWithin(l.location::geography, ST_SetSRID(ST_MakePoint(:lng, :lat), 4326)::geography, :radius)`,
        { lat: opts.lat, lng: opts.lng, radius: radiusMeters },
      )
      .andWhere('l.status = :status', { status: ListingStatus.ACTIVE })
      .andWhere('l.mainCategory = :cat', { cat: ListingMainCategory.CONNECT })
      .setParameter('lat', opts.lat)
      .setParameter('lng', opts.lng)
      .orderBy('l.isFeatured', 'DESC')
      .addOrderBy('distanceKm', 'ASC')
      .limit(50);

    if (opts.categorySlug) {
      qb.andWhere('category.slug = :categorySlug', { categorySlug: opts.categorySlug });
    }

    const raw = await qb.getRawAndEntities();
    return raw.entities.map((entity, i) => ({
      ...entity,
      distanceKm: parseFloat(raw.raw[i].distanceKm ?? '0'),
    }));
  }
}
