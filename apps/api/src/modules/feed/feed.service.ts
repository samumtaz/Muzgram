import { Inject, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { CACHE_MANAGER } from '@nestjs/cache-manager';

import { Cache } from 'cache-manager';
import { Repository } from 'typeorm';

import { ContentType, FeedItem, ListingMainCategory } from '@muzgram/types';
import { FEED_DEFAULT_PAGE_SIZE, FEED_DEFAULT_RADIUS_KM, TTL } from '@muzgram/constants';
import { decodeCursor, encodeCursor } from '@muzgram/utils';

import { CommunityPostEntity } from '../../database/entities/community-post.entity';
import { EventEntity } from '../../database/entities/event.entity';
import { ListingEntity } from '../../database/entities/listing.entity';
import { SaveEntity } from '../../database/entities/save.entity';
import { FeedScoringService } from './feed-scoring.service';

interface FeedQueryOptions {
  lat: number;
  lng: number;
  radiusKm?: number;
  category?: ListingMainCategory;
  cursor?: string;
  limit?: number;
  userId?: string;
}

@Injectable()
export class FeedService {
  constructor(
    @InjectRepository(ListingEntity)
    private readonly listingRepo: Repository<ListingEntity>,
    @InjectRepository(EventEntity)
    private readonly eventRepo: Repository<EventEntity>,
    @InjectRepository(CommunityPostEntity)
    private readonly postRepo: Repository<CommunityPostEntity>,
    @InjectRepository(SaveEntity)
    private readonly saveRepo: Repository<SaveEntity>,
    @Inject(CACHE_MANAGER)
    private readonly cache: Cache,
    private readonly scoring: FeedScoringService,
  ) {}

  async getFeed(opts: FeedQueryOptions) {
    const radiusKm = opts.radiusKm ?? FEED_DEFAULT_RADIUS_KM;
    const limit = Math.min(opts.limit ?? FEED_DEFAULT_PAGE_SIZE, 50);

    // Decode cursor to get offset for pagination
    let offset = 0;
    if (opts.cursor) {
      const decoded = decodeCursor<{ offset: number }>(opts.cursor);
      offset = decoded.offset;
    }

    const cacheKey = `feed:${opts.lat.toFixed(3)},${opts.lng.toFixed(3)}:r${radiusKm}:cat${opts.category ?? 'all'}:${offset}`;
    const cached = await this.cache.get<FeedItem[]>(cacheKey);
    if (cached) {
      return this.buildPageResponse(cached, offset, limit);
    }

    const radiusMeters = radiusKm * 1000;

    const [listings, events, posts] = await Promise.all([
      this.queryListings(opts.lat, opts.lng, radiusMeters, opts.category),
      this.queryEvents(opts.lat, opts.lng, radiusMeters, opts.category),
      this.queryPosts(opts.lat, opts.lng, radiusMeters, opts.category),
    ]);

    const ranked = this.scoring.scoreAndRank(listings, events, posts);

    const feedItems: FeedItem[] = ranked.map(({ item, type, distanceKm }) => ({
      itemType: type,
      ...item,
      distanceKm,
    })) as FeedItem[];

    // Cache the full ranked feed for 60 seconds
    await this.cache.set(cacheKey, feedItems, TTL.FEED_CACHE_SECONDS * 1000);

    // Annotate with user's save state
    if (opts.userId) {
      await this.annotateSaveState(feedItems, opts.userId);
    }

    return this.buildPageResponse(feedItems, offset, limit);
  }

  async getMapPins(lat: number, lng: number, radiusKm: number) {
    const radiusMeters = radiusKm * 1000;

    const cacheKey = `map:${lat.toFixed(3)},${lng.toFixed(3)}:r${radiusKm}`;
    const cached = await this.cache.get(cacheKey);
    if (cached) return cached;

    const listings = await this.listingRepo
      .createQueryBuilder('l')
      .select(['l.id', 'l.name', 'l.lat', 'l.lng', 'l.mainCategory', 'l.isHalalVerified', 'l.isFeatured', 'l.thumbnailUrl'])
      .where(
        `ST_DWithin(l.location::geography, ST_SetSRID(ST_MakePoint(:lng, :lat), 4326)::geography, :radius)`,
        { lat, lng, radius: radiusMeters },
      )
      .andWhere('l.status = :status', { status: 'active' })
      .limit(200)
      .getMany();

    const events = await this.eventRepo
      .createQueryBuilder('e')
      .select(['e.id', 'e.title', 'e.lat', 'e.lng', 'e.isFeatured', 'e.thumbnailUrl'])
      .where(
        `ST_DWithin(e.location::geography, ST_SetSRID(ST_MakePoint(:lng, :lat), 4326)::geography, :radius)`,
        { lat, lng, radius: radiusMeters },
      )
      .andWhere('e.status = :status', { status: 'active' })
      .andWhere('e.startAt > now()')
      .limit(100)
      .getMany();

    const pins = [
      ...listings.map((l) => ({
        id: l.id,
        type: ContentType.LISTING,
        location: { lat: l.lat, lng: l.lng },
        name: l.name,
        thumbnailUrl: l.thumbnailUrl,
        mainCategory: l.mainCategory,
        isHalalVerified: l.isHalalVerified,
        isFeatured: l.isFeatured,
      })),
      ...events.map((e) => ({
        id: e.id,
        type: ContentType.EVENT,
        location: { lat: e.lat, lng: e.lng },
        name: e.title,
        thumbnailUrl: e.thumbnailUrl,
        isFeatured: e.isFeatured,
      })),
    ];

    await this.cache.set(cacheKey, pins, TTL.MAP_PINS_CACHE_SECONDS * 1000);
    return pins;
  }

  private async queryListings(lat: number, lng: number, radiusMeters: number, category?: ListingMainCategory) {
    const qb = this.listingRepo
      .createQueryBuilder('l')
      .leftJoinAndSelect('l.category', 'category')
      .addSelect(
        `ST_Distance(l.location::geography, ST_SetSRID(ST_MakePoint(:lng, :lat), 4326)::geography) / 1000`,
        'distanceKm',
      )
      .where(
        `ST_DWithin(l.location::geography, ST_SetSRID(ST_MakePoint(:lng, :lat), 4326)::geography, :radius)`,
        { lat, lng, radius: radiusMeters },
      )
      .andWhere('l.status = :status', { status: 'active' })
      .setParameter('lat', lat)
      .setParameter('lng', lng)
      .limit(100);

    if (category) {
      qb.andWhere('l.mainCategory = :category', { category });
    }

    const raw = await qb.getRawAndEntities();
    return raw.entities.map((entity, i) => ({
      ...entity,
      distanceKm: parseFloat(raw.raw[i].distanceKm ?? '0'),
    }));
  }

  private async queryEvents(lat: number, lng: number, radiusMeters: number, category?: ListingMainCategory) {
    const qb = this.eventRepo
      .createQueryBuilder('e')
      .leftJoinAndSelect('e.category', 'category')
      .addSelect(
        `ST_Distance(e.location::geography, ST_SetSRID(ST_MakePoint(:lng, :lat), 4326)::geography) / 1000`,
        'distanceKm',
      )
      .where(
        `ST_DWithin(e.location::geography, ST_SetSRID(ST_MakePoint(:lng, :lat), 4326)::geography, :radius)`,
        { lat, lng, radius: radiusMeters },
      )
      .andWhere('e.status = :status', { status: 'active' })
      .andWhere('e.startAt > now()')
      .setParameter('lat', lat)
      .setParameter('lng', lng)
      .orderBy('e.startAt', 'ASC')
      .limit(50);

    const raw = await qb.getRawAndEntities();
    return raw.entities.map((entity, i) => ({
      ...entity,
      distanceKm: parseFloat(raw.raw[i].distanceKm ?? '0'),
    }));
  }

  private async queryPosts(lat: number, lng: number, radiusMeters: number, _category?: ListingMainCategory) {
    const qb = this.postRepo
      .createQueryBuilder('p')
      .leftJoinAndSelect('p.author', 'author')
      .addSelect(
        `COALESCE(ST_Distance(p.location::geography, ST_SetSRID(ST_MakePoint(:lng, :lat), 4326)::geography) / 1000, :fallbackDist)`,
        'distanceKm',
      )
      .where('p.status = :status', { status: 'active' })
      .andWhere('p.expiresAt > now()')
      .setParameter('lat', lat)
      .setParameter('lng', lng)
      .setParameter('fallbackDist', 5)
      .orderBy('p.createdAt', 'DESC')
      .limit(30);

    const raw = await qb.getRawAndEntities();
    return raw.entities.map((entity, i) => ({
      ...entity,
      distanceKm: parseFloat(raw.raw[i].distanceKm ?? '5'),
    }));
  }

  private async annotateSaveState(items: FeedItem[], userId: string): Promise<void> {
    const contentIds = items.map((i) => i.id);
    if (contentIds.length === 0) return;

    const saves = await this.saveRepo
      .createQueryBuilder('s')
      .where('s.userId = :userId', { userId })
      .andWhere('s.contentId IN (:...contentIds)', { contentIds })
      .getMany();

    const savedSet = new Set(saves.map((s) => s.contentId));
    for (const item of items) {
      (item as FeedItem & { isSaved: boolean }).isSaved = savedSet.has(item.id);
    }
  }

  private buildPageResponse<T>(items: T[], offset: number, limit: number) {
    const page = items.slice(offset, offset + limit);
    const hasMore = items.length > offset + limit;
    const nextCursor = hasMore ? encodeCursor({ offset: offset + limit }) : null;

    return {
      data: page,
      meta: { cursor: nextCursor, hasMore, total: items.length },
    };
  }
}
