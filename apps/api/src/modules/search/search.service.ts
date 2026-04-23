import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Inject, Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { Cache } from 'cache-manager';
import { DataSource } from 'typeorm';

import { ListingStatus } from '@muzgram/types';

interface SearchQuery {
  q: string;
  cityId?: string;
  citySlug?: string;
  category?: string;
  lat?: number;
  lng?: number;
  radiusMeters?: number;
  limit?: number;
}

interface SearchResultItem {
  id: string;
  type: string;
  mainCategory?: string;
  relevanceScore: number;
  [key: string]: unknown;
}

@Injectable()
export class SearchService {
  constructor(
    @InjectDataSource()
    private readonly db: DataSource,
    @Inject(CACHE_MANAGER)
    private readonly cache: Cache,
  ) {}

  private async resolveCityId(cityId?: string, citySlug?: string): Promise<string | undefined> {
    if (cityId) return cityId;
    if (!citySlug) return undefined;
    const rows = await this.db.query<[{ id: string }]>(
      `SELECT id FROM cities WHERE slug = $1 AND is_active = true LIMIT 1`,
      [citySlug],
    );
    return rows[0]?.id;
  }

  async suggest(q: string, cityId?: string, citySlug?: string) {
    const resolvedCityId = await this.resolveCityId(cityId, citySlug);
    const wildcard = `${q.replace(/[%_]/g, '\\$&')}%`;
    const params: unknown[] = [wildcard];
    const cityFilter = resolvedCityId ? ` AND city_id = $2` : '';
    if (resolvedCityId) params.push(resolvedCityId);

    const [listings, events] = await Promise.all([
      this.db.query<Array<{ id: string; name: string; slug: string; main_category: string }>>(
        `SELECT id, name, slug, main_category FROM listings
         WHERE name ILIKE $1 AND status = 'active'${cityFilter}
         ORDER BY save_count DESC LIMIT 5`,
        params,
      ),
      this.db.query<Array<{ id: string; name: string; slug: string }>>(
        `SELECT id, title AS name, slug FROM events
         WHERE title ILIKE $1 AND status = 'active' AND start_at > NOW()${cityFilter}
         ORDER BY rsvp_count DESC LIMIT 3`,
        params,
      ),
    ]);

    const suggestions = [
      ...listings.map((r) => ({
        id: r.id, name: r.name, type: 'listing' as const, slug: r.slug, mainCategory: r.main_category,
      })),
      ...events.map((r) => ({
        id: r.id, name: r.name, type: 'event' as const, slug: r.slug, mainCategory: undefined,
      })),
    ].slice(0, 5);

    return { suggestions };
  }

  async search(query: SearchQuery) {
    const limit = Math.min(query.limit ?? 20, 50);
    const resolvedCityId = await this.resolveCityId(query.cityId, query.citySlug);
    const cacheKey = `search:${Buffer.from(JSON.stringify({ ...query, cityId: resolvedCityId })).toString('base64').slice(0, 64)}`;

    const cached = await this.cache.get(cacheKey);
    if (cached) return cached;

    const queryWithCity = { ...query, cityId: resolvedCityId };

    const [listings, events, posts] = await Promise.all([
      this.searchListings(queryWithCity, limit),
      this.searchEvents(queryWithCity, limit),
      this.searchPosts(queryWithCity, limit),
    ]);

    const allResults = [...listings, ...events, ...posts]
      .sort((a, b) => b.relevanceScore - a.relevanceScore)
      .slice(0, limit);

    const tabs = {
      all: listings.length + events.length + posts.length,
      food: listings.filter((l: SearchResultItem) => l.mainCategory === 'eat').length,
      events: events.length,
      services: listings.filter((l: SearchResultItem) => l.mainCategory === 'connect').length,
      community: posts.length,
    };

    const filtered = this.filterByCategory(allResults, queryWithCity.category);

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
    const params: unknown[] = [query.q];
    let paramIdx = 2;
    const cityClause = query.cityId ? `AND l.city_id = $${paramIdx++}` : '';
    if (query.cityId) params.push(query.cityId);
    params.push(limit);
    const limitParam = `$${paramIdx}`;

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
        ${cityClause}
        AND l.status = '${ListingStatus.ACTIVE}'
        ${query.radiusMeters && hasLocation ? `AND ST_DWithin(l.location, ST_SetSRID(ST_MakePoint($lat, $lng), 4326)::geography, ${query.radiusMeters})` : ''}
      ORDER BY rank DESC, l.is_featured DESC
      LIMIT ${limitParam}
    `;

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
    const params: unknown[] = [query.q];
    let paramIdx = 2;
    const cityClause = query.cityId ? `AND e.city_id = $${paramIdx++}` : '';
    if (query.cityId) params.push(query.cityId);
    params.push(limit);
    const limitParam = `$${paramIdx}`;

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
        ${cityClause}
        AND e.status = 'active'
        AND e.start_at > NOW()
      ORDER BY rank DESC, e.start_at ASC
      LIMIT ${limitParam}
    `;

    const rows = await this.db.query(sql, params);

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
    const params: unknown[] = [query.q];
    let paramIdx = 2;
    const cityClause = query.cityId ? `AND p.city_id = $${paramIdx++}` : '';
    if (query.cityId) params.push(query.cityId);
    params.push(limit);
    const limitParam = `$${paramIdx}`;

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
        ${cityClause}
        AND p.status = 'active'
      ORDER BY rank DESC, p.created_at DESC
      LIMIT ${limitParam}
    `;

    const rows = await this.db.query(sql, params);

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

  private filterByCategory(results: SearchResultItem[], category?: string): SearchResultItem[] {
    if (!category || category === 'all') return results;
    return results.filter((r) => r.mainCategory === category);
  }

  private buildResultLabel(count: number, hasLocation: boolean): string {
    if (count === 0) return 'No results found';
    const base = `${count} result${count !== 1 ? 's' : ''}`;
    return hasLocation ? `${base} nearby` : base;
  }
}
