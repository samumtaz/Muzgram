# Muzgram — Production Architecture & Scale Plan

> Last updated: 2026-04-21
> Audience: Founder + engineering lead. Covers Chicago launch through global rollout.
> Companion docs: 11-engineering-execution-plan.md, 13-monetization-model.md, 17-mmp-design.md

---

## Document Map

1. [Architecture Scaling Strategy](#1-architecture-scaling-strategy)
2. [Multi-City Rollout Architecture](#2-multi-city-rollout-architecture)
3. [Moderation at Scale](#3-moderation-at-scale)
4. [Search Scaling](#4-search-scaling)
5. [Recommendation Engine Evolution](#5-recommendation-engine-evolution)
6. [Analytics and Data Warehouse](#6-analytics-and-data-warehouse)
7. [Billing and Monetization Scaling](#7-billing-and-monetization-scaling)
8. [Support Tooling](#8-support-tooling)
9. [Operational Processes](#9-operational-processes)
10. [Trust and Safety Systems](#10-trust-and-safety-systems)
11. [Infrastructure and Deployment](#11-infrastructure-and-deployment)
12. [Observability and Monitoring](#12-observability-and-monitoring)
13. [Security and Privacy](#13-security-and-privacy)
14. [Rate Limiting and Abuse Prevention](#14-rate-limiting-and-abuse-prevention)
15. [Release Management Process](#15-release-management-process)

---

## 1. Architecture Scaling Strategy

### The Four Stages of Muzgram's Architecture

Not a generic "horizontal scaling" plan. Each stage is triggered by real load thresholds specific to Muzgram's traffic shape — geographically clustered bursts (Ramadan nights, Eid weekend, Friday post-Jummah), not uniform global load.

```
Stage 1 — Chicago MVP (0–500 req/s peak)
  Single NestJS process, single PostgreSQL, Redis, Cloudflare R2
  Hosted on Railway or Render — zero ops overhead
  One developer can run this. Ship fast.

Stage 2 — Chicago + 1-2 More Cities (500–2,000 req/s peak)
  Separate API containers from Worker containers
  PostgreSQL read replica (read-heavy: feed, map, search)
  Redis Cluster (2 shards)
  Typesense search node
  Cloudflare CDN for all media (R2 stays)
  Trigger: sustained >500 req/s OR >500K content rows

Stage 3 — 5+ Cities / MMP Live (2,000–10,000 req/s peak)
  API service splits into: Gateway, Feed Service, Content Service, Notification Service
  PostgreSQL → primary + 2 read replicas + connection pooling (PgBouncer)
  TimescaleDB sidecar for activity_logs (>5M rows)
  Kafka for async event streaming between services
  Typesense cluster (3 nodes)
  Dedicated push notification service (>10K/day)
  Trigger: sustained >2,000 req/s OR 5+ active cities OR MMP features live

Stage 4 — US Scale / Global (10,000+ req/s)
  Regional deployments (US-East, US-West, EU, MENA)
  Global PostgreSQL: Neon serverless OR CockroachDB for cross-region
  Pinecone or pgvector-on-Neon for recommendation embeddings
  ClickHouse for analytics and data warehouse
  Cloudflare Workers for edge personalization (geo-routing, A/B)
  Kafka multi-region replication
  Trigger: $2M ARR or Year 2 US expansion live
```

### Service Split Decision Tree

The monorepo stays. Services split along actual load boundaries, not organizational preferences.

```
Current: apps/api (monolith) handles ALL of:
  - Auth (Clerk webhook sync)
  - Feed composition
  - Content CRUD
  - Map queries
  - Notifications (Bull + Expo Push)
  - Business analytics
  - Admin moderation
  - Webhooks (Stripe, Clerk)

Stage 2 split (first cut — minimal disruption):
  apps/api → apps/api + apps/worker
  Worker takes: all Bull queues, push notifications, AI moderation jobs, recurring event generation
  API stays: HTTP request handling only
  Shared: packages/types, packages/constants, packages/db (TypeORM data sources)

Stage 3 split (only if Stage 2 is a bottleneck):
  apps/feed-service → feed scoring + composition
  apps/notification-service → push + scheduling
  Gateway (Kong or NestJS Gateway) → routes, auth middleware, rate limiting
  Everything talks via gRPC internally (not REST — latency matters between services)

The mistake to avoid: microservices before you need them. Every service boundary
is a distributed transaction problem waiting to happen. Split on data, not features.
```

### Database Scaling Path

```sql
-- Stage 1: Single PostgreSQL + PostGIS
-- Everything in one DB. 44 tables. Simple. Ship it.

-- Stage 2: Read Replica
-- All SELECT for feed, map, search → replica
-- All INSERT/UPDATE/DELETE → primary
-- Pattern in TypeORM:
@Injectable()
export class FeedService {
  constructor(
    @InjectRepository(Listing) private repo: Repository<Listing>,
    @InjectEntityManager('replica') private replicaManager: EntityManager,
  ) {}

  async getFeed(query: FeedQuery) {
    // Use replica for reads — never touches primary
    return this.replicaManager.query(`SELECT ...`);
  }
}

-- Stage 3: Connection Pooling
-- PgBouncer in transaction mode between API containers and PostgreSQL
-- Without pooling: 50 API containers × 10 connections each = 500 connections
-- PostgreSQL starts struggling at ~300 connections
-- PgBouncer multiplexes → 10 actual PostgreSQL connections serve 500 app connections

-- Stage 3: Partition activity_logs by month
CREATE TABLE activity_logs_2026_04 PARTITION OF activity_logs
  FOR VALUES FROM ('2026-04-01') TO ('2026-05-01');
-- Attach TimescaleDB for time-series queries (retention cohorts, DAU, engagement)

-- Stage 4: Neon Serverless PostgreSQL for cross-region
-- Neon's branching also enables instant per-PR preview environments
-- Zero cold-start with connection pooling built in
```

### Caching Architecture by Stage

```
Stage 1 (current):
  Redis single node
  Keys: feed:{userId}:{lat}:{lng} → TTL 5min
        map:cluster:{geohash6} → TTL 2min
        listing:{id} → TTL 10min
        user:session:{clerkId} → TTL 24h

Stage 2 additions:
  Redis Cluster (2 primary shards, 2 replicas)
  Separate Redis for Bull queues (don't mix job queue with cache)
  CDN cache for map tile assets + R2 media (Cloudflare default TTLs)
  HTTP response caching: ETag on listing detail, Cache-Control: public max-age=60 on feed

Stage 3 additions:
  Edge caching via Cloudflare Workers:
    - City-level event lists cached at edge, invalidated on new event publish
    - Map cluster aggregates pushed to KV (Cloudflare KV) — 0ms reads globally
  Stale-While-Revalidate pattern for feed:
    - Serve cached feed instantly
    - Recompute in background if >3min old
    - Never block a feed request on computation

Stage 4:
  Regional Redis clusters (US-East, US-West, EU)
  Consistent hashing ensures Chicago users always hit US-East Redis
```

---

## 2. Multi-City Rollout Architecture

### The City Data Model

Every piece of content is scoped to a city. The schema must support this from Day 1 even if Chicago is the only city in MVP.

```typescript
// packages/types/src/geography.ts

export interface City {
  id: string;           // 'chicago', 'houston', 'nyc'
  name: string;
  country: 'us' | 'uk' | 'ca' | 'au' | 'ae';
  timezone: string;     // 'America/Chicago'
  center: [number, number];
  boundingBox: [number, number, number, number];
  clusters: Cluster[];  // Neighborhoods / suburbs
  launchStatus: 'pre_launch' | 'active' | 'paused';
  launchDate?: Date;
}

export interface Cluster {
  id: string;           // 'west-ridge', 'bridgeview', 'schaumburg'
  cityId: string;
  name: string;
  displayName: string;  // "West Rogers Park", not "WRP"
  center: [number, number];
  radius: number;       // meters
  muslimDensityScore: number; // 1-10, used for content boost weighting
}
```

```sql
-- Every content table has city_id from the start
ALTER TABLE listings ADD COLUMN city_id VARCHAR(50) REFERENCES cities(id);
ALTER TABLE events ADD COLUMN city_id VARCHAR(50) REFERENCES cities(id);
ALTER TABLE community_posts ADD COLUMN city_id VARCHAR(50) REFERENCES cities(id);

-- Index for city-scoped feed queries (the most common query pattern)
CREATE INDEX idx_listings_city_active ON listings(city_id, is_active, created_at DESC)
  WHERE is_active = true;

CREATE INDEX idx_events_city_upcoming ON events(city_id, start_time)
  WHERE start_time > NOW() AND is_active = true;
```

### City Launch Playbook (Technical)

Each new city is a data operation, not a code deployment. Code is already multi-city aware.

```
T-30 days: City pre-launch prep
  1. Add city record to cities table (launchStatus: 'pre_launch')
  2. Run city seed script:
     node scripts/seed-city.ts --city houston
     → Imports 100+ business stubs from Google Places API (Muslim-owned filter)
     → Imports mosque data from ISNA directory
     → Imports community organizations from local Muslim directory
     → All stubs have claim_status: 'unclaimed', trust_tier: 0
  3. Activate Typesense index for new city (city-scoped collection)
  4. Assign founding member slots (20 max per city)

T-7 days: Soft activation
  1. launchStatus → 'soft_launch'
  2. Enable feed for users in city bounding box (returns seeded content)
  3. Founding member businesses receive onboarding WhatsApp sequence
  4. Event organizers invited to post first 5 events before launch

T-0: Hard launch
  1. launchStatus → 'active'
  2. Push notifications enabled for city
  3. App Store geo-targeting: boost visibility in city metro area
  4. Launch event (physical) feeds the first wave of community posts

Post-launch monitoring (first 72h):
  - Feed empty state rate < 5% (users seeing empty feed = bad)
  - Business claim rate > 20% of stubs within first week
  - D1 retention > 40% (capture the launch energy)
```

### Multi-City Feed Isolation

Users only see content relevant to their city. But they can browse other cities.

```typescript
// apps/api/src/feed/feed.service.ts

async composeFeed(userId: string, options: FeedOptions): Promise<FeedItem[]> {
  const user = await this.userService.getWithContext(userId);

  // Primary city: where user is right now (GPS) or their home city
  const primaryCity = options.overrideCity
    ?? await this.geoService.detectCity(options.lat, options.lng)
    ?? user.homeCity;

  // Feed is always city-scoped
  const [featured, events, spots, community] = await Promise.all([
    this.getFeaturedItems(primaryCity.id),
    this.getUpcomingEvents(primaryCity.id, options),
    this.getNearbySpots(primaryCity.id, options),
    this.getCommunityPosts(primaryCity.id, options),
  ]);

  return this.scoringEngine.compose({ featured, events, spots, community, user });
}
```

### City-Level Feature Flags

Not every feature rolls out to every city at the same time. Ramadan Mode, Jummah Finder, and city-specific content must be controlled per city.

```typescript
// packages/constants/src/city-features.ts

export const CITY_FEATURES: Record<string, CityFeatureSet> = {
  chicago: {
    ramadanMode: true,
    jummahFinder: true,
    reviews: false,       // MMP — not yet
    communityGroups: false,
    halalRadarWidget: true,
    languages: ['en'],
  },
  houston: {
    ramadanMode: true,
    jummahFinder: true,
    reviews: true,        // Houston gets reviews if Chicago proved it out
    communityGroups: false,
    halalRadarWidget: true,
    languages: ['en', 'ur'],
  },
  london: {
    ramadanMode: true,
    jummahFinder: true,
    reviews: true,
    communityGroups: true,
    halalRadarWidget: true,
    languages: ['en', 'ar', 'ur', 'bn'],
  },
};
```

### International Expansion Architecture

```
Phase 1 (Chicago): Single region, US-East
Phase 2 (Houston / NYC / Dallas): Still US-East — no latency difference within US
Phase 3 (LA / Atlanta): US-West added — Cloudflare CDN handles media globally anyway
Phase 4 (London / Toronto / Dubai): Regional API deployment

International architecture additions:
  - Cloudflare Workers for geo-routing: /api/* → nearest regional deployment
  - Regional PostgreSQL read replica in EU (GDPR compliance)
  - Currency-aware pricing: USD, GBP, CAD, AED — Stripe handles this natively
  - Timezone-aware feed: "events happening today" is city-local time, always
  - RTL support in app: Arabic/Urdu markets (NativeWind + React Native RTL)

GDPR (EU cities):
  - User data must be storeable in EU region
  - Right to erasure: soft delete → hard delete job runs after 30 days
  - Data export: user_data_export endpoint generates JSON of all user content
  - Consent: Clerk handles consent capture at auth; we store consent_version in users table

MENA data residency (UAE, Saudi):
  - Some markets require local data storage
  - Neon Serverless supports regional branching — spin up UAE branch
  - Media: Cloudflare R2 has UAE presence via CDN; R2 storage can be EU-scoped
```

---

## 3. Moderation at Scale

### The Moderation Tiers

```
MVP (manual + basic AI):
  Google Vision SafeSearch → auto-reject NSFW
  pHash deduplication → auto-reject spam photos
  Community reports → queue for manual review
  All moderation: founder or single community manager

MMP (semi-automated):
  Trust Tier system → auto-approve Tier 3+ content
  AI text classification → flag suspicious community posts
  Dispute queue with 24h SLA

Production scale (full pipeline):
  Pre-publish: Real-time AI scan (< 200ms, non-blocking for trusted users)
  Post-publish: Async deep scan (Google Vision + custom classifier)
  Community: Reports weighted by reporter trust score
  Human review: < 1% of content needs human eyes
```

### Content Moderation Pipeline (Production)

```typescript
// apps/worker/src/moderation/moderation.pipeline.ts

interface ModerationResult {
  approved: boolean;
  confidence: number;
  flags: ModerationFlag[];
  requiresHumanReview: boolean;
}

class ModerationPipeline {
  async scan(content: PendingContent): Promise<ModerationResult> {
    const [textResult, imageResult] = await Promise.all([
      content.text ? this.scanText(content.text) : Promise.resolve(null),
      content.mediaUrl ? this.scanImage(content.mediaUrl) : Promise.resolve(null),
    ]);

    // Fast-path: trusted users (Tier 3+) skip full scan
    if (content.author.trustTier >= 3) {
      // Still scan async post-publish, but don't block
      this.queueAsyncScan(content.id);
      return { approved: true, confidence: 0.99, flags: [], requiresHumanReview: false };
    }

    const flags = [
      ...this.evaluateTextFlags(textResult),
      ...this.evaluateImageFlags(imageResult),
      ...this.evaluateMetadataFlags(content),
    ];

    const severity = this.calculateSeverity(flags);

    return {
      approved: severity < 0.3,
      confidence: 1 - severity,
      flags,
      requiresHumanReview: severity > 0.6 && severity < 0.9,
      // severity > 0.9 = auto-reject, no human needed
    };
  }

  private async scanText(text: string): Promise<TextScanResult> {
    // Stage 1: Bloom filter for known spam phrases (< 1ms)
    if (this.spamBloom.has(this.normalizeText(text))) {
      return { spam: true, confidence: 0.99 };
    }

    // Stage 2: Local classifier (ONNX model, < 5ms)
    const localResult = await this.localClassifier.classify(text);
    if (localResult.confidence > 0.9) return localResult;

    // Stage 3: OpenAI moderation API (only for ambiguous cases, ~50ms)
    return this.openaiModerator.classify(text);
  }

  private async scanImage(url: string): Promise<ImageScanResult> {
    // Always run Google Vision SafeSearch
    const [safeSearch, phash] = await Promise.all([
      this.visionClient.safeSearch(url),
      this.phashService.compute(url),
    ]);

    // Check pHash against known-bad hashes
    const isDuplicate = await this.phashService.matchesKnownBad(phash);

    return {
      nsfw: safeSearch.adult === 'LIKELY' || safeSearch.adult === 'VERY_LIKELY',
      violence: safeSearch.violence === 'LIKELY' || safeSearch.violence === 'VERY_LIKELY',
      isDuplicate,
      phash,
    };
  }
}
```

### Report System Architecture

```typescript
// Trust-weighted reporting — not all reports are equal

interface ContentReport {
  contentId: string;
  contentType: 'listing' | 'event' | 'post' | 'photo';
  reporterId: string;
  reason: ReportReason;
  details?: string;
}

async function processReport(report: ContentReport) {
  const reporter = await userService.get(report.reporterId);
  const reportWeight = REPORTER_WEIGHTS[reporter.trustTier]; // Tier 0=0.2, Tier 3=1.0, Tier 4=2.0

  await db.query(`
    UPDATE content_reports
    SET weighted_score = weighted_score + $1
    WHERE content_id = $2
  `, [reportWeight, report.contentId]);

  const { weighted_score, total_reports } = await db.query(`
    SELECT weighted_score, COUNT(*) as total_reports
    FROM content_reports WHERE content_id = $1
  `, [report.contentId]);

  // Auto-hide at weighted_score >= 3.0 (e.g., 3 Tier-3 users report it)
  if (weighted_score >= 3.0) {
    await contentService.hide(report.contentId, 'auto_hidden_reports');
    await moderationQueue.add('review_reported_content', {
      contentId: report.contentId,
      priority: weighted_score > 5 ? 'high' : 'normal',
    });
  }
}
```

### Moderation Dashboard (Internal Admin)

```
apps/admin — NestJS + React admin panel (internal only, not public)

Moderation queues:
  - Pending Review: content flagged for human review, sorted by priority
  - Appeals: users disputing removal decisions
  - Business Claims: verification requests (Tier 2 → Tier 3 upgrades)
  - Spam Patterns: bulk action on coordinated spam campaigns

Moderator tools:
  - 1-click approve / reject / warn / ban
  - Ban scope: content only / account / IP / phone number
  - Batch operations: select 20 community posts → bulk reject
  - Audit trail: every action logged with moderator ID + timestamp + reason
  - Escalation: moderator can push to founder review with 1 click

SLAs by content type:
  - Business listings: 48h review (lower urgency)
  - Events: 4h review (time-sensitive)
  - Community posts: 1h review (most time-sensitive)
  - Reports on Tier 4 users: 12h (give benefit of doubt, audit carefully)
```

### Moderation Staffing by Scale

```
Chicago MVP: Founder reviews everything (< 1h/week if moderation pipeline is working)
Chicago + 2 cities: 1 part-time community manager (10h/week)
5+ cities: 1 full-time community manager + 1 part-time backup
10+ cities: Moderation team of 3 (geographic coverage — US hours + EU hours)
International: Regional community leads with local language ability
```

---

## 4. Search Scaling

### Search Stack by Stage

```
Stage 1 (MVP): PostgreSQL full-text search
  -- Good enough for < 50K rows and < 100 search/day
  CREATE INDEX idx_listings_fts ON listings
    USING GIN(to_tsvector('english', name || ' ' || description || ' ' || category));

  SELECT *, ts_rank(fts_vector, query) AS rank
  FROM listings, to_tsquery('english', $1) query
  WHERE city_id = $2 AND fts_vector @@ query
  ORDER BY rank DESC, distance ASC
  LIMIT 20;

Stage 2 (MMP, > 500K rows): Typesense
  - Self-hosted on a dedicated 2vCPU/4GB node (< $30/month on Hetzner)
  - Instant search (< 50ms), typo tolerance, geo-boosting built in
  - Sync from PostgreSQL via Bull job: content_updated → Typesense upsert

Stage 3 (Production, > 2M rows): Typesense Cluster
  - 3-node cluster: 1 leader + 2 replicas
  - City-partitioned collections: businesses_chicago, businesses_houston, etc.
  - Global search collection: all_businesses (for "travel to another city" use case)
```

### Typesense Schema (Production)

```typescript
// packages/types/src/search.ts

const businessCollection: CollectionCreateSchema = {
  name: 'businesses',
  fields: [
    { name: 'id', type: 'string' },
    { name: 'city_id', type: 'string', facet: true, index: true },
    { name: 'name', type: 'string' },
    { name: 'description', type: 'string' },
    { name: 'category', type: 'string', facet: true },
    { name: 'sub_category', type: 'string[]', facet: true },
    { name: 'halal_status', type: 'string', facet: true },
    { name: 'is_verified', type: 'bool', facet: true },
    { name: 'trust_tier', type: 'int32' },
    { name: 'is_featured', type: 'bool' },
    { name: 'is_open_now', type: 'bool', facet: true },
    { name: 'location', type: 'geopoint' },
    { name: 'score', type: 'float' }, // Pre-computed quality score
    { name: 'photo_count', type: 'int32' },
    { name: 'save_count', type: 'int32' },
    { name: 'tags', type: 'string[]', facet: true },
  ],
  default_sorting_field: 'score',
};

// Search request with geo + facets
const searchParams = {
  q: userQuery,
  query_by: 'name,description,tags',
  filter_by: `city_id:=${cityId} && is_open_now:=true`,
  sort_by: `_geo_distance(location:[${lat},${lng}]):asc,score:desc`,
  facet_by: 'category,halal_status,is_verified',
  num_typos: 2,
  per_page: 20,
};
```

### Search Sync Architecture

```typescript
// apps/worker/src/search/search-sync.job.ts

@Processor('search-sync')
export class SearchSyncJob {
  @Process('upsert_business')
  async upsertBusiness(job: Job<{ businessId: string }>) {
    const business = await this.businessService.getWithRelations(job.data.businessId);

    await this.typesense.collections('businesses').documents().upsert({
      id: business.id,
      city_id: business.cityId,
      name: business.name,
      description: business.description,
      category: business.category,
      halal_status: business.halalStatus,
      is_verified: business.trustTier >= 2,
      trust_tier: business.trustTier,
      is_featured: business.isFeatured,
      is_open_now: this.hoursService.isOpenNow(business.hours),
      location: [business.lat, business.lng],
      score: this.scoringService.computeBusinessScore(business),
      photo_count: business.photos.length,
      save_count: business.saveCount,
      tags: this.tagService.extract(business),
    });
  }

  // Runs every 15 minutes to update is_open_now for all businesses
  @Cron('*/15 * * * *')
  async refreshOpenStatus() {
    const businesses = await this.businessService.getAll({ isActive: true });
    const batchUpdates = businesses.map(b => ({
      id: b.id,
      is_open_now: this.hoursService.isOpenNow(b.hours),
    }));

    // Typesense bulk update (max 40 per batch)
    for (const batch of chunk(batchUpdates, 40)) {
      await this.typesense.collections('businesses').documents().import(batch, {
        action: 'update',
      });
    }
  }
}
```

### Search Analytics (What Users Search For)

```sql
-- Track search queries to understand intent gaps
CREATE TABLE search_queries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  city_id VARCHAR(50),
  query TEXT,
  result_count INTEGER,
  clicked_result_id VARCHAR(255),
  clicked_result_type VARCHAR(50),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Zero-result queries → what content to create / what categories to add
-- High-CTR queries → what should be featured
-- These queries feed the weekly business recruitment conversation:
--   "We see 47 people searched 'shawarma bridgeview' this week and found nothing"
```

---

## 5. Recommendation Engine Evolution

### Stage 1: Rules-Based (MVP)

No ML. Pure rules based on recency, proximity, engagement, and trust tier.

```typescript
// Already documented in docs/16-visual-feed-and-content-engine.md

function scoreContent(item: FeedItem, user: UserContext): number {
  let score = 0;
  // Recency (max 100) + Proximity (max 50) + Type Boosts + Trust Boosts
  // + Engagement Quality + Featured Override (+200)
  return score;
}
```

### Stage 2: Collaborative Filtering (MMP, 10K+ users)

When you have 10,000+ users and 100K+ interactions, you can start finding "users like you saved spots like this."

```typescript
// packages/ml/src/recommendations/collaborative-filter.ts

// Implicit feedback matrix
// Rows: users, Columns: listings/events
// Values: interaction weight (save=10, view_detail=3, share=7, click=1)

interface InteractionMatrix {
  userId: string;
  itemId: string;
  itemType: 'listing' | 'event';
  weight: number;
  cityId: string;
}

// Using pgvector for embedding storage
// Alternative: move to Pinecone at Stage 3

// Daily job: compute user embeddings from interaction history
// Weekly job: compute item embeddings from user interaction patterns
// Real-time: nearest neighbor lookup using pgvector <-> operator

const recommendedItems = await db.query(`
  SELECT i.*, 
    1 - (i.embedding <-> $1) AS similarity
  FROM item_embeddings i
  WHERE i.city_id = $2
    AND i.item_id NOT IN (SELECT item_id FROM user_interactions WHERE user_id = $3)
  ORDER BY similarity DESC
  LIMIT 20;
`, [userEmbedding, cityId, userId]);
```

### Stage 3: People Match Engine (Future, Documented Now)

The data foundation is being built from Day 1 even though the feature ships later.

```sql
-- These tables are created in MVP schema but only queried in MMP+

-- user_interest_signals: captures every meaningful interaction
CREATE TABLE user_interest_signals (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES users(id),
  signal_type VARCHAR(50), -- 'save','share','view_detail','rsvp','post_category'
  category VARCHAR(100),
  sub_category VARCHAR(100),
  city_id VARCHAR(50),
  weight DECIMAL(4,2),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- user_community_clusters: which "scenes" does this user belong to?
CREATE TABLE user_community_clusters (
  user_id UUID REFERENCES users(id),
  cluster_id VARCHAR(100), -- 'foodie','events','professional','mosque_adjacent'
  score DECIMAL(5,3),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (user_id, cluster_id)
);

-- user_neighborhood_affinity: where do they spend time?
CREATE TABLE user_neighborhood_affinity (
  user_id UUID REFERENCES users(id),
  cluster_id VARCHAR(100), -- 'west-ridge', 'bridgeview', 'schaumburg'
  session_count INTEGER DEFAULT 0,
  interaction_count INTEGER DEFAULT 0,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (user_id, cluster_id)
);
```

### People Match Feature Design (Future)

```
"Find Your Crew" — not "Find Other Muslims"

Matching signals (weighted):
  - Same neighborhood activity (40%)
  - Overlapping saved spots (30%)
  - Same event categories attended (20%)
  - Similar posting behavior (10%)

What you see:
  "3 people near you also love late-night spots in West Ridge"
  → See their public profile (no DMs, no follows)
  → See what they've saved publicly
  → "They're going to [Event Name] this Friday"

What you DON'T see:
  - Religious profile
  - Prayer schedule
  - "Other Muslims near you"

The framing is always: same scene, same neighborhood, same taste
Never: same religion, same ethnicity, same community
```

### Stage 4: Real-Time Personalization (Cloudflare Workers)

At global scale, feed personalization happens at the edge.

```typescript
// Cloudflare Worker: edge-personalized feed headers
export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const userId = getUserFromJWT(request);
    const userProfile = await env.USER_KV.get(userId, 'json');

    // Add personalization hints as headers — API uses these to
    // boost relevant content without a round-trip to recommendation service
    const personalizedRequest = new Request(request, {
      headers: {
        ...request.headers,
        'X-User-Top-Categories': userProfile?.topCategories?.join(',') ?? '',
        'X-User-Neighborhood': userProfile?.homeCluster ?? '',
        'X-User-Trust-Tier': String(userProfile?.trustTier ?? 0),
      },
    });

    return fetch(personalizedRequest);
  },
};
```

---

## 6. Analytics and Data Warehouse

### The Analytics Stack by Stage

```
Stage 1 (MVP): PostgreSQL + weekly manual export
  - activity_logs table captures all user events
  - Weekly: export to Google Sheets for founder review
  - Cost: $0

Stage 2 (MMP, > 100K events/day): PostHog Cloud
  - Self-serve analytics, funnel analysis, session replay
  - Drop-in SDK for React Native (Expo)
  - Cost: ~$450/month at 1M events/month
  - Replaces manual sheet analysis entirely

Stage 3 (Production, > 1M events/day): ClickHouse + PostHog hybrid
  - PostHog stays for product analytics (funnels, cohorts, feature flags)
  - ClickHouse for raw event warehouse (custom SQL, business intelligence)
  - PostHog can forward events to ClickHouse via webhook
  - Cost: $200/month self-hosted ClickHouse (Hetzner, 8vCPU/32GB)

Stage 4 (Global): BigQuery or Snowflake
  - When you have multiple engineers running complex queries
  - dbt for data transformation
  - Metabase or Looker Studio for stakeholder dashboards
```

### Event Taxonomy (What to Track)

Every user action tracked with consistent naming from Day 1. Changing event names mid-stream breaks all historical cohort analysis.

```typescript
// packages/constants/src/analytics-events.ts

export const ANALYTICS_EVENTS = {
  // Session
  APP_OPENED: 'app_opened',
  APP_BACKGROUNDED: 'app_backgrounded',

  // Feed
  FEED_VIEWED: 'feed_viewed',
  FEED_CARD_IMPRESSION: 'feed_card_impression',
  FEED_CARD_TAPPED: 'feed_card_tapped',
  FEED_SCROLLED_TO_BOTTOM: 'feed_scrolled_to_bottom',

  // Map
  MAP_OPENED: 'map_opened',
  MAP_PIN_TAPPED: 'map_pin_tapped',
  MAP_CLUSTER_EXPANDED: 'map_cluster_expanded',
  MAP_FILTER_APPLIED: 'map_filter_applied',

  // Content
  LISTING_VIEWED: 'listing_viewed',
  LISTING_SAVED: 'listing_saved',
  LISTING_UNSAVED: 'listing_unsaved',
  LISTING_SHARED: 'listing_shared',        // includes which channel (WhatsApp, copy)
  LISTING_DIRECTIONS_TAPPED: 'listing_directions_tapped',
  LISTING_PHONE_TAPPED: 'listing_phone_tapped',

  // Events
  EVENT_VIEWED: 'event_viewed',
  EVENT_SAVED: 'event_saved',
  EVENT_SHARED: 'event_shared',
  EVENT_RSVP_TAPPED: 'event_rsvp_tapped',  // MMP
  EVENT_EXTERNAL_LINK_TAPPED: 'event_external_link_tapped',

  // Community
  POST_VIEWED: 'post_viewed',
  POST_CREATED: 'post_created',
  POST_PHOTO_ADDED: 'post_photo_added',

  // Retention signals
  NOTIFICATION_RECEIVED: 'notification_received',
  NOTIFICATION_OPENED: 'notification_opened',
  NOTIFICATION_DISMISSED: 'notification_dismissed',
  SEARCH_PERFORMED: 'search_performed',
  SEARCH_RESULT_TAPPED: 'search_result_tapped',
  SEARCH_NO_RESULTS: 'search_no_results',    // CRITICAL — track these

  // Business (supply side)
  BUSINESS_PROFILE_VIEWED: 'business_profile_viewed',
  BUSINESS_SPECIAL_VIEWED: 'business_special_viewed',
  BUSINESS_PHOTO_VIEWED: 'business_photo_viewed',
  LEAD_CONTACT_TAPPED: 'lead_contact_tapped',  // Connect tab providers
} as const;

// Every event includes these base properties automatically
interface BaseEventProps {
  userId: string;
  sessionId: string;
  cityId: string;
  clusterNeighborhood: string;
  appVersion: string;
  platform: 'ios' | 'android';
  timestamp: number;
}
```

### Retention Cohort Queries (The Metrics That Matter)

```sql
-- D7 Retention (the single most important MVP metric)
WITH cohort AS (
  SELECT
    user_id,
    DATE(created_at) AS cohort_date
  FROM users
  WHERE created_at >= '2026-04-01'
),
activity AS (
  SELECT DISTINCT
    user_id,
    DATE(created_at) AS activity_date
  FROM activity_logs
  WHERE event_type = 'app_opened'
)
SELECT
  c.cohort_date,
  COUNT(DISTINCT c.user_id) AS cohort_size,
  COUNT(DISTINCT a.user_id) AS retained_d7,
  ROUND(COUNT(DISTINCT a.user_id)::numeric / COUNT(DISTINCT c.user_id) * 100, 1) AS d7_retention_pct
FROM cohort c
LEFT JOIN activity a ON c.user_id = a.user_id
  AND a.activity_date = c.cohort_date + INTERVAL '7 days'
GROUP BY c.cohort_date
ORDER BY c.cohort_date;

-- Business performance (supply-side health)
SELECT
  b.name,
  b.city_id,
  b.trust_tier,
  COUNT(DISTINCT CASE WHEN al.event_type = 'listing_viewed' THEN al.session_id END) AS views_30d,
  COUNT(DISTINCT CASE WHEN al.event_type = 'listing_saved' THEN al.user_id END) AS saves_30d,
  COUNT(DISTINCT CASE WHEN al.event_type = 'listing_shared' THEN al.user_id END) AS shares_30d,
  COUNT(DISTINCT CASE WHEN al.event_type = 'listing_phone_tapped' THEN al.user_id END) AS calls_30d,
  b.is_featured,
  b.subscription_tier
FROM businesses b
LEFT JOIN activity_logs al ON al.entity_id = b.id
  AND al.created_at > NOW() - INTERVAL '30 days'
GROUP BY b.id
ORDER BY views_30d DESC;
```

### Business Analytics Dashboard Data

Each business on Business Pro gets their own stats. The API that powers it:

```typescript
// apps/api/src/analytics/business-analytics.service.ts

async getBusinessDashboard(businessId: string, period: '7d' | '30d' | '90d') {
  const [views, saves, shares, calls, searchAppearances, competitorBenchmark] =
    await Promise.all([
      this.getViewTrend(businessId, period),
      this.getSaveTrend(businessId, period),
      this.getShareTrend(businessId, period),
      this.getCallTrend(businessId, period),
      this.getSearchAppearances(businessId, period),
      this.getCategoryBenchmark(businessId, period), // How does this business rank in category?
    ]);

  return {
    summary: { views, saves, shares, calls, searchAppearances },
    trends: this.computeTrends({ views, saves, shares }),
    benchmark: competitorBenchmark,
    recommendations: this.generateRecommendations({ views, saves, shares, calls }),
    // "Your photos are 3 months old — businesses with recent photos get 2x more saves"
    // "Add a daily special — your competitors with specials get 40% more views"
  };
}
```

---

## 7. Billing and Monetization Scaling

### Stripe Architecture (Full Production)

```typescript
// Stripe product catalog — maps to docs/13-monetization-model.md pricing

const STRIPE_PRODUCTS = {
  // Supply-side (businesses)
  FEATURED_SPOT_WEEKLY: 'price_featured_spot_weekly',    // $75/week
  FEATURED_SPOT_MONTHLY: 'price_featured_spot_monthly',  // $275/month
  BUSINESS_PRO_MONTHLY: 'price_business_pro',            // $49/month
  BUSINESS_PRO_ANNUAL: 'price_business_pro_annual',      // $490/year
  VERIFIED_BUSINESS: 'price_verified_business',          // $99/year
  BOOSTED_EVENT_STANDARD: 'price_boosted_event_std',     // $25-75 one-time
  BOOSTED_EVENT_PREMIUM: 'price_boosted_event_premium',  // $150 one-time
  LEAD_PACKAGE: 'price_lead_package',                    // $79/month
  RAMADAN_CAMPAIGN: 'price_ramadan_campaign',            // $599/month (seasonal)
  FOUNDING_MEMBER: 'price_founding_member',              // $149 one-time, 20 slots
} as const;
```

### Stripe Webhook Handler (Critical — must be idempotent)

```typescript
// apps/api/src/billing/stripe-webhook.controller.ts

@Controller('webhooks/stripe')
export class StripeWebhookController {
  @Post()
  async handleWebhook(
    @Headers('stripe-signature') sig: string,
    @RawBody() payload: Buffer,
  ) {
    const event = this.stripe.webhooks.constructEvent(
      payload, sig, process.env.STRIPE_WEBHOOK_SECRET
    );

    // Idempotency: check if we've processed this event already
    const alreadyProcessed = await this.db.query(
      'SELECT id FROM processed_stripe_events WHERE stripe_event_id = $1',
      [event.id]
    );
    if (alreadyProcessed.rows.length > 0) return { received: true };

    await this.db.transaction(async (trx) => {
      switch (event.type) {
        case 'checkout.session.completed':
          await this.handleCheckoutComplete(event.data.object, trx);
          break;
        case 'customer.subscription.created':
        case 'customer.subscription.updated':
          await this.handleSubscriptionUpdate(event.data.object, trx);
          break;
        case 'customer.subscription.deleted':
          await this.handleSubscriptionCanceled(event.data.object, trx);
          break;
        case 'invoice.payment_failed':
          await this.handlePaymentFailed(event.data.object, trx);
          break;
        case 'invoice.payment_succeeded':
          await this.handlePaymentSucceeded(event.data.object, trx);
          break;
      }

      // Mark event processed within the same transaction
      await trx.query(
        'INSERT INTO processed_stripe_events (stripe_event_id, processed_at) VALUES ($1, NOW())',
        [event.id]
      );
    });

    return { received: true };
  }
}
```

### Subscription State Machine

```
Business subscription states:
  free → trialing (14-day trial for Founding Members)
  free → active (direct purchase)
  trialing → active (trial converts)
  trialing → canceled (trial ends, no payment)
  active → past_due (payment fails — 3 retry attempts over 7 days)
  past_due → active (payment recovers)
  past_due → canceled (all retries exhausted)
  active → canceled (user cancels via Customer Portal)

Dunning sequence (payment failure recovery):
  Day 0: Payment fails → email + WhatsApp: "Quick heads up — payment didn't go through"
  Day 3: Retry → email: "We tried again — update your card to keep your featured spot"
  Day 7: Final retry → email + WhatsApp: "Last chance — your featured placement pauses tomorrow"
  Day 8: Subscription canceled → listing downgraded → WhatsApp: "Your featured spot has paused"
  Day 9: Follow-up call from founder (for $275+/month accounts)

Grace period: 48h after cancellation before removing featured status from feed
  → Business often reactivates when they see they're no longer featured
```

### Revenue Reporting

```sql
-- MRR breakdown by tier and city (run weekly)
SELECT
  s.city_id,
  s.plan_type,
  COUNT(*) AS subscriber_count,
  SUM(s.monthly_amount) AS mrr,
  AVG(s.monthly_amount) AS avg_revenue_per_business
FROM subscriptions s
WHERE s.status = 'active'
GROUP BY s.city_id, s.plan_type
ORDER BY mrr DESC;

-- Churn rate by cohort
WITH cohort AS (
  SELECT
    DATE_TRUNC('month', started_at) AS cohort_month,
    COUNT(*) AS started
  FROM subscriptions GROUP BY 1
),
churned AS (
  SELECT
    DATE_TRUNC('month', started_at) AS cohort_month,
    COUNT(*) AS churned
  FROM subscriptions
  WHERE canceled_at IS NOT NULL
  GROUP BY 1
)
SELECT
  c.cohort_month,
  c.started,
  COALESCE(ch.churned, 0) AS churned,
  ROUND((1 - COALESCE(ch.churned, 0)::numeric / c.started) * 100, 1) AS retention_pct
FROM cohort c
LEFT JOIN churned ch USING (cohort_month)
ORDER BY cohort_month;
```

### Revenue Operations at Scale

```
Chicago MVP (< $10K MRR):
  - Manual Stripe + Zelle/Venmo hybrid
  - Founder handles all sales and renewals
  - Weekly WhatsApp check-in with all paying businesses

MMP ($10K–$50K MRR):
  - Stripe Self-Serve Checkout + Customer Portal (businesses manage their own subscriptions)
  - Automated dunning
  - 1 part-time account manager handles renewals and upsell conversations
  - HubSpot Free CRM for pipeline tracking

Production ($50K+ MRR):
  - Dedicated account managers per city cluster
  - Annual contracts with monthly billing (better cash flow, lower churn)
  - Volume discounts: 3+ locations = 15% off
  - Agency/franchise packages: mosque networks, halal restaurant chains
  - Revenue share option: instead of flat fee, some orgs prefer % of attributed leads
```

---

## 8. Support Tooling

### Support Stack by Stage

```
MVP: Founder + WhatsApp + email
  - Every business owner has the founder's WhatsApp
  - Response time: same day
  - No ticket system — personal relationships
  - Cost: founder's time only

MMP: Linear (bug tracking) + Intercom (user-facing)
  - Intercom in-app chat: users can message from within the app
  - Linear: engineering bugs and feature requests
  - WhatsApp broadcast: platform updates to all businesses
  - Response SLA: 24h for users, 4h for businesses
  - Cost: ~$100/month

Production: Intercom + Notion (internal KB) + Zapier automations
  - Self-service help center (Intercom Articles): "How do I update my hours?"
  - Deflection rate target: 60%+ questions answered by help center
  - Human escalation: 24h SLA for users, 4h for businesses, 1h for Tier 4+
  - Escalation path: Support → Community Manager → Founder (only for $275+/month accounts)
```

### Support Request Categories (Muzgram-Specific)

```
Business side (most common):
  1. "How do I update my hours / photos / description?"
  2. "My listing isn't showing on the map"
  3. "When does my featured placement expire?"
  4. "How do I claim my stub listing?"
  5. "Can I get a receipt for my subscription?"

User side:
  1. "I reported a listing that's not actually halal — what happens?"
  2. "My community post was removed, why?"
  3. "The app shows wrong location for [Business Name]"
  4. "I can't log in" (OTP issues)
  5. "I found an event but it's actually been canceled"

Automation opportunities:
  - "How do I update my hours?" → auto-reply with deep link to dashboard
  - OTP issues → auto-escalate to Clerk support
  - Listing not on map → auto-check listing status + moderation queue, reply with status
```

### Internal Knowledge Base Structure

```
Notion workspace (internal only):
  /operations
    /city-launch-playbook
    /business-onboarding-scripts
    /moderation-decisions (precedent log)
    /pricing-playbook
    /partner-agreements

  /engineering
    /incident-runbooks
    /database-migration-procedures
    /deployment-procedures
    /vendor-contacts (Clerk, Stripe, Mapbox emergency contacts)

  /support
    /common-questions-and-answers
    /escalation-matrix
    /refund-policy
    /business-removal-criteria
```

---

## 9. Operational Processes

### The Weekly Operating Rhythm

```
Monday (30 min):
  - Review weekend metrics: DAU, new registrations, new content, revenue
  - Check moderation queue: any escalations from the weekend?
  - Review search_no_results queries: what are users searching for that we don't have?

Wednesday (1 hour):
  - Call / WhatsApp 3 businesses from the current rotation
  - Check event calendar: anything coming up this weekend that should be promoted?
  - Review content quality: any anchor user who's gone silent?

Friday (30 min):
  - Send weekly stats WhatsApp to all paying businesses (automated by Week 3)
  - Review upcoming weekend events: anything worth a push notification?
  - Check listing accuracy: hours, specials, photos current?

Monthly:
  - Cohort analysis: D7, D30 retention trends
  - Business health check: who's at risk of churning?
  - Content audit: any neighborhoods thin on content?
  - Revenue review: MRR, new MRR, churned MRR, expansion MRR
```

### The Automated Weekly Business Report

Every business with an active listing gets this automatically every Monday morning.

```typescript
// apps/worker/src/reports/weekly-business-report.job.ts

@Cron('0 8 * * 1') // 8am every Monday, city-local time
async sendWeeklyBusinessReports() {
  const businesses = await this.businessService.getActiveListings();

  for (const business of businesses) {
    const stats = await this.analyticsService.getWeeklyStats(business.id);

    const message = this.formatWhatsAppReport(business, stats);
    // "📊 Sabri Nihari — Week of Apr 14
    //  👁 Views: 142 (↑23% vs last week)
    //  ❤️ Saves: 18 people saved your spot this week
    //  📞 Calls: 7 people tapped your number
    //  🔗 Shares: 4 people sent your listing to WhatsApp groups
    //  
    //  Tip: Your last photo update was 6 weeks ago.
    //  Businesses with recent photos get 2x more saves.
    //  Reply to add new photos."

    await this.whatsappService.send(business.ownerPhone, message);
  }
}
```

### City Launch Operations Checklist

```
T-30: Technical prep
  [ ] City record created in database
  [ ] Seed script run (100+ stub listings)
  [ ] Typesense collection initialized
  [ ] Founding member slots created (20 max)
  [ ] City-specific push notification topic created

T-30: Community prep
  [ ] Identify 5 anchor content creators in city
  [ ] Identify 3 anchor event organizers
  [ ] Identify 10 founding member business targets
  [ ] Draft founding member outreach sequence

T-14: Pre-launch outreach
  [ ] WhatsApp outreach to founding member targets
  [ ] Founding members receive early access link
  [ ] Anchor users invited to seed community posts
  [ ] Event organizers post first events

T-7: Content quality check
  [ ] Feed shows 20+ pieces of content without scrolling
  [ ] Map shows 30+ pins spread across clusters
  [ ] At least 3 events in the next 7 days
  [ ] All featured businesses have photos
  [ ] Business hours verified for 20+ businesses

T-0: Launch day
  [ ] launchStatus → 'active'
  [ ] Launch event (physical kickoff, 50+ people)
  [ ] Founder available all day for support
  [ ] Monitor: DAU, registrations, feed empty state rate, crashes
  [ ] Evening: share top community posts from launch day as social proof

T+7: Post-launch review
  [ ] D7 retention calculated
  [ ] Business claim rate measured
  [ ] Top user-reported issues resolved
  [ ] Stale or incorrect listings corrected
```

---

## 10. Trust and Safety Systems

### Trust Tier System (Production)

```typescript
// packages/types/src/trust.ts

export enum TrustTier {
  UNVERIFIED = 0,    // New user, no history
  BASIC = 1,         // Phone verified, 2+ weeks old, no violations
  ESTABLISHED = 2,   // Business or organizer, in-person verification initiated
  VERIFIED = 3,      // In-person verification complete, long track record
  ANCHOR = 4,        // Community leader, event organizer, mosque partner
}

export const TRUST_TIER_PERMISSIONS = {
  [TrustTier.UNVERIFIED]: {
    canPost: false,          // Must reach Tier 1 before posting
    contentAutoApproved: false,
    dailyPostLimit: 0,
    canReport: true,
    reportWeight: 0.2,
  },
  [TrustTier.BASIC]: {
    canPost: true,
    contentAutoApproved: false,  // All content goes through moderation
    dailyPostLimit: 3,
    canReport: true,
    reportWeight: 0.5,
  },
  [TrustTier.ESTABLISHED]: {
    canPost: true,
    contentAutoApproved: false,  // Photos scanned, text auto-approved
    dailyPostLimit: 10,
    canReport: true,
    reportWeight: 0.75,
    canRespondToReports: true,
  },
  [TrustTier.VERIFIED]: {
    canPost: true,
    contentAutoApproved: true,   // Async scan only, goes live immediately
    dailyPostLimit: 50,
    canReport: true,
    reportWeight: 1.0,
    canEditListings: true,
  },
  [TrustTier.ANCHOR]: {
    canPost: true,
    contentAutoApproved: true,
    dailyPostLimit: 200,
    canReport: true,
    reportWeight: 2.0,
    canFlagForReview: true,     // Their flags get immediate human review
    canSponsorNewUsers: true,   // Vouching system
  },
};
```

### Trust Tier Progression

```typescript
// Trust tier upgrades are automatic or manual

async function evaluateTrustTierUpgrade(userId: string): Promise<void> {
  const user = await userService.getWithHistory(userId);
  const currentTier = user.trustTier;

  // Tier 0 → Tier 1: automatic after account age + activity
  if (currentTier === 0) {
    const accountAgedays = differenceInDays(new Date(), user.createdAt);
    const hasActivity = await activityService.hasMinimumActivity(userId, {
      minViews: 5,
      minSaves: 1,
    });

    if (accountAgedays >= 14 && hasActivity && !user.hasViolations) {
      await upgradeTier(userId, 1, 'auto_age_and_activity');
    }
  }

  // Tier 1 → Tier 2: business or organizer submits verification request
  // Triggered manually by user, reviewed by community manager

  // Tier 2 → Tier 3: in-person verification complete
  // Triggered manually by admin after in-person check

  // Tier 3 → Tier 4: manually assigned by founder
  // Criteria: consistent high-quality content, community leadership, 6+ months
}
```

### Violation System

```sql
-- User violations (not punishments — a record of what happened)
CREATE TABLE user_violations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id),
  violation_type VARCHAR(100),  -- 'spam_post', 'false_report', 'nsfw_content', 'coordinated_inauthentic'
  content_id UUID,
  severity INTEGER,             -- 1=minor, 2=moderate, 3=severe
  action_taken VARCHAR(100),    -- 'warned', 'content_removed', 'posting_suspended_7d', 'banned'
  reviewed_by UUID,             -- admin user ID
  reviewed_at TIMESTAMPTZ,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Automatic actions based on violation history
-- 2 minor violations: warning
-- 1 moderate + 1 minor: 7-day posting suspension
-- 1 severe: immediate account review
-- 3 moderate: permanent ban
-- Any coordinated_inauthentic: immediate ban, all content removed
```

### Content Authenticity (Anti-Fake Review / Anti-Spam)

```
Specific threats for Muzgram:

1. Competitor sabotage — restaurant owner reports competitor's legitimate listing
   Defense: Report weight is trust-tier gated. Anonymous reports have 0.2 weight.
   Multiple low-trust reports don't auto-remove verified businesses.

2. Fake business listings — someone creates a fake restaurant or event to spam
   Defense: New business listings (Tier 0/1) don't appear in main feed until
   moderation approves. They appear on map after 24h auto-approval if no flags.

3. Coordinated spam — same business posts 20 "community posts" to flood feed
   Defense: Daily post limits by tier. Rate limiting on post creation endpoint.
   Feed composition: max 1 post per business per 6h in feed.

4. Fake events — event posted, no-shows, organizer disappears
   Defense: Events from Tier 0/1 users require manual approval.
   Tier 2+ events auto-approved but monitored.
   Post-event: if event had RSVP data and all RSVPs report it didn't happen →
   organizer trust tier reviewed.

5. Halal status manipulation — business falsely claims certified halal
   Defense: Halal certification badge only shown with valid IFANCA certification number.
   Unverified "owner claims halal" shown with different visual treatment.
   Community can flag inaccurate halal claims.
```

---

## 11. Infrastructure and Deployment

### Hosting Architecture by Stage

```
Stage 1 (MVP): Railway
  Services: 1 API container, 1 Worker container (both on Railway)
  Database: Railway PostgreSQL + PostGIS plugin
  Redis: Railway Redis
  Storage: Cloudflare R2 (always — never switch storage providers)
  CDN: Cloudflare (free tier handles most traffic)
  Cost: ~$50/month total
  Ops: Zero. Railway handles deploys, restarts, basic monitoring.

Stage 2 (MMP): Railway → Render or Fly.io
  Services: API (3 replicas, auto-scale), Worker (2 replicas)
  Database: Neon Serverless PostgreSQL (autoscale, branching for PR previews)
  Redis: Upstash Redis (serverless, per-request pricing)
  Search: Typesense on Hetzner VPS ($25/month, 2vCPU/4GB)
  Cost: ~$200/month
  Ops: Low. PR preview environments via Neon branching.

Stage 3 (Production, 5+ cities): Fly.io or AWS ECS
  Services: API (6 replicas, auto-scale), Worker (3 replicas), Admin (1 replica)
  Database: Neon Serverless (primary) + 2 read replicas
  Redis: Upstash Redis Cluster
  Search: Typesense 3-node cluster (Hetzner)
  Notifications: Dedicated notification service (Fly.io, always-on)
  CDN/Edge: Cloudflare Pro ($20/month) + Workers for edge logic
  Cost: ~$800/month
  Ops: GitOps via ArgoCD or Fly.io deploy targets

Stage 4 (Global): AWS or GCP multi-region
  Services: ECS Fargate (auto-scale, pay-per-use)
  Database: Neon + regional read replicas (or CockroachDB for global writes)
  Cache: ElastiCache Redis (regional)
  Analytics: ClickHouse on EC2 (dedicated, c5.2xlarge, ~$250/month)
  CDN: Cloudflare Enterprise (if volume warrants)
  Cost: $3,000–$8,000/month at US scale
```

### Containerization

```dockerfile
# apps/api/Dockerfile (production)
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json turbo.json ./
COPY packages/ ./packages/
COPY apps/api/ ./apps/api/
RUN npm ci --workspace=apps/api
RUN npm run build --workspace=apps/api

FROM node:20-alpine AS runner
WORKDIR /app
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nestjs
COPY --from=builder --chown=nestjs:nodejs /app/apps/api/dist ./dist
COPY --from=builder --chown=nestjs:nodejs /app/node_modules ./node_modules
USER nestjs
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=3s --start-period=10s \
  CMD wget -qO- http://localhost:3000/health || exit 1
CMD ["node", "dist/main.js"]
```

### GitOps Deployment Flow

```
Developer workflow:
  1. Feature branch → PR
  2. PR triggers:
     - Jest unit tests
     - TypeScript type check
     - ESLint
     - Neon branch created for PR (instant PostgreSQL preview)
     - Fly.io preview deployment (PR-specific URL)
  3. Manual QA on preview URL
  4. PR approved → merge to main
  5. Main merge triggers:
     - All tests run
     - Docker build + push to registry
     - Deploy to staging (auto)
     - Smoke tests on staging
     - Deploy to production (auto, unless smoke test fails)
  6. Production deployment:
     - Rolling deploy (zero downtime: new containers come up before old ones shut down)
     - Health check must pass before traffic routes to new container
     - Automatic rollback if health check fails

Database migrations:
  - NEVER run destructive migrations (DROP TABLE, DROP COLUMN) in the same deploy
  - Migration sequence:
    1. Deploy code that handles BOTH old and new schema (expand)
    2. Run migration (add new column/table)
    3. Verify application running correctly
    4. Remove old code path (contract)
    5. Later: DROP old column after 2 weeks of stable production
  - TypeORM migrations auto-run on startup (safe: additive only)
  - Destructive migrations: manual approval + off-hours execution
```

### Environment Management

```
Environment hierarchy:
  local → preview (per-PR) → staging → production

Environment variables:
  - Never in code, always in secrets manager
  - Railway: built-in secrets
  - Production: AWS Secrets Manager or Doppler (doppler.com)
  - Doppler syncs across local, CI, Railway, Fly.io without .env copy-pasting

Critical secrets to rotate quarterly:
  - CLERK_SECRET_KEY
  - STRIPE_SECRET_KEY / STRIPE_WEBHOOK_SECRET
  - DATABASE_URL (Neon rotates automatically)
  - MAPBOX_SECRET_TOKEN
  - GOOGLE_VISION_API_KEY
  - JWT_SECRET (internal service-to-service)

Secret rotation process:
  1. Generate new secret in provider (Clerk, Stripe, etc.)
  2. Add new secret to Doppler as CLERK_SECRET_KEY_V2
  3. Deploy code that accepts both V1 and V2
  4. Verify production running on V1+V2
  5. Remove V1 from Doppler
  6. Rename V2 → V1 in Doppler
  7. Deploy cleanup (code handles V1 only)
```

---

## 12. Observability and Monitoring

### The Three Pillars (OpenTelemetry)

```
OpenTelemetry as the instrumentation standard — vendor-agnostic,
ship to any backend (Grafana, Datadog, Honeycomb) without recoding.

Stack:
  Traces: OpenTelemetry → Grafana Tempo (self-hosted) or Honeycomb (SaaS)
  Metrics: OpenTelemetry → Prometheus → Grafana (or Datadog)
  Logs: Pino (structured JSON) → Loki → Grafana (or Datadog Logs)

All three correlated via trace_id — every log line includes the trace ID,
every trace includes the service name, every metric annotated with deployment.
```

### NestJS OpenTelemetry Setup

```typescript
// apps/api/src/main.ts — initialize BEFORE anything else

import { NodeSDK } from '@opentelemetry/sdk-node';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';
import { PrometheusExporter } from '@opentelemetry/exporter-prometheus';
import { NestInstrumentation } from '@opentelemetry/instrumentation-nestjs-core';
import { PgInstrumentation } from '@opentelemetry/instrumentation-pg';
import { RedisInstrumentation } from '@opentelemetry/instrumentation-redis-4';

const sdk = new NodeSDK({
  serviceName: 'muzgram-api',
  traceExporter: new OTLPTraceExporter({
    url: process.env.OTEL_EXPORTER_OTLP_ENDPOINT,
  }),
  metricReader: new PrometheusExporter({ port: 9464 }),
  instrumentations: [
    new NestInstrumentation(),
    new PgInstrumentation(),
    new RedisInstrumentation(),
    // Auto-instruments: HTTP, Express, Bull
  ],
});

sdk.start();

// Every DB query, Redis operation, HTTP request, Bull job now has traces.
// No manual instrumentation required for the happy path.
```

### Custom Business Metrics

```typescript
// packages/monitoring/src/metrics.ts
import { metrics } from '@opentelemetry/api';

const meter = metrics.getMeter('muzgram-business-metrics');

// Feed composition time (p95 should be < 200ms)
const feedCompositionDuration = meter.createHistogram('feed_composition_duration_ms', {
  description: 'Time to compose a user feed',
  unit: 'ms',
});

// Notification delivery rate
const notificationDeliveryCounter = meter.createCounter('notifications_delivered', {
  description: 'Push notifications successfully delivered',
});

const notificationFailureCounter = meter.createCounter('notifications_failed', {
  description: 'Push notifications that failed to deliver',
});

// Business content freshness (staleness indicator)
const businessContentAge = meter.createObservableGauge('business_content_age_days', {
  description: 'Days since business last updated any content',
});

// Content moderation queue depth
const moderationQueueDepth = meter.createObservableGauge('moderation_queue_depth', {
  description: 'Number of items pending moderation review',
});
```

### Alerting Rules (PagerDuty or Grafana Alerting)

```yaml
# Critical alerts (page founder / on-call immediately)
alerts:
  - name: APIErrorRate5xx
    condition: rate(http_requests_total{status=~"5.."}[5m]) > 0.05
    # > 5% of requests returning 5xx errors
    severity: critical
    channel: pagerduty

  - name: DatabaseConnectionExhausted
    condition: pg_stat_activity_count > 250
    # PostgreSQL approaching connection limit (warn before PgBouncer needed)
    severity: critical
    channel: pagerduty

  - name: FeedCompositionSlow
    condition: histogram_quantile(0.95, feed_composition_duration_ms) > 1000
    # P95 feed load > 1 second
    severity: critical
    channel: pagerduty

  - name: NotificationDeliveryRateLow
    condition: rate(notifications_delivered[10m]) / rate(notifications_sent[10m]) < 0.8
    # < 80% push notification delivery rate
    severity: warning
    channel: slack

# Warning alerts (Slack, fix next business day)
  - name: HighModerationQueueDepth
    condition: moderation_queue_depth > 50
    severity: warning
    channel: slack

  - name: BusinessContentStale
    condition: avg(business_content_age_days) > 14
    # Average business hasn't updated content in 2 weeks
    severity: warning
    channel: slack

  - name: SearchSyncLag
    condition: typesense_sync_lag_seconds > 300
    # Typesense more than 5 minutes behind PostgreSQL
    severity: warning
    channel: slack
```

### SLOs (Service Level Objectives)

```
API availability: 99.9% (8.7h downtime/year budget)
Feed composition P95: < 300ms
Map query P95: < 200ms
Push notification delivery: > 95%
Search response P99: < 100ms
Moderation review SLA: < 1h for community posts, < 4h for business listings

Error budget tracking:
  - Monthly error budget = 0.1% × 30 days × 24h = 43.2 minutes
  - Error budget consumed shown on Grafana dashboard
  - When 80% consumed → freeze non-critical deployments for the month
  - When 100% consumed → postmortem required before next deploy
```

### Incident Response Runbook

```
Severity 1 (production down, no users can access app):
  1. Post in #incidents Slack channel within 5 minutes
  2. Check Railway/Fly.io dashboard: container status, recent deploys
  3. Check PostgreSQL: connections, query performance, replication lag
  4. If recent deploy → rollback immediately (don't investigate, rollback first)
  5. If not deploy-related → check: Redis down? R2 down? Cloudflare down?
  6. Communicate to users if down > 15 minutes (status page or social)
  7. Resolution + postmortem within 48h

Severity 2 (feature broken, most users unaffected):
  1. Log in Linear with priority P1
  2. Investigate with full trace from Grafana
  3. Fix in < 4h during business hours
  4. Root cause documented in Linear

Postmortem format (keep it short):
  - What happened (2 sentences)
  - Timeline (bullet list)
  - Root cause (1 sentence)
  - What we're doing to prevent it (bullet list)
  - NOT: who's to blame
```

---

## 13. Security and Privacy

### Authentication Architecture

```
Current: Clerk phone OTP (correct choice for this user base)

What Clerk handles for us:
  - OTP delivery + verification
  - Rate limiting on OTP requests (built-in brute force protection)
  - Session management + JWT issuance
  - Device fingerprinting
  - Fraud detection

What we add on top:
  - Backend session validation on every request (no client-side trust)
  - Our own users table with clerkId as foreign key (user data stays ours)
  - Role-based access: user / business_owner / admin / super_admin
  - IP-based rate limiting independent of Clerk

JWT validation on every API request:
  @UseGuards(ClerkAuthGuard) // NestJS guard
  export class ClerkAuthGuard implements CanActivate {
    async canActivate(context: ExecutionContext): Promise<boolean> {
      const request = context.switchToHttp().getRequest();
      const token = request.headers.authorization?.replace('Bearer ', '');
      if (!token) throw new UnauthorizedException();

      // Verify JWT with Clerk's public key (cached, not an API call)
      const payload = await clerk.verifyToken(token);
      request.user = await this.userService.getByClerkId(payload.sub);
      return true;
    }
  }
```

### API Security

```typescript
// apps/api/src/app.module.ts — security middleware stack

// 1. Helmet — HTTP security headers
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      imgSrc: ["'self'", 'data:', '*.cloudflare.com', '*.r2.cloudflarestorage.com'],
      connectSrc: ["'self'", 'api.clerk.com', 'api.stripe.com'],
    },
  },
}));

// 2. CORS — only allow known origins
app.enableCors({
  origin: [
    'https://muzgram.com',
    'https://admin.muzgram.com',
    ...(isDev ? ['http://localhost:3000'] : []),
  ],
  credentials: true,
});

// 3. Request size limits — prevent large payload attacks
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ limit: '1mb', extended: true }));

// 4. Request ID — every request gets a UUID for tracing
app.use((req, res, next) => {
  req.id = req.headers['x-request-id'] as string ?? randomUUID();
  res.setHeader('x-request-id', req.id);
  next();
});
```

### Media Upload Security

```typescript
// Uploaded photos are a common attack vector — validate thoroughly

@Post('upload')
@UseGuards(ClerkAuthGuard)
async uploadPhoto(
  @UploadedFile() file: Express.Multer.File,
  @CurrentUser() user: User,
) {
  // 1. File type validation — check magic bytes, not just extension
  const type = await fileTypeFromBuffer(file.buffer);
  if (!['image/jpeg', 'image/png', 'image/webp'].includes(type?.mime ?? '')) {
    throw new BadRequestException('Invalid file type');
  }

  // 2. File size limit (enforced in Multer config AND here)
  if (file.size > 10 * 1024 * 1024) {
    throw new BadRequestException('File exceeds 10MB limit');
  }

  // 3. Strip EXIF data (contains GPS coordinates, device info)
  const stripped = await sharp(file.buffer)
    .rotate()    // Respect EXIF orientation, then strip
    .resize(2000, 2000, { fit: 'inside', withoutEnlargement: true })
    .jpeg({ quality: 85 })
    .toBuffer();

  // 4. Content moderation before storing
  await this.moderationService.scanImage(stripped);

  // 5. Upload to R2 with unique key (never user-controlled)
  const key = `photos/${user.id}/${randomUUID()}.jpg`;
  await this.r2.putObject({ Bucket: R2_BUCKET, Key: key, Body: stripped });

  return { url: `${CDN_BASE_URL}/${key}` };
}
```

### Data Privacy

```sql
-- Personal data inventory (know what you have and where it is)

-- Phone numbers: stored by Clerk, not in our DB (only clerkId)
-- Names: optional, stored in users.display_name
-- Location: approximate (neighborhood, not GPS coordinates)
-- GPS coordinates: computed in app, sent to API, NOT stored
--   → Only the city/neighborhood derived from GPS is stored
--   → Exception: business listing address (explicit, public)

-- Soft delete → hard delete pipeline (GDPR right to erasure)
CREATE TABLE user_deletion_requests (
  user_id UUID REFERENCES users(id),
  requested_at TIMESTAMPTZ DEFAULT NOW(),
  hard_delete_after TIMESTAMPTZ DEFAULT NOW() + INTERVAL '30 days',
  completed_at TIMESTAMPTZ
);

-- Job runs nightly: hard_delete users whose 30 days have elapsed
-- Deletes: users, activity_logs, saves, community_posts, interest_signals
-- Anonymizes: business listings created by user (keep content, remove author link)
-- Notifies: Clerk to delete phone/auth record
```

### SBOM and Supply Chain Security

```
Software Bill of Materials (SBOM) — know what's in your dependencies.

Generate SBOM on every build:
  npx @cyclonedx/cyclonedx-npm --output-file sbom.json

Dependency scanning in CI:
  - npm audit (catches known CVEs in dependencies)
  - Snyk or Dependabot for automated PR suggestions
  - Lock files committed: package-lock.json (never auto-update without reviewing)

Dependency update policy:
  - Patch versions: auto-merge if tests pass (Dependabot auto-merge enabled)
  - Minor versions: PR required, engineer reviews changelog
  - Major versions: tech lead review + manual testing required
  - Security patches: expedited review, merge within 48h

Third-party risk:
  - Clerk: SOC 2 Type II, GDPR compliant — acceptable
  - Stripe: PCI DSS Level 1 — acceptable (we never touch raw card data)
  - Google Vision: GCP data processing agreement — acceptable
  - Mapbox: standard SaaS — acceptable
  - Self-hosted Typesense: we control the data — ideal
```

---

## 14. Rate Limiting and Abuse Prevention

### Rate Limiting Architecture

```typescript
// apps/api/src/rate-limiting/rate-limiter.middleware.ts
// Using Redis for distributed rate limiting across API containers

import { RateLimiterRedis } from 'rate-limiter-flexible';

const rateLimiters = {
  // Per-IP, unauthenticated
  public: new RateLimiterRedis({
    storeClient: redisClient,
    keyPrefix: 'rl_public',
    points: 30,         // 30 requests
    duration: 60,       // per minute
    blockDuration: 300, // block for 5 min if limit hit
  }),

  // Per-user, authenticated (normal usage)
  authenticated: new RateLimiterRedis({
    storeClient: redisClient,
    keyPrefix: 'rl_auth',
    points: 120,        // 120 requests
    duration: 60,       // per minute
    blockDuration: 60,  // block for 1 min if limit hit
  }),

  // Strict: OTP requests (brute force protection)
  otp: new RateLimiterRedis({
    storeClient: redisClient,
    keyPrefix: 'rl_otp',
    points: 3,          // 3 OTP requests
    duration: 300,      // per 5 minutes
    blockDuration: 1800,// block for 30 min if limit hit
  }),

  // Post creation (prevent spam)
  postCreation: new RateLimiterRedis({
    storeClient: redisClient,
    keyPrefix: 'rl_post',
    points: 5,          // 5 posts
    duration: 3600,     // per hour (overridden by trust tier limits)
    blockDuration: 3600,
  }),

  // Upload (prevent storage abuse)
  upload: new RateLimiterRedis({
    storeClient: redisClient,
    keyPrefix: 'rl_upload',
    points: 20,         // 20 uploads
    duration: 3600,     // per hour
    blockDuration: 3600,
  }),
};

// Middleware: apply appropriate limiter based on request context
async function rateLimitMiddleware(req, res, next) {
  const limiter = req.user ? rateLimiters.authenticated : rateLimiters.public;
  const key = req.user?.id ?? req.ip;

  try {
    const result = await limiter.consume(key);
    res.setHeader('X-RateLimit-Remaining', result.remainingPoints);
    next();
  } catch (rejRes) {
    const retrySecs = Math.round(rejRes.msBeforeNext / 1000) || 1;
    res.setHeader('Retry-After', retrySecs);
    res.status(429).json({
      type: 'https://muzgram.com/errors/rate-limited',
      title: 'Too Many Requests',
      status: 429,
      retryAfter: retrySecs,
    });
  }
}
```

### Endpoint-Specific Limits

```typescript
// apps/api/src/main.ts — per-route rate limit overrides

// Feed: generous (primary use case, must feel fast)
// Limit: 60 requests/minute per user (1/sec sustained)
@Get('feed')
@UseInterceptors(new RateLimitInterceptor('feed', 60, 60))

// Search: moderate
// Limit: 30 searches/minute (1 every 2 seconds)
@Get('search')
@UseInterceptors(new RateLimitInterceptor('search', 30, 60))

// Post creation: strict (prevent spam)
// Limit: 5 posts/hour for Tier 0-1, 10 for Tier 2, 50 for Tier 3+
@Post('community-posts')
@UseInterceptors(new TrustTierRateLimitInterceptor('post_create', {
  0: { points: 0, duration: 3600 },   // Tier 0: can't post
  1: { points: 5, duration: 3600 },
  2: { points: 10, duration: 3600 },
  3: { points: 50, duration: 3600 },
  4: { points: 200, duration: 3600 },
}))

// Report submission: prevent false report bombing
// Limit: 10 reports/hour
@Post('reports')
@UseInterceptors(new RateLimitInterceptor('report_submit', 10, 3600))

// Business analytics: cache + limit (expensive queries)
// Limit: 10 requests/minute (data is cached 5min anyway)
@Get('analytics/business/:id')
@UseInterceptors(new RateLimitInterceptor('business_analytics', 10, 60))
```

### Abuse Detection Patterns

```typescript
// apps/worker/src/abuse/abuse-detection.service.ts

// Pattern 1: Coordinated fake saves (inflate a business's save count)
async detectFakeSaves(businessId: string) {
  const recentSaves = await db.query(`
    SELECT
      u.ip_address_hash,
      COUNT(*) FILTER (WHERE u.trust_tier = 0) AS tier0_saves,
      COUNT(*) AS total_saves,
      COUNT(DISTINCT u.device_fingerprint) AS unique_devices
    FROM saves s
    JOIN users u ON s.user_id = u.id
    WHERE s.listing_id = $1
      AND s.created_at > NOW() - INTERVAL '1 hour'
    GROUP BY u.ip_address_hash
    HAVING COUNT(*) > 5
  `, [businessId]);

  if (recentSaves.rows.some(r => r.tier0_saves > 3)) {
    await this.flagForReview(businessId, 'coordinated_fake_saves', recentSaves.rows);
  }
}

// Pattern 2: Account farm (many accounts from same device/IP)
async detectAccountFarm(userId: string) {
  const newUser = await userService.getWithMeta(userId);

  const sameIpUsers = await db.query(`
    SELECT COUNT(*) FROM users
    WHERE ip_address_hash = $1
      AND created_at > NOW() - INTERVAL '24 hours'
  `, [newUser.ipAddressHash]);

  if (sameIpUsers.rows[0].count > 5) {
    await this.escalate('account_farm_suspected', {
      ipHash: newUser.ipAddressHash,
      userId: newUser.id,
    });
  }
}

// Pattern 3: Rapid fire content (spam posts)
async detectSpamPosting(userId: string) {
  const recentPosts = await db.query(`
    SELECT COUNT(*) FROM community_posts
    WHERE user_id = $1
      AND created_at > NOW() - INTERVAL '10 minutes'
  `, [userId]);

  if (recentPosts.rows[0].count >= 5) {
    await this.suspendPosting(userId, 60 * 60, 'rapid_spam_posting');
  }
}
```

### DDoS and Infrastructure Protection

```
Layer 1 (Cloudflare):
  - Cloudflare Pro: bot management, DDoS mitigation, WAF
  - Rate limiting at edge (before request hits our servers)
  - Geo-blocking: if needed for OFAC compliance (sanctioned countries)
  - Challenge page for suspicious IPs

Layer 2 (Application):
  - Rate limiting per IP + per user (as documented above)
  - Request size limits (1MB max)
  - Connection timeouts: 30s request timeout, 10s DB query timeout

Layer 3 (Database):
  - PgBouncer prevents connection exhaustion attacks
  - Statement timeout: 10s max for any query
  - pg_stat_statements: track expensive queries for optimization

Specific Muzgram abuse scenarios:
  - Competitor scraping all businesses: rate limit + require auth for full listing data
  - Competing app scraping events: same — auth required, rate limited
  - Inflating competitor's report count: weighted reporting prevents this
  - Fake business creation to redirect competitors: moderation catches in 24h
```

---

## 15. Release Management Process

### Branching Strategy

```
main (always deployable)
  ↑ merge via PR only
feature/* (individual features)
fix/* (bug fixes)
release/* (MMP or major releases, rare)

Rules:
  - No direct commits to main
  - Every PR requires: passing CI, at least 1 approval (early stage: self-approve after review)
  - Feature flags control what users see — code can merge to main before feature is "released"
  - Rollback = re-deploy previous container image (< 5 minutes)
```

### Feature Flags

```typescript
// Feature flags control gradual rollouts without code deploys
// Using LaunchDarkly or open-source Unleash (self-hosted, $0)

// apps/api/src/feature-flags/feature-flag.service.ts

export class FeatureFlagService {
  async isEnabled(flag: FeatureFlag, context: FlagContext): Promise<boolean> {
    return this.unleash.isEnabled(flag, {
      userId: context.userId,
      cityId: context.cityId,
      trustTier: context.trustTier,
      // Custom strategy: enable for % of users in a city
    });
  }
}

// Example flags in use:
const FEATURE_FLAGS = {
  RAMADAN_MODE: 'ramadan-mode',                    // Enable for all cities during Ramadan
  REVIEWS_ENABLED: 'reviews-enabled',              // Per-city rollout
  BUSINESS_ANALYTICS_DASHBOARD: 'biz-analytics',  // Business Pro subscribers only
  JUMMAH_FINDER: 'jummah-finder',                  // Gradual rollout
  TYPESENSE_SEARCH: 'typesense-search',            // Switch search backend with no downtime
  STRIPE_CHECKOUT: 'stripe-checkout',              // Manual billing → Stripe migration
  HALAL_RADAR_WIDGET: 'halal-radar-widget',        // iOS/Android separately
  PEOPLE_MATCH_PREVIEW: 'people-match-preview',    // Tier 4 users only initially
} as const;

// Mobile app reads flags from API at app start — no app store submission required
// to turn a feature on or off for users
```

### Mobile App Release Strategy

```
App Store / Play Store release cycle:

MVP: Release when ready, no ceremony
  - Build: eas build --platform all --profile production
  - Submit: eas submit --platform all
  - Review: Apple ~24h, Google ~4h
  - Target: < 1 release per 2 weeks to avoid review fatigue

MMP: Controlled rollouts
  Apple:
    - Phased release: 1% day 1 → 2% day 3 → 5% → 10% → 50% → 100%
    - Monitor crash rate and reviews at each phase
    - Halt phase if crash rate > 0.5%
  Google:
    - Staged rollout: same percentages
    - Can rollback instantly (unlike Apple, which requires new build)

Production: Feature flags over app updates
  - Backend-driven UI: most "features" are controlled by API response
  - Minimize required app updates — every update = % of users on old version
  - Force update only when: security patch, breaking API change, critical bug
  - Deprecation window: old API versions supported for 90 days after new version

OTA updates (Expo EAS Update):
  - JavaScript-only changes deploy instantly, no app store
  - Use for: copy changes, color tweaks, non-native bug fixes, feature flag UI
  - Never use for: native module changes, new permissions, push notification config
  - Rollout: 10% → 50% → 100% with 30-minute monitoring windows between
```

### Release Checklist

```
Pre-release (every deploy):
  [ ] All tests pass (Jest unit + integration)
  [ ] TypeScript compiles with zero errors
  [ ] No new ESLint errors
  [ ] Database migrations reviewed (additive only? destructive = manual approval)
  [ ] Feature flags set correctly for this deploy
  [ ] Staging smoke test passes (automated: feed loads, map loads, auth works)

Major release (MMP features, city launches):
  [ ] Full regression test of core flows
  [ ] Load test: k6 script run against staging (simulates 500 concurrent users)
  [ ] All on-call contacts briefed
  [ ] Rollback procedure documented and tested
  [ ] Business notifications drafted (if user-visible change)
  [ ] Help center articles updated
  [ ] Status page updated (maintenance window if needed)
  [ ] Post-deploy monitoring: 2h heightened watch on error rates

Post-release:
  [ ] D1 metrics compared to baseline
  [ ] Crash-free rate in Sentry / Bugsnag (target: > 99.5%)
  [ ] Error rate in Grafana (target: < 0.1%)
  [ ] Any user reports via support channels?
  [ ] Release retrospective (brief — what went well, what to improve)
```

### Version Support Policy

```
API versioning:
  Current: /api/v1/* (all MVP endpoints)
  MMP: /api/v2/* (new endpoints) — v1 stays active
  Sunset policy: v1 sunset 90 days after v2 stable, with 60-day advance notice

Mobile versioning:
  Minimum supported version policy:
    - Force update if version > 6 months old
    - Recommend update if version > 2 months old
    - API returns Upgrade-Required header for deprecated mobile versions

Database versioning:
  - Schema version tracked in migrations table (TypeORM built-in)
  - Migration rollback scripts exist for every non-destructive migration
  - Destructive migrations: no rollback possible — feature flag guards the deploy
```

---

## Founder Summary

**The 10 things that matter most, in order:**

1. **Ship Stage 1.** The rest of this document only matters if you get to Stage 2. Run on Railway, one NestJS process, ship.

2. **city_id on every table from Day 1.** The schema decision you can't undo without a painful migration. Do it right the first time.

3. **Track events consistently from Day 1.** Use the ANALYTICS_EVENTS constants. Changing event names 6 months in destroys all your cohort data.

4. **Feature flags before features.** LaunchDarkly or Unleash from MMP. Turn features on per city, per user tier, with no code deploy.

5. **Rolling deploys = zero downtime.** Never take Muzgram down to deploy. Users don't tolerate it. Railway/Fly.io do this by default.

6. **The moderation pipeline must be automatic by the time you're in 3 cities.** One founder cannot manually review content for 3 cities. Trust tiers and AI moderation carry this.

7. **PostgreSQL can scale further than you think.** Read replicas + connection pooling + proper indexes takes you to 10M users. Don't panic into microservices early.

8. **Typesense is your search inflection point.** When users complain search is slow or inaccurate (> 500K rows), you switch. Not before. It's a 1-week project, not a crisis.

9. **ClickHouse for analytics when your PostHog bill exceeds $1K/month.** Not before. The migration is straightforward.

10. **The trust tier system is the only thing between you and moderation chaos at scale.** Every other safety measure is additive. This is foundational.

**The engineering hire sequence:**
- Solo founder → first hire: a React Native engineer (mobile is the product)
- Hire 2: a backend engineer who knows PostgreSQL deeply
- Hire 3: a community manager (not engineering — ops is the bottleneck at 3 cities)
- Hire 4: a second backend engineer when you hit Stage 3 scale

---

> Next doc: None pending. Full production plan complete.
> System docs now exist: 01 (vision) → 11 (execution) → 13 (monetization) → 15 (retention) → 16 (feed/content) → 17 (MMP) → 18 (brand identity) → 19 (this doc — production architecture)
