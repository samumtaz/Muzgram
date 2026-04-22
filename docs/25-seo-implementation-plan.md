# Muzgram — SEO System: Developer Implementation Plan

> Converts `docs/21-seo-programmatic-system.md` into executable engineering specs.
> Stack: Next.js 15 App Router · NestJS API · PostgreSQL + PostGIS · Cloudflare CDN
> App: `apps/web` — new monorepo member alongside api, mobile, admin

---

## Table of Contents

1. [Backend Implementation Plan](#1-backend-implementation-plan)
2. [Database Tables](#2-database-tables)
3. [API Endpoints](#3-api-endpoints)
4. [Next.js Page Rendering Strategy](#4-nextjs-page-rendering-strategy)
5. [Dynamic Routing System](#5-dynamic-routing-system)
6. [Caching Strategy](#6-caching-strategy)
7. [CDN Usage](#7-cdn-usage)
8. [Deployment Architecture](#8-deployment-architecture)

---

## 1. Backend Implementation Plan

### 1.1 New App: `apps/web`

The web layer is a **separate Next.js 15 App Router application** that reads directly from PostgreSQL — it does not go through `apps/api`. This eliminates API latency from page renders and lets RSCs query the DB in parallel.

```
apps/
  api/          ← NestJS (existing — mobile app backend)
  mobile/       ← React Native Expo (existing)
  admin/        ← Vite React (existing)
  worker/       ← NestJS context (existing)
  web/          ← Next.js 15 App Router (NEW — SEO engine)
    src/
      app/      ← Routes + pages (RSCs)
      components/
      lib/
        db.ts           ← Direct postgres connection (read-only)
        schema/         ← JSON-LD generators
        seo/            ← Title/meta formula functions
        cache/          ← Redis helpers + Cloudflare Cache Tags
      types/
    public/
      .well-known/
        apple-app-site-association
        assetlinks.json
```

### 1.2 Database Connection from Web Layer

The web app uses a **read-only Supabase direct connection** — not the pooler, because Next.js RSCs hold connections open during render. Use a separate Supabase read-only role.

```typescript
// apps/web/src/lib/db.ts
import { Pool } from 'pg';
import { cache } from 'react';

const pool = new Pool({
  connectionString: process.env.DATABASE_READ_URL,
  ssl: { rejectUnauthorized: false },
  max: 10, // web layer is read-only, smaller pool
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
});

// React cache() deduplicates identical queries within a single render tree
// Two RSCs requesting the same city data → one DB query
export const query = cache(async <T = any>(
  sql: string,
  params?: unknown[],
): Promise<T[]> => {
  const { rows } = await pool.query(sql, params);
  return rows as T[];
});
```

### 1.3 New NestJS Modules Required in `apps/api`

Three new modules serve the web layer's dynamic data needs:

```
apps/api/src/modules/
  seo/
    seo.module.ts
    seo.controller.ts       ← /seo/* endpoints (see Section 3)
    seo.service.ts
  guide-pages/
    guide-pages.module.ts
    guide-pages.controller.ts
    guide-pages.service.ts
  city-stats/
    city-stats.module.ts
    city-stats.service.ts   ← Aggregates for city hub pages
```

### 1.4 Cache Invalidation Hooks

When content changes in the API, it must invalidate Cloudflare edge cache and Next.js ISR cache. This is done via webhook-style calls from the API's entity update services.

```typescript
// apps/api/src/common/services/cache-invalidation.service.ts

@Injectable()
export class CacheInvalidationService {
  constructor(private readonly httpService: HttpService) {}

  async onListingUpdated(listing: ListingEntity) {
    await Promise.all([
      this.purgeCloudflareTag(`id:${listing.slug}`),
      this.purgeCloudflareTag(`city:${listing.citySlug}`),
      this.revalidateNextPage(`/${listing.citySlug}/places/${listing.slug}`),
      this.revalidateNextPage(`/${listing.citySlug}/${listing.categorySlug}`),
    ]);
  }

  async onEventPublished(event: EventEntity) {
    await Promise.all([
      this.purgeCloudflareTag(`city:${event.citySlug},type:event`),
      this.revalidateNextPage(`/${event.citySlug}/go-out`),
      this.revalidateNextPage(`/${event.citySlug}/tonight`),
    ]);
  }

  private async purgeCloudflareTag(tag: string) {
    await this.httpService.post(
      `https://api.cloudflare.com/client/v4/zones/${process.env.CF_ZONE_ID}/purge_cache`,
      { tags: [tag] },
      { headers: { Authorization: `Bearer ${process.env.CF_API_TOKEN}` } },
    ).toPromise();
  }

  private async revalidateNextPage(path: string) {
    // Next.js on-demand ISR revalidation
    await this.httpService.post(
      `${process.env.WEB_URL}/api/revalidate`,
      { path },
      { headers: { 'x-revalidate-token': process.env.REVALIDATE_SECRET } },
    ).toPromise();
  }
}
```

### 1.5 Slug Management

Slugs are generated at write time and stored in the DB. Never computed at read time.

```typescript
// apps/api/src/modules/listings/listings.service.ts — additions

async generateUniqueSlug(name: string, citySlug: string): Promise<string> {
  const base = name
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .trim();

  const existing = await this.listingRepo.findOne({
    where: { slug: base, city: { slug: citySlug } },
  });

  if (!existing) return base;

  // Collision: append -2, -3, etc.
  let counter = 2;
  while (true) {
    const candidate = `${base}-${counter}`;
    const conflict = await this.listingRepo.findOne({ where: { slug: candidate } });
    if (!conflict) return candidate;
    counter++;
  }
}
```

---

## 2. Database Tables

All new tables are additive — they extend the existing schema without touching existing tables.

### Migration: `003-seo-tables.ts`

```sql
-- ─── SEO-specific tables ──────────────────────────────────────────────────────

-- Subcategory taxonomy (used for URL generation + page generation)
CREATE TABLE listing_subcategories (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  slug          VARCHAR(80) NOT NULL,
  name          VARCHAR(120) NOT NULL,
  category      VARCHAR(20) NOT NULL CHECK (category IN ('eat', 'go_out', 'connect')),
  description   TEXT,
  meta_title    VARCHAR(120),              -- SEO title override
  meta_description VARCHAR(300),           -- SEO description override
  sort_order    SMALLINT DEFAULT 0,
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(slug, category)
);

CREATE INDEX idx_subcategories_category ON listing_subcategories(category);

-- ─── Guide pages (editorial SEO content) ─────────────────────────────────────

CREATE TABLE guide_pages (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  slug            VARCHAR(200) NOT NULL UNIQUE,
  title           VARCHAR(200) NOT NULL,
  subtitle        VARCHAR(300),
  city_id         UUID REFERENCES cities(id),           -- NULL = national guide
  category        VARCHAR(20),                           -- eat | go_out | connect | NULL
  subcategory_id  UUID REFERENCES listing_subcategories(id),
  
  -- Editorial content (written manually)
  intro_html      TEXT NOT NULL,                         -- ≥ 300 words required for indexing
  top_picks_json  JSONB DEFAULT '[]',                   -- [{listingId, editorNote}]
  faqs_json       JSONB DEFAULT '[]',                   -- [{question, answer}]
  
  -- SEO metadata
  meta_title      VARCHAR(120),
  meta_description VARCHAR(300),
  og_image_url    VARCHAR(500),
  
  -- State
  is_published    BOOLEAN DEFAULT false,
  published_at    TIMESTAMPTZ,
  
  -- Auto-updated from DB when listings in referenced city/category change
  listing_count   INTEGER DEFAULT 0,
  last_enriched_at TIMESTAMPTZ,
  
  -- Audit
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_guide_pages_city ON guide_pages(city_id) WHERE is_published = true;
CREATE INDEX idx_guide_pages_published ON guide_pages(is_published, published_at);

-- ─── City metadata (extends existing cities table) ────────────────────────────

ALTER TABLE cities
  ADD COLUMN IF NOT EXISTS seo_description     TEXT,          -- Unique editorial paragraph per city
  ADD COLUMN IF NOT EXISTS meta_title          VARCHAR(120),
  ADD COLUMN IF NOT EXISTS meta_description    VARCHAR(300),
  ADD COLUMN IF NOT EXISTS og_image_url        VARCHAR(500),
  ADD COLUMN IF NOT EXISTS listing_count       INTEGER DEFAULT 0,  -- Cached count for meta descriptions
  ADD COLUMN IF NOT EXISTS event_count         INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS launch_status       VARCHAR(20) DEFAULT 'active'
                                               CHECK (launch_status IN ('pre_launch', 'active', 'inactive')),
  ADD COLUMN IF NOT EXISTS neighborhood_of     UUID REFERENCES cities(id),  -- Bridgeview is neighborhood_of Chicago
  ADD COLUMN IF NOT EXISTS cluster_city_id     UUID REFERENCES cities(id);  -- All suburbs point to Chicago for cross-links

CREATE INDEX idx_cities_launch_status ON cities(launch_status);
CREATE INDEX idx_cities_cluster ON cities(cluster_city_id);

-- ─── Listing SEO fields (extends existing listings table) ─────────────────────

ALTER TABLE listings
  ADD COLUMN IF NOT EXISTS subcategory_id    UUID REFERENCES listing_subcategories(id),
  ADD COLUMN IF NOT EXISTS neighborhood      VARCHAR(100),       -- "West Rogers Park", "Devon Ave"
  ADD COLUMN IF NOT EXISTS price_range       VARCHAR(10),        -- "$", "$$", "$$$"
  ADD COLUMN IF NOT EXISTS cuisine_types     TEXT[],             -- ["south_asian", "american"]
  ADD COLUMN IF NOT EXISTS menu_url          VARCHAR(500),
  ADD COLUMN IF NOT EXISTS parent_org_name   VARCHAR(200),       -- For chain locations
  ADD COLUMN IF NOT EXISTS primary_photo_blur_hash VARCHAR(50),  -- For LQIP
  ADD COLUMN IF NOT EXISTS word_count        INTEGER DEFAULT 0,  -- Computed, gating indexing
  ADD COLUMN IF NOT EXISTS seo_indexed       BOOLEAN DEFAULT true; -- noindex override

CREATE INDEX idx_listings_subcategory ON listings(subcategory_id) WHERE is_active = true;
CREATE INDEX idx_listings_neighborhood ON listings(neighborhood) WHERE is_active = true;

-- ─── Event SEO fields (extends existing events table) ────────────────────────

ALTER TABLE events
  ADD COLUMN IF NOT EXISTS slug              VARCHAR(200),       -- Generated at creation
  ADD COLUMN IF NOT EXISTS cover_photo_url   VARCHAR(500),
  ADD COLUMN IF NOT EXISTS cover_photo_blur  VARCHAR(50),
  ADD COLUMN IF NOT EXISTS price_cents       INTEGER,            -- 0 = free
  ADD COLUMN IF NOT EXISTS external_link     VARCHAR(500),       -- Ticketing URL
  ADD COLUMN IF NOT EXISTS word_count        INTEGER DEFAULT 0,  -- Gating indexing
  ADD COLUMN IF NOT EXISTS seo_indexed       BOOLEAN DEFAULT true,
  ADD COLUMN IF NOT EXISTS city_id           UUID REFERENCES cities(id);

CREATE UNIQUE INDEX idx_events_slug_city ON events(slug, city_id) WHERE slug IS NOT NULL;
CREATE INDEX idx_events_city_active ON events(city_id, start_at) WHERE is_active = true;

-- ─── SEO crawl log (for monitoring indexing health) ──────────────────────────

CREATE TABLE seo_crawl_log (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  url_path      VARCHAR(500) NOT NULL,
  page_type     VARCHAR(50) NOT NULL,  -- city | category | subcategory | listing | event | guide
  city_id       UUID REFERENCES cities(id),
  http_status   SMALLINT,
  render_time_ms INTEGER,
  cache_hit     BOOLEAN,
  crawled_at    TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_crawl_log_path ON seo_crawl_log(url_path, crawled_at DESC);
CREATE INDEX idx_crawl_log_city ON seo_crawl_log(city_id, crawled_at DESC);

-- ─── Sitemap index (tracks what's been submitted to GSC) ─────────────────────

CREATE TABLE sitemap_submissions (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  url_path      VARCHAR(500) NOT NULL,
  submitted_at  TIMESTAMPTZ DEFAULT NOW(),
  indexed_at    TIMESTAMPTZ,                    -- Set when GSC confirms indexing
  last_checked_at TIMESTAMPTZ,
  gsc_impressions INTEGER DEFAULT 0,
  gsc_clicks     INTEGER DEFAULT 0
);

CREATE UNIQUE INDEX idx_sitemap_url ON sitemap_submissions(url_path);
```

### Migration: `004-seo-counts-trigger.ts`

```sql
-- Keep city listing_count and event_count fresh automatically

CREATE OR REPLACE FUNCTION update_city_counts()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE cities
  SET listing_count = (
    SELECT COUNT(*) FROM listings
    WHERE city_id = COALESCE(NEW.city_id, OLD.city_id)
      AND is_active = true
  ),
  event_count = (
    SELECT COUNT(*) FROM events
    WHERE city_id = COALESCE(NEW.city_id, OLD.city_id)
      AND is_active = true
      AND start_at > NOW()
  )
  WHERE id = COALESCE(NEW.city_id, OLD.city_id);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_listing_count
AFTER INSERT OR UPDATE OR DELETE ON listings
FOR EACH ROW EXECUTE FUNCTION update_city_counts();

CREATE TRIGGER trg_event_count
AFTER INSERT OR UPDATE OR DELETE ON events
FOR EACH ROW EXECUTE FUNCTION update_city_counts();
```

---

## 3. API Endpoints

All SEO-specific endpoints live under `/seo/*`. They are `@Public()` — no auth required. They return pre-aggregated data optimized for web page rendering. These endpoints are called by the Next.js web layer's `generateStaticParams` and `generateMetadata` during build.

### 3.1 City & Navigation Endpoints

```
GET  /seo/cities
     Returns all active cities with listing_count, event_count, slug, name
     Used by: generateStaticParams in all city-level pages
     Cache: 1h Redis, CDN 30min

GET  /seo/cities/:citySlug
     Returns full city data: description, counts, cluster neighbors, top listings
     Used by: city hub page (generateMetadata + page data)
     Cache: 10min Redis

GET  /seo/cities/:citySlug/subcategories
     Returns subcategories with listing counts for a given city + category
     Query: ?category=eat|go_out|connect
     Used by: generateStaticParams for subcategory pages
     Cache: 1h Redis
     Response: { subcategory: string, slug: string, count: number }[]

GET  /seo/cities/:citySlug/cluster
     Returns neighboring cities in the same metro cluster
     Used by: NeighborhoodNav component
     Cache: 24h Redis (neighborhoods don't change)
```

### 3.2 Listing Page Data

```
GET  /seo/listings/:citySlug/:slug
     Full listing detail for a business page
     Includes: listing data, nearby listings (5), events at venue, recent community posts (10)
     Used by: /[city]/places/[slug] page
     Cache: 1h Redis, CDN 1h, CF tag: id:{slug}

GET  /seo/listings/:citySlug
     Paginated listings for category/subcategory pages
     Query: ?category=eat&subcategory=shawarma&limit=24&cursor=...
     Includes: only fields needed for cards (no full description)
     Cache: 15min Redis
     Used by: category + subcategory pages

GET  /seo/listings/:citySlug/top
     Top 10 listings by save_count for a city/category (used in internal links)
     Query: ?category=eat&limit=10
     Cache: 1h Redis
```

### 3.3 Event Page Data

```
GET  /seo/events/:citySlug
     Upcoming events for a city, with optional subcategory filter
     Query: ?subcategory=desi-parties&date=tonight|this-weekend|this-month
     Sort: start_at ASC
     Cache: 5min Redis (events are time-sensitive)
     Used by: /[city]/go-out/* pages, /[city]/tonight page

GET  /seo/events/:citySlug/:slug
     Full event detail
     Includes: venue listing (if linked), organizer, related events
     Cache: 30min Redis, CDN 30min, CF tag: id:{slug},city:{citySlug}

GET  /seo/events/slugs
     Returns all active event slugs for generateStaticParams
     Cache: 15min Redis
     Response: { citySlug: string, slug: string }[]
```

### 3.4 Guide & Editorial

```
GET  /seo/guides
     All published guide pages with slug, title, city, category
     Used by: generateStaticParams for /guides/[slug]
     Cache: 1h Redis

GET  /seo/guides/:slug
     Full guide page data including listings auto-populated from DB
     Includes: intro_html, top_picks, faqs, listings matching city+category
     Cache: 6h Redis (guides are static + auto-enriched)
```

### 3.5 Real-time SEO Widgets (Dynamic Sections)

These endpoints power the "Open Right Now" and "Tonight" sections which must be fresh. They are called client-side (React Client Components) within otherwise static pages, following PPR (Partial Prerendering).

```
GET  /seo/cities/:citySlug/open-now
     Listings open at current time of request
     Query: ?category=eat&limit=8
     Cache: NO CACHE (real-time)
     Rate limit: 60 req/min per IP

GET  /seo/cities/:citySlug/tonight
     Events starting within next 12 hours
     Cache: 10min Redis (fresh enough)

GET  /seo/cities/:citySlug/daily-specials
     Listings with an active daily special (expires midnight)
     Cache: 10min Redis
```

### 3.6 Sitemap & Indexing Support

```
GET  /seo/sitemap/listings
     All active listing slugs + city slugs + updated_at
     Used by: /sitemap.ts in apps/web
     Cache: 30min Redis

GET  /seo/sitemap/events
     All active/recent event slugs + city slugs + updated_at
     Cache: 10min Redis (events update frequently)

GET  /seo/sitemap/guides
     All published guide page slugs
     Cache: 1h Redis

POST /seo/revalidate
     Webhook: called by API when content changes
     Body: { type: 'listing'|'event'|'post', id: string, citySlug: string }
     Auth: x-revalidate-token header (secret in env)
     Action: calls Next.js revalidatePath + Cloudflare purge
```

### 3.7 Controller Implementation

```typescript
// apps/api/src/modules/seo/seo.controller.ts

@Controller('seo')
@Public()
export class SeoController {
  constructor(private readonly seoService: SeoService) {}

  @Get('cities')
  @CacheKey('seo:cities')
  @CacheTTL(3600)
  getCities() {
    return this.seoService.getActiveCities();
  }

  @Get('cities/:citySlug')
  getCityData(@Param('citySlug') citySlug: string) {
    return this.seoService.getCityPageData(citySlug);
  }

  @Get('listings/:citySlug/:slug')
  getListingDetail(
    @Param('citySlug') citySlug: string,
    @Param('slug') slug: string,
  ) {
    return this.seoService.getListingPageData(citySlug, slug);
  }

  @Get('events/:citySlug')
  getCityEvents(
    @Param('citySlug') citySlug: string,
    @Query('subcategory') subcategory?: string,
    @Query('date') date?: 'tonight' | 'this-weekend' | 'this-month',
  ) {
    return this.seoService.getCityEvents(citySlug, subcategory, date);
  }

  @Get('cities/:citySlug/open-now')
  @Header('Cache-Control', 'no-store')
  getOpenNow(
    @Param('citySlug') citySlug: string,
    @Query('category') category: string,
  ) {
    return this.seoService.getOpenNow(citySlug, category);
  }

  @Post('revalidate')
  revalidate(@Body() body: RevalidateDto, @Headers('x-revalidate-token') token: string) {
    if (token !== process.env.REVALIDATE_SECRET) throw new UnauthorizedException();
    return this.seoService.handleRevalidation(body);
  }
}
```

---

## 4. Next.js Page Rendering Strategy

### 4.1 Rendering Mode per Page Type

| Page Type | Strategy | Revalidate | Reason |
|-----------|----------|-----------|--------|
| City hub `/[city]` | ISR | 6h | Content changes but not critical real-time |
| Category `/[city]/eat` | ISR | 6h | New businesses added |
| Subcategory `/[city]/eat/shawarma` | ISR | 6h | Low change frequency |
| Business `/[city]/places/[slug]` | ISR + on-demand | 24h | On-demand when business updates |
| Event `/[city]/events/[slug]` | ISR + on-demand | 1h | Event info can change |
| Guide `/guides/[slug]` | ISR | 6h | Listings auto-refresh |
| Tonight `/[city]/tonight` | ISR | 1h | Time-sensitive |
| Near-me `/near-me/[cat]` | SSG + edge redirect | Never (static shell) | Geo at edge |
| Open Now section | CSR (React CC) | Real-time | Can't be static |
| Tonight events section | ISR | 1h | Dynamic per time |

### 4.2 Partial Prerendering (PPR) Architecture

The key pattern is a **static page shell** with **dynamic holes** using React Suspense:

```tsx
// apps/web/src/app/[city]/eat/page.tsx

import { Suspense } from 'react';
import { generateStaticParams, generateMetadata } from './metadata';
import { CategoryPageShell } from '@/components/CategoryPageShell';
import { ListingGrid } from '@/components/ListingGrid';
import { OpenNowSection } from '@/components/OpenNowSection';   // ← Dynamic
import { RelatedContent } from '@/components/RelatedContent';

export { generateStaticParams, generateMetadata };
export const revalidate = 21600; // 6h

export default async function EatPage({
  params,
}: {
  params: { city: string };
}) {
  // Static data — fetched at build/revalidation time
  const [cityData, listings, subcategories] = await Promise.all([
    query<CityRow>(
      'SELECT * FROM cities WHERE slug = $1 AND launch_status = $2',
      [params.city, 'active'],
    ),
    query<ListingRow>(
      `SELECT l.*, c.slug as city_slug
       FROM listings l
       JOIN cities c ON l.city_id = c.id
       WHERE c.slug = $1
         AND l.main_category = 'eat'
         AND l.is_active = true
       ORDER BY l.save_count DESC, l.trust_score DESC
       LIMIT 48`,
      [params.city],
    ),
    query<SubcategoryRow>(
      `SELECT sc.*, COUNT(l.id) AS listing_count
       FROM listing_subcategories sc
       LEFT JOIN listings l ON l.subcategory_id = sc.id
         AND l.city_id = (SELECT id FROM cities WHERE slug = $1)
         AND l.is_active = true
       WHERE sc.category = 'eat'
       GROUP BY sc.id
       HAVING COUNT(l.id) > 0
       ORDER BY listing_count DESC`,
      [params.city],
    ),
  ]);

  if (!cityData[0]) notFound();

  return (
    <CategoryPageShell city={cityData[0]} category="eat" subcategories={subcategories}>

      {/* Static: rendered at build time */}
      <SubcategoryPills subcategories={subcategories} citySlug={params.city} />

      {/* Dynamic hole: real-time open status */}
      <Suspense fallback={<OpenNowSkeleton />}>
        <OpenNowSection citySlug={params.city} category="eat" />
      </Suspense>

      {/* Static: rendered at build time */}
      <ListingGrid listings={listings} citySlug={params.city} priority={3} />

      {/* Dynamic hole: daily specials change at midnight */}
      <Suspense fallback={<SpecialsSkeleton />}>
        <DailySpecialsSection citySlug={params.city} />
      </Suspense>

      {/* Static internal links */}
      <RelatedContent city={cityData[0]} category="eat" subcategories={subcategories} />

    </CategoryPageShell>
  );
}
```

### 4.3 generateStaticParams — Build-Time Generation

```typescript
// apps/web/src/app/[city]/eat/[subcategory]/page.tsx

export async function generateStaticParams() {
  // Only generate pages that have real content
  const rows = await query<{ city: string; subcategory: string }>(`
    SELECT
      c.slug AS city,
      sc.slug AS subcategory
    FROM cities c
    CROSS JOIN listing_subcategories sc
    WHERE c.launch_status = 'active'
      AND sc.category = 'eat'
      AND EXISTS (
        SELECT 1 FROM listings l
        WHERE l.city_id = c.id
          AND l.subcategory_id = sc.id
          AND l.is_active = true
      )
  `);

  return rows; // → [{city: 'chicago', subcategory: 'shawarma'}, ...]
}

// Business pages — top 10K pre-built, rest via on-demand ISR
export async function generateStaticParams() { // [city]/places/[slug]
  const rows = await query<{ city: string; slug: string }>(`
    SELECT c.slug AS city, l.slug
    FROM listings l
    JOIN cities c ON l.city_id = c.id
    WHERE l.is_active = true
      AND c.launch_status = 'active'
      AND l.slug IS NOT NULL
    ORDER BY l.save_count DESC
    LIMIT 10000
  `);
  return rows;
}
```

### 4.4 generateMetadata — Dynamic SEO Tags

```typescript
// apps/web/src/app/[city]/places/[slug]/page.tsx

export async function generateMetadata({
  params,
}: {
  params: { city: string; slug: string };
}): Promise<Metadata> {
  const [listing] = await query<ListingRow>(
    `SELECT l.*, c.name AS city_name, c.slug AS city_slug,
            sc.name AS subcategory_name
     FROM listings l
     JOIN cities c ON l.city_id = c.id
     LEFT JOIN listing_subcategories sc ON l.subcategory_id = sc.id
     WHERE c.slug = $1 AND l.slug = $2 AND l.is_active = true`,
    [params.city, params.slug],
  );

  if (!listing) return {};

  const title = `${listing.name} — Halal ${listing.subcategory_name ?? listing.main_category} in ${listing.neighborhood ?? listing.city_name} | Muzgram`;
  const description = `${listing.name} — ${listing.description?.slice(0, 100)}... See hours, photos, and today's specials in ${listing.city_name}.`;

  return {
    title,
    description,
    alternates: {
      canonical: `https://muzgram.com/${params.city}/places/${params.slug}`,
    },
    openGraph: {
      title,
      description,
      url: `https://muzgram.com/${params.city}/places/${params.slug}`,
      siteName: 'Muzgram',
      type: 'website',
      images: listing.primary_photo_url
        ? [{ url: listing.primary_photo_url, width: 1200, height: 630 }]
        : [{ url: 'https://muzgram.com/og-default.jpg', width: 1200, height: 630 }],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: [listing.primary_photo_url ?? 'https://muzgram.com/og-default.jpg'],
    },
  };
}
```

### 4.5 On-Demand ISR Revalidation Route

```typescript
// apps/web/src/app/api/revalidate/route.ts

import { revalidatePath, revalidateTag } from 'next/cache';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  const token = req.headers.get('x-revalidate-token');

  if (token !== process.env.REVALIDATE_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { type, citySlug, slug } = await req.json();

  switch (type) {
    case 'listing':
      revalidatePath(`/${citySlug}/places/${slug}`);
      revalidatePath(`/${citySlug}/eat`);
      revalidatePath(`/${citySlug}`);
      break;
    case 'event':
      revalidatePath(`/${citySlug}/events/${slug}`);
      revalidatePath(`/${citySlug}/go-out`);
      revalidatePath(`/${citySlug}/tonight`);
      break;
    case 'guide':
      revalidatePath(`/guides/${slug}`);
      break;
    case 'city':
      revalidatePath(`/${citySlug}`);
      revalidateTag(`city-${citySlug}`);
      break;
  }

  return NextResponse.json({ revalidated: true });
}
```

### 4.6 Near-Me Pages — Edge Geo Detection

```typescript
// apps/web/src/middleware.ts

import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const NEAR_ME_TO_CATEGORY: Record<string, string> = {
  'halal-restaurants': 'eat',
  'halal-food': 'eat',
  'desi-parties': 'go-out/desi-parties',
  'muslim-events': 'go-out',
  'mosques': 'mosques',
  'nikah-hall': 'connect/nikah-halls',
};

const CITY_SLUG_MAP: Record<string, string> = {
  'Chicago': 'chicago',
  'Naperville': 'naperville',
  'Bridgeview': 'bridgeview',
  'Schaumburg': 'schaumburg',
  // Add as cities launch
};

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  if (!pathname.startsWith('/near-me/')) return NextResponse.next();

  // Cloudflare injects CF-IPCity header
  const detectedCity = req.headers.get('cf-ipcity') ?? '';
  const citySlug = CITY_SLUG_MAP[detectedCity];

  const nearMeSlug = pathname.replace('/near-me/', '');
  const categoryPath = NEAR_ME_TO_CATEGORY[nearMeSlug];

  if (citySlug && categoryPath) {
    // Redirect to city-specific page (preserves SEO equity for city pages)
    const url = req.nextUrl.clone();
    url.pathname = `/${citySlug}/${categoryPath}`;
    return NextResponse.redirect(url, { status: 302 }); // 302 not 301 — city detection can change
  }

  // City not served yet — let the near-me page render (shows waitlist CTA)
  return NextResponse.next();
}

export const config = {
  matcher: ['/near-me/:path*'],
};
```

---

## 5. Dynamic Routing System

### 5.1 Full Route Tree

```
apps/web/src/app/
│
├── page.tsx                              ← Homepage (muzgram.com)
│
├── [city]/
│   ├── page.tsx                          ← City hub
│   ├── eat/
│   │   ├── page.tsx                      ← Eat category
│   │   └── [subcategory]/
│   │       └── page.tsx                  ← Eat subcategory
│   ├── go-out/
│   │   ├── page.tsx                      ← Go Out category
│   │   └── [subcategory]/
│   │       └── page.tsx                  ← Go Out subcategory (desi-parties, bollywood-nights)
│   ├── connect/
│   │   ├── page.tsx
│   │   └── [subcategory]/
│   │       └── page.tsx
│   ├── mosques/
│   │   └── page.tsx
│   ├── places/
│   │   └── [slug]/
│   │       └── page.tsx                  ← Business detail (SEO + app CTA)
│   ├── events/
│   │   └── [slug]/
│   │       └── page.tsx                  ← Event detail
│   ├── tonight/
│   │   └── page.tsx                      ← ISR 1h
│   ├── today/
│   │   └── page.tsx
│   └── this-weekend/
│       └── page.tsx
│
├── near-me/
│   └── [category]/
│       └── page.tsx                      ← Geo-detect shell page
│
├── guides/
│   └── [slug]/
│       └── page.tsx                      ← Editorial guide page
│
├── sitemap.ts                            ← Dynamic sitemap
├── robots.ts                             ← robots.txt
│
└── api/
    └── revalidate/
        └── route.ts                      ← ISR webhook endpoint
```

### 5.2 Route Segment Config Matrix

```typescript
// Each route file exports these Next.js segment configs:

// Static pages (city, category, subcategory, guides)
export const revalidate = 21600;           // 6h
export const dynamicParams = true;         // Allow on-demand ISR for uncached pages

// Business pages
export const revalidate = 86400;           // 24h (+ on-demand)
export const dynamicParams = true;         // New businesses auto-cached on first request

// Event pages
export const revalidate = 3600;            // 1h
export const dynamicParams = true;

// Tonight / today
export const revalidate = 3600;            // 1h
export const dynamic = 'force-static';     // Never SSR — always ISR

// Near-me pages
export const dynamic = 'force-static';     // Static shell, geo-detect in middleware
```

### 5.3 notFound() Handling

```typescript
// All [slug] pages call notFound() for missing entities:
import { notFound } from 'next/navigation';

const [listing] = await query(...);
if (!listing) notFound(); // → renders app/not-found.tsx, returns 404 to Googlebot
```

### 5.4 Slug Collision Prevention

The URL scheme uses `/:city/places/:slug` — city in the path prevents cross-city collisions. Two "Al-Basha Restaurant" listings in different cities each have valid unique URLs.

If a business moves cities, the old URL stays indexed (301 redirect from old to new):

```typescript
// apps/web/src/app/[city]/places/[slug]/page.tsx
// Check if listing exists at a different city
if (!listing) {
  const movedListing = await query(
    `SELECT c.slug AS city_slug, l.slug FROM listings l
     JOIN cities c ON l.city_id = c.id
     WHERE l.slug = $1 AND l.is_active = true LIMIT 1`,
    [params.slug],
  );
  if (movedListing[0]) {
    redirect(`/${movedListing[0].city_slug}/places/${movedListing[0].slug}`, RedirectType.permanent);
  }
  notFound();
}
```

---

## 6. Caching Strategy

### 6.1 Three-Layer Cache Architecture

```
Request → Cloudflare CDN (Layer 1)
            ↓ MISS
          Vercel Edge Network (Layer 2)
            ↓ MISS
          Next.js ISR Cache (Layer 3)
            ↓ MISS (or stale)
          PostgreSQL direct read
```

### 6.2 Redis Cache in the Web Layer

```typescript
// apps/web/src/lib/cache/redis.ts

import { createClient } from 'redis';

const redis = createClient({ url: process.env.REDIS_URL });
await redis.connect();

export async function withCache<T>(
  key: string,
  ttlSeconds: number,
  fn: () => Promise<T>,
): Promise<T> {
  const cached = await redis.get(key);
  if (cached) return JSON.parse(cached) as T;

  const result = await fn();
  await redis.setEx(key, ttlSeconds, JSON.stringify(result));
  return result;
}

// TTLs by data type:
const CACHE_TTLS = {
  cityData:        3600,    // 1h — listing counts change slowly
  categoryPage:    900,     // 15min — new businesses should appear promptly
  listingDetail:   3600,    // 1h — business info is stable
  eventList:       300,     // 5min — events are time-sensitive
  eventDetail:     1800,    // 30min
  guideData:       21600,   // 6h — editorial content
  openNow:         0,       // NO CACHE — computed at request time
  tonightEvents:   600,     // 10min
  topListings:     3600,    // 1h — save counts change slowly
  sitemapData:     1800,    // 30min
};
```

### 6.3 Cloudflare Cache Tags

Every page sets `Cache-Tag` response headers. This enables surgical invalidation — updating one listing only purges that listing's cache, not the entire city.

```typescript
// apps/web/src/lib/cache/tags.ts

export function getPageCacheTags(
  pageType: 'listing' | 'event' | 'category' | 'city' | 'guide',
  opts: { citySlug?: string; slug?: string; category?: string },
): string {
  const tags: string[] = [`type:${pageType}`];

  if (opts.citySlug) tags.push(`city:${opts.citySlug}`);
  if (opts.slug) tags.push(`id:${opts.slug}`);
  if (opts.category) tags.push(`category:${opts.category}`);

  return tags.join(',');
}

// Used in page.tsx:
import { headers } from 'next/headers';

// In a Server Component:
headers().set(
  'Cache-Tag',
  getPageCacheTags('listing', { citySlug: params.city, slug: params.slug }),
);
```

### 6.4 Cache Invalidation Decision Tree

```
Content event → What changed?

Listing updated by business owner
  → purge CF tag: id:{listing.slug}
  → purge CF tag: city:{citySlug},type:listing
  → Next.js revalidatePath: /{city}/places/{slug}
  → Next.js revalidatePath: /{city}/{category}  (listing count may change)
  Time to reflect: < 60 seconds

New event published
  → purge CF tag: city:{citySlug},type:event
  → Next.js revalidatePath: /{city}/go-out
  → Next.js revalidatePath: /{city}/tonight
  → Redis delete: events:{citySlug}
  Time to reflect: < 60 seconds

New business added to city
  → purge CF tag: city:{citySlug}
  → Next.js revalidatePath: /{city}/{category}
  → Redis delete: category:{citySlug}:{category}
  → Trigger Vercel rebuild for generateStaticParams (adds new page)
  Time to reflect: 2–5 minutes (build + deploy)

Community post published
  → Next.js revalidatePath: /{city}/places/{listingSlug}  (if post tagged a business)
  → No CDN purge needed (post data is ISR revalidated on next request)
  Time to reflect: up to 24h (next business page ISR cycle)
  → Acceptable: community posts are supplementary SEO content, not primary
```

### 6.5 Tonight / Today Page Freshness

These pages need hourly content but must be fast. Use ISR with `revalidate = 3600` AND a separate Redis cache for the event data:

```typescript
// apps/web/src/app/[city]/tonight/page.tsx

export const revalidate = 3600;

export default async function TonightPage({ params }) {
  // Redis-cached for 10min — faster than DB on repeated loads within 1h ISR window
  const events = await withCache(
    `tonight:${params.city}`,
    600,
    () => query(`
      SELECT e.*, c.slug AS city_slug
      FROM events e
      JOIN cities c ON e.city_id = c.id
      WHERE c.slug = $1
        AND e.start_at BETWEEN NOW() AND NOW() + INTERVAL '14 hours'
        AND e.is_active = true
      ORDER BY e.start_at ASC
      LIMIT 20
    `, [params.city]),
  );

  // ...
}
```

---

## 7. CDN Usage

### 7.1 Cloudflare Configuration

```
Domain: muzgram.com → Cloudflare proxy (orange cloud ON)
DNS:
  A     @          → Vercel IP       (web app)
  A     api        → Railway/Fly.io  (NestJS API)
  A     admin      → Vercel          (admin dashboard)
  CNAME media      → R2 public URL   (media CDN)
```

### 7.2 Cache Rules (Cloudflare Dashboard → Caching → Cache Rules)

Create these rules in order (highest priority first):

```
Rule 1: Static Assets — Long TTL
  Match: URI Path starts with /_next/static/
  Action: Cache Everything
  Edge TTL: 1 year
  Browser TTL: 1 year

Rule 2: Tonight / Today Pages — Short TTL
  Match: URI Path matches regex .*/(tonight|today|this-weekend)$
  Action: Cache Everything
  Edge TTL: 10 minutes
  Browser TTL: 0 (no browser cache — always check CDN)

Rule 3: Event Pages — Medium TTL
  Match: URI Path matches regex .*/events/.*
  Action: Cache Everything
  Edge TTL: 30 minutes
  Browser TTL: 5 minutes

Rule 4: Business Pages — 1 Hour
  Match: URI Path matches regex .*/places/.*
  Action: Cache Everything
  Edge TTL: 1 hour
  Browser TTL: 10 minutes
  Response header: Cache-Tag (preserve for purging)

Rule 5: Category / City Pages — 30 Minutes
  Match: URI hostname = muzgram.com
  Action: Cache Everything
  Edge TTL: 30 minutes
  Browser TTL: 5 minutes

Rule 6: API Routes — No Cache
  Match: URI Path starts with /api/
  Action: Bypass Cache
```

### 7.3 Cloudflare Workers — Geo Detection

The "near-me" geo redirect is done in Next.js Middleware (runs at Vercel Edge), but Cloudflare provides the `cf-ipcity` header automatically. No separate Worker needed.

However, for edge-level A/B testing and feature flags for new cities (pre-launch waitlist vs. live content), deploy a Cloudflare Worker:

```javascript
// cloudflare-workers/city-router.js

addEventListener('fetch', (event) => {
  event.respondWith(handleRequest(event.request));
});

const LIVE_CITIES = ['chicago', 'naperville', 'bridgeview', 'schaumburg', 'lombard'];

async function handleRequest(request) {
  const url = new URL(request.url);
  const citySlug = url.pathname.split('/')[1];

  // If city exists in URL and is NOT live, show waitlist page
  if (citySlug && !LIVE_CITIES.includes(citySlug) && isKnownCity(citySlug)) {
    return Response.redirect(`https://muzgram.com/coming-soon?city=${citySlug}`, 302);
  }

  return fetch(request);
}
```

### 7.4 Media CDN (Cloudflare R2)

```
Upload flow: Mobile app → Presigned R2 PUT → media.muzgram.com
Web delivery: Next.js <Image> src="https://media.muzgram.com/listings/{id}/primary.webp"

Cloudflare R2 + Transform Rules for image optimization:
  /listings/{id}/primary.webp   → serves original
  /listings/{id}/primary@400w   → Cloudflare Image Resizing (Workers)
  /listings/{id}/primary@blur   → Returns LQIP placeholder

Cache-Control on R2 objects:
  Listing photos: max-age=86400, stale-while-revalidate=604800
  Event covers: max-age=3600 (events can change their cover)
  User uploads: max-age=604800, immutable (content-addressed key)
```

### 7.5 Open Graph Image Generation

Dynamic OG images for social sharing, generated at edge:

```typescript
// apps/web/src/app/[city]/places/[slug]/opengraph-image.tsx
// Next.js automatically serves this as /[city]/places/[slug]/opengraph-image

import { ImageResponse } from 'next/og';

export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default async function OGImage({ params }: { params: { city: string; slug: string } }) {
  const [listing] = await query(
    `SELECT name, main_category, neighborhood, primary_photo_url FROM listings l
     JOIN cities c ON l.city_id = c.id
     WHERE c.slug = $1 AND l.slug = $2`,
    [params.city, params.slug],
  );

  return new ImageResponse(
    (
      <div
        style={{
          background: '#0D0D0D',
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'flex-end',
          padding: '48px',
          fontFamily: 'Inter',
          position: 'relative',
        }}
      >
        {listing?.primary_photo_url && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={listing.primary_photo_url}
            alt=""
            style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', opacity: 0.4 }}
          />
        )}
        <div style={{ position: 'relative', zIndex: 1 }}>
          <div style={{ color: '#D4A853', fontSize: 18, marginBottom: 8 }}>Muzgram</div>
          <div style={{ color: '#F5F5F5', fontSize: 56, fontWeight: 700, lineHeight: 1.1 }}>
            {listing?.name ?? 'Muzgram'}
          </div>
          <div style={{ color: '#A0A0A0', fontSize: 24, marginTop: 16 }}>
            {listing?.neighborhood ?? params.city} · {listing?.main_category}
          </div>
        </div>
      </div>
    ),
    size,
  );
}
```

---

## 8. Deployment Architecture

### 8.1 Infrastructure Map

```
┌─────────────────────────────────────────────────────────────┐
│                        Cloudflare                           │
│   DNS + CDN + Cache Rules + Workers + DDoS + WAF           │
│   muzgram.com  api.muzgram.com  media.muzgram.com          │
└──────────────────┬──────────────────────────────────────────┘
                   │
       ┌───────────┼───────────────┐
       ▼           ▼               ▼
┌──────────┐  ┌─────────┐  ┌──────────────┐
│  Vercel  │  │  Fly.io │  │ Cloudflare   │
│          │  │  (or    │  │     R2       │
│ apps/web │  │ Railway)│  │ media bucket │
│ apps/admin  │  apps/api│  │              │
│ ISR cache│  │ NestJS  │  │ Static media │
└──────────┘  └────┬────┘  └──────────────┘
                   │
       ┌───────────┼─────────────┐
       ▼           ▼             ▼
┌──────────┐  ┌─────────┐  ┌─────────┐
│ Supabase │  │ Upstash │  │  Fly.io │
│  (Prod)  │  │  Redis  │  │ (worker)│
│ Primary  │  │         │  │         │
│ + Read   │  │ Bull     │  │ Queues  │
│ Replica  │  │ queues  │  │ running │
└──────────┘  └─────────┘  └─────────┘
```

### 8.2 `apps/web` — Vercel Configuration

```json
// apps/web/vercel.json
{
  "buildCommand": "cd ../.. && pnpm turbo build --filter=@muzgram/web",
  "outputDirectory": "apps/web/.next",
  "installCommand": "pnpm install",
  "framework": "nextjs",
  "regions": ["iad1", "ord1"],
  "env": {
    "DATABASE_READ_URL": "@muzgram-db-read-url",
    "REDIS_URL": "@muzgram-redis-url",
    "REVALIDATE_SECRET": "@muzgram-revalidate-secret",
    "CF_ZONE_ID": "@cloudflare-zone-id",
    "CF_API_TOKEN": "@cloudflare-api-token",
    "NEXT_PUBLIC_API_URL": "https://api.muzgram.com",
    "NEXT_PUBLIC_APP_SCHEME": "muzgram"
  }
}
```

### 8.3 Environment Variables — `apps/web`

Add to `.env.example`:

```bash
# ─── Web (SEO layer) ──────────────────────────────────────────────────────────
# Read-only Supabase direct connection (no pooler — RSC holds connections)
DATABASE_READ_URL=postgresql://readonly_user:password@db.xxxx.supabase.co:5432/postgres?sslmode=require

# ISR webhook secret (shared with apps/api CacheInvalidationService)
REVALIDATE_SECRET=your_revalidate_secret_here

# Cloudflare zone for Cache-Tag purging
CF_ZONE_ID=your_cloudflare_zone_id
CF_API_TOKEN=your_cloudflare_api_token_with_cache_purge_permission

# Public env vars (exposed to browser)
NEXT_PUBLIC_API_URL=https://api.muzgram.com
NEXT_PUBLIC_APP_SCHEME=muzgram
NEXT_PUBLIC_APP_STORE_ID=your_app_store_id
NEXT_PUBLIC_MAPBOX_TOKEN=pk.eyJ1IjoibXV6Z3JhbSJ9.xxx
```

### 8.4 Supabase Read-Only User

Create a read-only Postgres role for the web layer. Never give the web layer write access:

```sql
-- Run in Supabase SQL editor
CREATE USER muzgram_web_readonly WITH PASSWORD 'secure_password_here';

GRANT CONNECT ON DATABASE postgres TO muzgram_web_readonly;
GRANT USAGE ON SCHEMA public TO muzgram_web_readonly;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO muzgram_web_readonly;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT ON TABLES TO muzgram_web_readonly;

-- Row-level security: web layer can only read active, non-deleted content
-- The following policies ensure deleted businesses never appear on SEO pages
CREATE POLICY "web_active_only" ON listings
  FOR SELECT TO muzgram_web_readonly
  USING (is_active = true AND deleted_at IS NULL);

CREATE POLICY "web_active_events" ON events
  FOR SELECT TO muzgram_web_readonly
  USING (is_active = true);

CREATE POLICY "web_published_guides" ON guide_pages
  FOR SELECT TO muzgram_web_readonly
  USING (is_published = true);
```

### 8.5 Turborepo Integration

```json
// turbo.json — add web app tasks

{
  "tasks": {
    "build": {
      "dependsOn": ["^build"],
      "outputs": [".next/**", "!.next/cache/**", "dist/**"]
    },
    "@muzgram/web#build": {
      "dependsOn": ["^build", "@muzgram/types#build"],
      "env": [
        "DATABASE_READ_URL",
        "REVALIDATE_SECRET",
        "NEXT_PUBLIC_API_URL",
        "NEXT_PUBLIC_APP_SCHEME"
      ],
      "outputs": [".next/**", "!.next/cache/**"]
    }
  }
}
```

### 8.6 `apps/web/package.json`

```json
{
  "name": "@muzgram/web",
  "version": "0.1.0",
  "private": true,
  "scripts": {
    "dev": "next dev -p 3001",
    "build": "next build",
    "start": "next start -p 3001",
    "typecheck": "tsc --noEmit"
  },
  "dependencies": {
    "@muzgram/types": "workspace:*",
    "@muzgram/constants": "workspace:*",
    "next": "^15.2.0",
    "react": "^19.0.0",
    "react-dom": "^19.0.0",
    "pg": "^8.13.1",
    "redis": "^4.7.0"
  },
  "devDependencies": {
    "@types/node": "^22.10.0",
    "@types/pg": "^8.11.0",
    "@types/react": "^19.0.0",
    "@types/react-dom": "^19.0.0",
    "typescript": "^5.7.0"
  }
}
```

### 8.7 CI/CD Pipeline — GitHub Actions

```yaml
# .github/workflows/web-deploy.yml

name: Deploy Web (SEO Layer)

on:
  push:
    branches: [main]
    paths:
      - 'apps/web/**'
      - 'packages/types/**'
      - 'packages/constants/**'

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - uses: pnpm/action-setup@v4
        with:
          version: 9

      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: 'pnpm'

      - run: pnpm install

      - name: Typecheck
        run: pnpm turbo typecheck --filter=@muzgram/web

      - name: Build
        run: pnpm turbo build --filter=@muzgram/web
        env:
          DATABASE_READ_URL: ${{ secrets.DATABASE_READ_URL }}
          NEXT_PUBLIC_API_URL: https://api.muzgram.com
          NEXT_PUBLIC_APP_SCHEME: muzgram

      - name: Deploy to Vercel
        uses: amondnet/vercel-action@v25
        with:
          vercel-token: ${{ secrets.VERCEL_TOKEN }}
          vercel-org-id: ${{ secrets.VERCEL_ORG_ID }}
          vercel-project-id: ${{ secrets.VERCEL_WEB_PROJECT_ID }}
          working-directory: apps/web
          vercel-args: '--prod'

      - name: Submit sitemap to Google
        if: success()
        run: |
          curl "https://www.google.com/ping?sitemap=https://muzgram.com/sitemap.xml"
```

### 8.8 Monitoring & SEO Health Checks

```typescript
// apps/web/src/app/api/health/route.ts — deployment health check

export async function GET() {
  const [dbCheck, cacheCheck] = await Promise.allSettled([
    query('SELECT 1 as ok FROM cities LIMIT 1'),
    redis.ping(),
  ]);

  return Response.json({
    status: 'ok',
    db: dbCheck.status === 'fulfilled' ? 'connected' : 'error',
    redis: cacheCheck.status === 'fulfilled' ? 'connected' : 'error',
    timestamp: new Date().toISOString(),
  });
}
```

### 8.9 Page Count Projections

| Page Type | Chicago Launch | +2 Cities | +5 Cities | Year 2 (10 cities) |
|-----------|---------------|-----------|-----------|---------------------|
| City hubs | 9 | 11 | 14 | 19 |
| Category pages | 36 | 44 | 56 | 76 |
| Subcategory pages | ~200 | ~320 | ~500 | ~900 |
| Business pages | ~200 | ~500 | ~1,000 | ~3,000 |
| Event pages | ~50 | ~120 | ~300 | ~2,000 |
| Guide pages | ~30 | ~60 | ~100 | ~200 |
| Near-me pages | 35 | 35 | 35 | 35 |
| **Total** | **~560** | **~1,090** | **~2,005** | **~6,230** |

At Year 2 scale (10 cities, active content), Vercel builds will exceed 10K pages. At that point: split `generateStaticParams` to top 5K by traffic, let the rest be on-demand ISR. No architecture change needed.

---

*Last updated: April 2026*
