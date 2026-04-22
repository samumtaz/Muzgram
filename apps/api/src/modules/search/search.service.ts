import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Inject, Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { Cache } from 'cache-manager';
import { DataSource } from 'typeorm';

import { ListingStatus } from '@muzgram/types';

interface SearchQuery {
  q: string;
  cityId: string;
  category?: string;
  lat?: number;
  lng?: number;
  radiusMeters?: number;
  limit?: number;
}

@Injectable()
export class SearchService {
  constructor(
    @InjectDataSource()
    private readonly db: DataSource,
    @Inject(CACHE_MANAGER)
    private readonly cache: Cache,
  ) {}

  async search(query: SearchQuery) {
    const limit = Math.min(query.limit ?? 20, 50);
    const cacheKey = `search:${Buffer.from(JSON.stringify(query)).toString('base64').slice(0, 64)}`;

    const cached = await this.cache.get(cacheKey);
    if (cached) return cached;

    const [listings, events, posts] = await Promise.all([
      this.searchListings(query, limit),
      this.searchEvents(query, limit),
      this.searchPosts(query, limit),
    ]);

    const allResults = [...listings, ...events, ...posts]
      .sort((a, b) => b.relevanceScore - a.relevanceScore)
      .slice(0, limit);

    const tabs = {
      all: listings.length + events.length + posts.length,
      food: listings.filter((l) => l.mainCategory === 'eat').length,
      events: events.length,
      services: listings.filter((l) => l.mainCategory === 'connect').length,
      community: posts.length,
    };

    const filtered = this.filterByCategory(allResults, query.category);

    const resultLabel = this.buildResultLabel(filtered.length, query.lat != null);

    const result = {
      query: query.q,
      resultLabel,
      results: filtered,
      tabs,
    };

    // Cache for 5 minutes — search results are read-heavy, writes invalidate naturally
    await this.cache.set(cacheKey, result, 5 * 60 * 1000);

    return result;
  }

  private async searchListings(query: SearchQuery, limit: number) {
    const hasLocation = query.lat != null && query.lng != null;

    const sql = `
      SELECT
        l.id,
        l.name,
        l.slug,
        l.address,
        l.neighborhood,
        l.main_category,
        l.halal_certification,
        l.is_halal_verified,
        l.thumbnail_url,
        l.is_featured,
        l.lat,
        l.lng,
        ts_rank_cd(l.search_vector, query) AS rank,
        ts_headline('english', coalesce(l.name, ''), query, 'MaxFragments=1,MaxWords=5,MinWords=1') AS headline_name,
        ts_headline('english', coalesce(l.description, ''), query, 'MaxFragments=1,MaxWords=10,MinWords=3') AS headline_description
        ${hasLocation ? `, ST_Distance(l.location, ST_SetSRID(ST_MakePoint($lat, $lng), 4326)::geography) AS distance_m` : ''}
      FROM listings l,
           plainto_tsquery('english', $1) query
      WHERE l.search_vector @@ query
        AND l.city_id = $2
        AND l.status = '${ListingStatus.ACTIVE}'
        ${query.radiusMeters && hasLocation ? `AND ST_DWithin(l.location, ST_SetSRID(ST_MakePoint($lat, $lng), 4326)::geography, ${query.radiusMeters})` : ''}
      ORDER BY rank DESC, l.is_featured DESC
      LIMIT $3
    `;

    const params: unknown[] = [query.q, query.cityId, limit];
    const finalSql = hasLocation
      ? sql.replace('$lat', String(query.lng)).replace('$lng', String(query.lat))
      : sql;

    const rows = await this.db.query(finalSql, params);

    return rows.map((r: Record<string, unknown>) => ({
      contentType: 'listing' as const,
      relevanceScore: parseFloat(r['rank'] as string) ?? 0,
      mainCategory: r['main_category'],
      item: {
        id: r['id'],
        name: r['name'],
        slug: r['slug'],
        address: r['address'],
        neighborhood: r['neighborhood'],
        halalCertification: r['halal_certification'],
        isHalalVerified: r['is_halal_verified'],
        thumbnailUrl: r['thumbnail_url'],
        isFeatured: r['is_featured'],
        distanceM: r['distance_m'] != null ? parseFloat(r['distance_m'] as string) : null,
      },
      highlights: {
        name: r['headline_name'] ?? null,
        description: r['headline_description'] ?? null,
      },
    }));
  }

  private async searchEvents(query: SearchQuery, limit: number) {
    const sql = `
      SELECT
        e.id,
        e.title,
        e.slug,
        e.address,
        e.start_at,
        e.is_free,
        e.thumbnail_url,
        e.is_featured,
        ts_rank_cd(e.search_vector, query) AS rank,
        ts_headline('english', coalesce(e.title, ''), query, 'MaxFragments=1,MaxWords=5,MinWords=1') AS headline_name
      FROM events e,
           plainto_tsquery('english', $1) query
      WHERE e.search_vector @@ query
        AND e.city_id = $2
        AND e.status = 'active'
        AND e.start_at > NOW()
      ORDER BY rank DESC, e.start_at ASC
      LIMIT $3
    `;

    const rows = await this.db.query(sql, [query.q, query.cityId, limit]);

    return rows.map((r: Record<string, unknown>) => ({
      contentType: 'event' as const,
      relevanceScore: parseFloat(r['rank'] as string) ?? 0,
      mainCategory: 'events',
      item: {
        id: r['id'],
        title: r['title'],
        slug: r['slug'],
        address: r['address'],
        startAt: r['start_at'],
        isFree: r['is_free'],
        thumbnailUrl: r['thumbnail_url'],
        isFeatured: r['is_featured'],
      },
      highlights: {
        name: r['headline_name'] ?? null,
        description: null,
      },
    }));
  }

  private async searchPosts(query: SearchQuery, limit: number) {
    const sql = `
      SELECT
        p.id,
        p.body,
        p.created_at,
        p.neighborhood,
        ts_rank_cd(p.search_vector, query) AS rank,
        ts_headline('english', coalesce(p.body, ''), query, 'MaxFragments=1,MaxWords=15,MinWords=5') AS headline_body,
        u.display_name AS author_name,
        u.avatar_url AS author_avatar
      FROM community_posts p
      JOIN users u ON u.id = p.author_id,
           plainto_tsquery('english', $1) query
      WHERE p.search_vector @@ query
        AND p.city_id = $2
        AND p.status = 'active'
      ORDER BY rank DESC, p.created_at DESC
      LIMIT $3
    `;

    const rows = await this.db.query(sql, [query.q, query.cityId, limit]);

    return rows.map((r: Record<string, unknown>) => ({
      contentType: 'post' as const,
      relevanceScore: parseFloat(r['rank'] as string) ?? 0,
      mainCategory: 'community',
      item: {
        id: r['id'],
        body: (r['body'] as string)?.slice(0, 100),
        neighborhood: r['neighborhood'],
        createdAt: r['created_at'],
        author: {
          displayName: r['author_name'],
          avatarUrl: r['author_avatar'],
        },
      },
      highlights: {
        name: null,
        description: r['headline_body'] ?? null,
      },
    }));
  }

  private filterByCategory(results: ReturnType<SearchService['filterByCategory']>, category?: string) {
    if (!category || category === 'all') return results;
    return results.filter((r) => r.mainCategory === category);
  }

  private buildResultLabel(count: number, hasLocation: boolean): string {
    if (count === 0) return 'No results found';
    const base = `${count} result${count !== 1 ? 's' : ''}`;
    return hasLocation ? `${base} nearby` : base;
  }
}
