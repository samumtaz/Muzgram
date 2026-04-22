# Muzgram — Backend Architecture (MVP)

> Last updated: 2026-04-21
> Stack: NestJS · PostgreSQL + PostGIS · Redis · Cloudflare R2 · Expo Push · Bull · Clerk
> Monorepo location: `apps/api/`

---

## 1. Framework Recommendation — NestJS (Already Decided, Depth Added)

**Why NestJS is the right call for Muzgram specifically:**

| NestJS Strength | Why It Matters for Muzgram |
|---|---|
| Module system | Each of the 16 product modules maps 1:1 to a NestJS module — no spaghetti |
| Dependency injection | Services, repositories, and queues are wired declaratively — easy to test |
| Guard/Interceptor/Pipe pipeline | Role-based access, request validation, and logging are first-class primitives |
| Decorator-driven | `@Roles('admin')`, `@Public()`, `@CurrentUser()` — readable auth logic |
| TypeORM native integration | `@InjectRepository()` pattern, migrations, entities all in-box |
| Bull integration (`@nestjs/bull`) | Queue jobs live inside NestJS module system — not a separate process |
| OpenAPI auto-gen | `@nestjs/swagger` decorators on DTOs → free API docs for admin dev and mobile dev |

**The one tradeoff:** NestJS has more boilerplate than raw Express. For Muzgram's 16-module scope and a small team, the structure pays off in week 3 — not week 1. Accept it.

---

## 2. Folder Structure — `apps/api/src/`

```
apps/api/src/
│
├── main.ts                        # Bootstrap, global pipes, Swagger, CORS
├── app.module.ts                  # Root module — imports all feature modules
│
├── config/
│   ├── database.config.ts         # TypeORM DataSource config (reads DATABASE_URL)
│   ├── redis.config.ts            # Bull/Redis config
│   ├── storage.config.ts          # Cloudflare R2 config
│   ├── clerk.config.ts            # Clerk SDK init
│   └── app.config.ts              # All env vars typed and validated (class-validator)
│
├── database/
│   ├── migrations/                # TypeORM migration files (one file per schema change)
│   ├── seeds/                     # Seed scripts: chicago city, neighborhoods, test data
│   └── database.module.ts         # TypeOrmModule.forRootAsync()
│
├── shared/
│   ├── guards/
│   │   ├── clerk-auth.guard.ts    # Validates Clerk JWT on every protected route
│   │   ├── roles.guard.ts         # Checks user_role against @Roles() decorator
│   │   └── ownership.guard.ts     # Checks resource ownership (user owns this business?)
│   │
│   ├── decorators/
│   │   ├── current-user.decorator.ts   # @CurrentUser() — injects user from request
│   │   ├── roles.decorator.ts          # @Roles('admin', 'business_owner')
│   │   └── public.decorator.ts         # @Public() — skip auth guard
│   │
│   ├── interceptors/
│   │   ├── logging.interceptor.ts      # Structured request/response logging with correlation ID
│   │   ├── transform.interceptor.ts    # Wraps all responses in { data, meta } envelope
│   │   └── timeout.interceptor.ts      # Global 30s timeout on all requests
│   │
│   ├── filters/
│   │   └── http-exception.filter.ts    # Standardized error response shape
│   │
│   ├── pipes/
│   │   └── validation.pipe.ts          # Global class-validator pipe (whitelist: true)
│   │
│   ├── dto/
│   │   ├── pagination.dto.ts           # Cursor-based: { cursor, limit, direction }
│   │   └── geo-bounds.dto.ts           # { north, south, east, west } for map queries
│   │
│   └── utils/
│       ├── open-hours.util.ts          # isOpenNow(business_hours, timezone) → boolean
│       ├── feed-score.util.ts          # calculateFeedScore(recency, proximity, featured)
│       ├── distance.util.ts            # formatDistance(meters) → "0.3 mi away"
│       └── cursor.util.ts              # encode/decode opaque pagination cursors
│
├── modules/
│   ├── auth/
│   ├── users/
│   ├── geo/
│   ├── businesses/
│   ├── events/
│   ├── posts/
│   ├── feed/
│   ├── map/
│   ├── saves/
│   ├── leads/
│   ├── reports/
│   ├── media/
│   ├── notifications/
│   ├── promotions/
│   ├── admin/
│   ├── search/
│   ├── mosques/            # Bonus: Friday Finder
│   ├── ramadan/            # Bonus: Ramadan Mode
│   ├── notice-board/       # Bonus: Notice Board
│   ├── campaigns/          # Bonus: Campaign Engine
│   └── analytics/          # Analytics event tracking
│
└── health/
    └── health.controller.ts    # GET /health — DB + Redis liveness check
```

### Per-module structure (every module follows this)

```
modules/businesses/
├── businesses.module.ts          # Imports, providers, exports
├── businesses.controller.ts      # HTTP routes only — no business logic
├── businesses.service.ts         # Business logic — calls repository
├── businesses.repository.ts      # All SQL/TypeORM queries live here
├── dto/
│   ├── create-business.dto.ts    # POST body schema + class-validator decorators
│   ├── update-business.dto.ts    # PATCH body — extends PartialType(Create)
│   ├── business-query.dto.ts     # GET query params (city_id, category, lat, lng, radius)
│   └── business-response.dto.ts  # Response shape (excludes internal fields)
├── entities/
│   └── business.entity.ts        # TypeORM entity matching DB table exactly
└── businesses.service.spec.ts    # Unit tests on service layer (mock repository)
```

**Rule:** Controllers never touch the database. Services never build raw SQL. Repositories never contain if/else business logic.

---

## 3. Module Breakdown

### `auth/` — Authentication & Session

**Responsibility:** Validate Clerk JWT, upsert user on first login, attach user to request context.

```
GET  /auth/me              → current user profile (from Clerk token)
POST /auth/session         → upsert user on first app open (idempotent)
POST /auth/push-token      → register/update Expo push token
DELETE /auth/push-token    → deregister on logout
POST /auth/logout          → invalidate session record
DELETE /auth/account       → soft delete user (30-day grace period)
```

**Key design:** Clerk owns OTP and JWT issuance. Our API only validates. `ClerkAuthGuard` runs on every non-`@Public()` route, calls Clerk SDK to verify the bearer token, then loads the user row from our `users` table (or creates it on first call). The full user object is injected into `req.user`.

---

### `users/` — User Profiles

```
GET  /users/profile             → own profile
PATCH /users/profile            → update name, avatar, bio, neighborhood
GET  /users/:id/posts           → user's public posts
GET  /users/:id/events          → user's public events
```

**Rate limit on profile update:** 10 changes per hour per user (Redis counter).

---

### `geo/` — Location Utilities

```
GET  /geo/neighborhoods?city_id=   → list of neighborhoods for picker
GET  /geo/reverse?lat=&lng=        → reverse geocode → nearest neighborhood
POST /geo/geocode                  → address string → lat/lng (proxies Mapbox Geocoding API)
```

**Why a dedicated geo module:** Mapbox API key stays server-side. Mobile never touches the Mapbox secret token. The geo module is also a natural place to cache geocoding results in Redis (same address → same result, 30-day TTL).

---

### `businesses/` — Business Listings

```
GET    /businesses                         → list (filtered, paginated)
GET    /businesses/:id                     → single business
POST   /businesses                         → create (any logged-in user)
PATCH  /businesses/:id                     → update own listing
DELETE /businesses/:id                     → soft delete own listing
POST   /businesses/:id/claim               → initiate claim flow
GET    /businesses/:id/hours               → operating hours
GET    /businesses/:id/daily-specials      → today's specials
GET    /businesses/:id/stats               → view/save/lead counts (owner only)
```

**Roles:**
- `user` / `business_owner` → create, update own
- `moderator` / `admin` → update any, approve, reject
- Major field changes (address, name, halal status) → auto-set status back to `pending`

---

### `events/` — Events

```
GET    /events                  → list (filtered, paginated)
GET    /events/:id              → single event
POST   /events                  → create
PATCH  /events/:id              → update own
DELETE /events/:id              → soft delete
POST   /events/:id/cancel       → mark cancelled (triggers push to savers)
```

**Auto-approve rule:** users with 3+ previously approved events skip moderation queue (`users.auto_approve_events = true`). Set by admin.

---

### `posts/` — Community Posts

```
GET    /posts                   → list (city + neighborhood + category filter)
GET    /posts/:id               → single post
POST   /posts                   → create (rate limited: 5/hour)
DELETE /posts/:id               → delete own post
```

**Expiry:** Posts expire at `created_at + 7 days`. A Bull cron job sweeps expired posts nightly. Expired posts are soft-deleted, not fetched by feed queries (feed queries filter `expires_at > NOW()`).

---

### `feed/` — Now Feed & Explore Feed

```
GET /feed/now        → now feed (proximity + recency sorted, featured injected)
GET /feed/explore    → explore feed (category/subcategory filtered)
GET /feed/live       → live now strip (events happening right now + restaurants open now)
```

**No write operations in this module.** Feed is a read-only aggregation layer. It calls BusinessesRepository, EventsRepository, PostsRepository, and PromotionsRepository in parallel (`Promise.all`), then merges and scores results using `FeedScoreUtil`.

**Feed score formula:**
```typescript
score =
  recencyWeight(content.created_at)   // 20–100 points
  + proximityWeight(distance_meters)   // 0–50 points
  + (content.is_featured ? 200 : 0)    // Featured override
```

---

### `map/` — Map Pins

```
GET /map/pins?north=&south=&east=&west=&category=   → bounding box pin query
GET /map/clusters?zoom=&lat=&lng=&radius=           → clustering metadata
```

**Map pins response is lightweight:** `{ id, lat, lng, category, is_featured, is_live, name }`. No descriptions, no photos. Bottom sheet detail is fetched separately on tap via `/businesses/:id` or `/events/:id`.

**Clustering:** Done client-side by Mapbox for MVP. The API returns up to 200 raw pins. At >200 pins in viewport, API enforces clustering via a simplified grid-cell bucketing response. PostGIS `ST_Collect` + `ST_Centroid` per grid cell.

---

### `saves/` — Saved Items

```
GET    /saves                      → all saved items (paginated, by type)
POST   /saves                      → save item { target_type, target_id }
DELETE /saves/:target_type/:target_id  → unsave
GET    /saves/check/:target_type/:target_id  → is this saved? (boolean, for UI state)
```

**Polymorphic target types:** `business | event | community_post`

---

### `leads/` — Service Enquiry Leads

```
POST /leads                         → submit enquiry to a service provider
GET  /leads/inbox                   → business owner's incoming leads (business_owner role)
PATCH /leads/:id/read               → mark lead as read
```

**Rate limit:** Max 3 leads from same user to same provider per 7-day rolling window (Redis sorted set).

**On lead creation:** immediately enqueues a `SEND_LEAD_NOTIFICATION` job in Bull, which pushes to the business owner's Expo push token. Lead is also logged to `activity_logs`.

---

### `reports/` — Content Reporting

```
POST /reports    → report content { target_type, target_id, reason, description }
```

**Reasons:** `spam | inappropriate | incorrect_info | duplicate | hate_speech | other`

**On report creation:**
1. Report row inserted with `status: 'pending'`
2. If same content gets 3+ reports within 24h → auto-suspend content + notify admin (Bull job)
3. Admin sees report queue in dashboard

---

### `media/` — File Upload

See Section 5 for full upload flow.

```
POST /media/presign     → { key, uploadUrl, publicUrl } (pre-signed R2 PUT URL)
POST /media/confirm     → confirm upload completed, create media_asset record
DELETE /media/:id       → delete own media asset + R2 object
```

---

### `notifications/` — Push Notifications

```
GET   /notifications/preferences         → user's notification preferences
PATCH /notifications/preferences         → update quiet hours, type toggles
GET   /notifications/history             → recent notification history (last 50)
PATCH /notifications/:id/read            → mark individual notification as read
POST  /notifications/read-all            → mark all as read
```

**Notification sending is never done via HTTP.** All pushes are enqueued as Bull jobs — never inline in request handlers.

---

### `promotions/` — Featured Slots

```
GET   /promotions/slots                  → active featured slots by placement type
GET   /promotions/featured-content       → enriched featured content for feed injection
```

**Admin-only endpoints live in the `admin/` module.**

---

### `admin/` — Admin Dashboard API

```
# Moderation queue
GET    /admin/queue                              → all pending content (sorted oldest first)
PATCH  /admin/businesses/:id/approve
PATCH  /admin/businesses/:id/reject             → { reason }
PATCH  /admin/businesses/:id/feature            → { placement, ends_at }
PATCH  /admin/businesses/:id/halal-status       → { status }
PATCH  /admin/businesses/:id/claim-approve
PATCH  /admin/businesses/:id/claim-reject

PATCH  /admin/events/:id/approve
PATCH  /admin/events/:id/reject

PATCH  /admin/posts/:id/approve
PATCH  /admin/posts/:id/reject

# User management
GET    /admin/users
PATCH  /admin/users/:id/suspend
PATCH  /admin/users/:id/ban
PATCH  /admin/users/:id/set-auto-approve         → { events: bool, posts: bool }

# Featured slots
GET    /admin/featured-slots
POST   /admin/featured-slots                     → assign slot { business_id, placement, ends_at }
DELETE /admin/featured-slots/:id                 → remove from slot

# Reports
GET    /admin/reports                            → pending report queue
PATCH  /admin/reports/:id/resolve               → { action: 'dismiss'|'remove_content'|'suspend_user' }

# Analytics overview
GET    /admin/stats/overview                     → KPI snapshot
GET    /admin/stats/content                      → content counts by type + status
GET    /admin/stats/users                        → user acquisition by day
GET    /admin/stats/leads                        → lead volume by week
```

**All admin routes are gated by `@Roles('admin', 'super_admin')`** and a separate `AdminAuthGuard` that checks role from the database row (not just the JWT claim) — prevents stale role claims.

**Every admin action writes a `moderation_actions` record** (append-only audit log). This is a service-layer call, never optional.

---

### `search/` — Full-Text Search

```
GET /search?q=&city_id=&category=&lat=&lng=&radius=   → unified search results
```

**MVP:** PostgreSQL `tsvector` + GIN index. Query is sanitized (`plainto_tsquery`), limited to 20 results, filtered by city. Results are ranked by `ts_rank` + proximity weight.

**Upgrade path:** When any content table exceeds 500K rows, mirror to Typesense via a Bull `SYNC_SEARCH_INDEX` job on every create/update. The search module switches to Typesense client behind a feature flag. Zero schema changes required.

---

### `analytics/` — Event Tracking

```
POST /analytics/events     → log a client-side analytics event
```

See Section 10 for full analytics strategy.

---

## 4. Authentication Flow

### Clerk Phone OTP → Our Backend JWT

```
Mobile App                    Clerk                         Our API
─────────────────────────────────────────────────────────────────────
1. User enters phone number
2. POST to Clerk (SDK)  ──────→ Clerk sends SMS OTP
3. User enters OTP
4. Clerk validates      ──────→ Returns Clerk JWT (session token)
5.                                                POST /auth/session
6.                                               ←── { user, roles }
7. Store JWT in SecureStore
```

**On every subsequent API request:**
```
Mobile App                    Our API
──────────────────────────────────────
Authorization: Bearer <clerk_jwt>
                              ↓
                     ClerkAuthGuard.canActivate()
                              ↓
                     clerkClient.verifyToken(jwt)
                              ↓
                     Load user from DB (cached in Redis for 5min)
                              ↓
                     req.user = { id, role, status, ... }
                              ↓
                     RolesGuard checks @Roles() decorator
                              ↓
                     Route handler executes
```

### Role Hierarchy

```typescript
enum UserRole {
  USER              = 'user',           // Default. Browse, save, post community content.
  BUSINESS_OWNER    = 'business_owner', // + manage own listings, view leads inbox.
  MODERATOR         = 'moderator',      // + approve/reject content. Cannot manage users.
  ADMIN             = 'admin',          // + manage users, featured slots, all content.
  SUPER_ADMIN       = 'super_admin',    // + promote/demote roles, access all admin tools.
}
```

**Role assignment:**
- All new users start as `USER`
- Business claim approval → admin manually upgrades to `BUSINESS_OWNER`
- Moderator and above → only `SUPER_ADMIN` can grant

**Role checks in code:**

```typescript
// In controller
@Get('inbox')
@Roles('business_owner', 'admin')
getLeadsInbox(@CurrentUser() user: UserEntity) { ... }

// Dynamic ownership check (service layer)
if (business.owner_id !== user.id && !isAdmin(user)) {
  throw new ForbiddenException();
}
```

### User Status Guard

`SUSPENDED` and `BANNED` users receive `403 Forbidden` on every request. Checked in `ClerkAuthGuard` after user load — before any route handler runs.

---

## 5. Media Upload Flow — Cloudflare R2

**Why presigned URLs instead of server-side upload:**
- API server never buffers the file bytes — keeps memory low
- Upload goes mobile → R2 directly — no double-hop through server
- Presigned PUT URL expires in 5 minutes — prevents abuse
- On failure, no partial record in the DB (confirm step is separate)

```
Mobile App                    Our API                    Cloudflare R2
──────────────────────────────────────────────────────────────────────

Step 1: Request presign
POST /media/presign
{ owner_type: 'business', owner_id: '...', mime_type: 'image/jpeg', size_bytes: 1400000 }

   → API validates: mime_type must be image/*, size_bytes < 10MB
   → API generates R2 key: `media/{owner_type}/{owner_id}/{uuid}.jpg`
   → API calls R2 SDK: createPresignedUrl(key, 300s TTL)
   ← Returns: { key, uploadUrl, publicUrl }

Step 2: Upload directly to R2
PUT {uploadUrl}
Content-Type: image/jpeg
[raw bytes]
                                                       ← 200 OK

Step 3: Confirm upload
POST /media/confirm
{ key, owner_type, owner_id, sort_order }

   → API creates media_assets row
   → If first photo for business → sets businesses.cover_photo_url
   ← Returns: { id, public_url }
```

**R2 key structure:**
```
media/businesses/{business_id}/{uuid}.jpg
media/events/{event_id}/{uuid}.jpg
media/avatars/{user_id}/{uuid}.jpg
media/posts/{post_id}/{uuid}.jpg
```

**Image transformation:** Cloudflare Images (add in MMP). For MVP, mobile does client-side resize to max 1200px before requesting presign. Enforced by validating `size_bytes < 10MB` on the API side.

**Cleanup:** Orphaned media assets (confirm never called) are swept by a Bull cron job daily — any `media_assets` row with `confirmed_at IS NULL AND created_at < NOW() - 1 hour` is deleted, and the R2 object is purged.

---

## 6. Geolocation Query Flow

### Query 1: Now Feed (radius query)

```typescript
// FeedRepository
async getNowFeedItems(params: {
  lat: number;
  lng: number;
  radiusMeters: number;
  cityId: string;
  category?: string;
  cursor?: string;
  limit: number;
}): Promise<FeedItem[]>
```

Executes the PostGIS `ST_DWithin` query (see schema doc Section "Now Feed Query"). The repository returns raw results including `dist` (distance in meters). The service layer calls `FeedScoreUtil.score()` on each item and sorts by score descending. Featured items are merged in from `PromotionsRepository` as positions 1 and 2.

**Pagination:** Cursor is an opaque base64-encoded string of `{ last_score, last_id }`. Feed items are not purely offset-based — they use `WHERE (score, id) < (cursor_score, cursor_id)` keyset pagination. This prevents "page drift" when new featured content is inserted between requests.

### Query 2: Map Pins (bounding box)

```typescript
// MapRepository
async getPinsInBounds(params: {
  north: number; south: number; east: number; west: number;
  cityId: string;
  category?: string;
}): Promise<MapPin[]>
```

Uses `ST_MakeEnvelope` with `&&` operator (GIST fast path). Returns lightweight pin objects only. Hard cap of 200 pins — if query would return more, the API reduces to cluster metadata instead:

```typescript
if (rawPins.length > 200) {
  return this.getClusteredPins(bounds, cityId, gridSize: 0.01);
}
```

### Query 3: Distance labeling (utility function)

```typescript
// shared/utils/distance.util.ts
export function formatDistance(meters: number): string {
  if (meters < 160)   return 'Right here';
  if (meters < 800)   return `${(meters * 0.000621371).toFixed(1)} mi away`;
  if (meters < 3218)  return `${(meters * 0.000621371).toFixed(1)} mi away`;
  return `${(meters * 0.000621371).toFixed(0)} mi away`;
}
```

### Location Bias on All Queries

Every content query includes `city_id = $cityId` as the first filter condition — this hits the partial index (`idx_businesses_city_status`) before PostGIS even runs. PostGIS geo queries are fast but city_id filter eliminates 99%+ of rows instantly.

---

## 7. Caching Opportunities

**Redis is used for four distinct purposes:**

### 7a. Feed Cache (short TTL)

```typescript
// Key: feed:now:{city_id}:{lat_rounded}:{lng_rounded}:{category}
// TTL: 60 seconds
// Invalidated: on new content approval OR feature flag change

const cacheKey = `feed:now:${cityId}:${roundTo3Decimals(lat)}:${roundTo3Decimals(lng)}:${category}`;
const cached = await redis.get(cacheKey);
if (cached) return JSON.parse(cached);

const results = await this.feedRepository.getNowFeedItems(params);
await redis.setex(cacheKey, 60, JSON.stringify(results));
return results;
```

**Rounding lat/lng to 3 decimals (~100m cells) groups nearby users into shared cache entries.** Users within 100m see the same cached feed — reduces DB hits by ~80% in a dense area like Devon Ave.

### 7b. Map Pins Cache (medium TTL)

```typescript
// Key: map:pins:{city_id}:{category}:{bounds_hash}
// TTL: 120 seconds
// Invalidated: on content approval in that city
```

Map pins change infrequently. 2-minute cache is safe.

### 7c. User Session Cache (medium TTL)

```typescript
// Key: user:session:{clerk_user_id}
// TTL: 300 seconds (5 minutes)
// Invalidated: on role change, status change, suspension
```

Every API request loads the user row. Without caching, that's a DB round-trip per request. Cache the user for 5 minutes. On admin actions that change user status/role, explicitly `DEL user:session:{id}`.

### 7d. Rate Limit Counters

```typescript
// Key: ratelimit:posts:{user_id}    → INCR + EXPIREAT (1 hour window)
// Key: ratelimit:leads:{user_id}:{business_id}   → weekly rolling window
// Key: ratelimit:otp-resend:{phone}   → 60s cooldown
```

All rate limits use Redis atomic INCR + EXPIREAT. No DB writes needed.

### 7e. Geocode Cache

```typescript
// Key: geocode:{address_hash}   → { lat, lng, neighborhood_id }
// TTL: 30 days
```

Same address always returns same coordinates. Cache aggressively.

### 7f. Prayer Time Cache

`prayer_time_cache` table in DB is the primary store (already in schema). Redis caches today's prayer times per city:

```typescript
// Key: prayer:{city_id}:{YYYY-MM-DD}
// TTL: until end of day
```

---

## 8. Background Jobs — Bull Queue

**Queue names and job types:**

```typescript
// queues/notification.queue.ts
SEND_NEARBY_EVENT_PUSH      // Triggered: event approved, notify users within 3mi
SEND_LEAD_PUSH              // Triggered: lead submitted
SEND_EVENT_DAY_REMINDER     // Scheduled: 8am on event day for all savers
SEND_EVENT_CANCELLED_PUSH   // Triggered: event cancelled
SEND_LISTING_APPROVED_PUSH  // Triggered: admin approves business/event
SEND_WELCOME_PUSH           // Delayed: 24h after signup if not reopened

// queues/moderation.queue.ts
AUTO_SUSPEND_REPORTED_CONTENT  // Triggered: 3rd report on same content within 24h
FLAG_DISPLAY_NAME              // Triggered: user profile update with potentially offensive name

// queues/content.queue.ts
EXPIRE_COMMUNITY_POSTS         // Cron: nightly, soft-delete expired posts
EXPIRE_PROMOTIONS              // Cron: nightly, deactivate ended featured slots
HARD_DELETE_SOFT_DELETED       // Cron: daily, permanently delete records >30d old
CLEANUP_ORPHANED_MEDIA         // Cron: daily, delete unconfirmed media_assets
REFRESH_OPEN_STATUS            // Cron: every 15min, update businesses.is_open_now flag

// queues/analytics.queue.ts
FLUSH_ANALYTICS_EVENTS         // Cron: every 5min, batch-insert analytics events to DB
SEND_WEEKLY_BUSINESS_SUMMARY   // Cron: Monday 8am, WhatsApp summary to business owners (MMP)

// queues/search.queue.ts  [MMP — ready to add]
SYNC_SEARCH_INDEX              // Triggered: content create/update, syncs to Typesense
```

### Bull Job Configuration

```typescript
// All notification jobs
const notificationJobOptions: JobOptions = {
  attempts: 3,
  backoff: { type: 'exponential', delay: 2000 },
  removeOnComplete: 100,   // keep last 100 completed jobs for debugging
  removeOnFail: 500,       // keep last 500 failed jobs
};

// Cron jobs — idempotent by design, safe to retry
const cronJobOptions: JobOptions = {
  repeat: { cron: '0 2 * * *' },  // 2am daily
  jobId: 'expire-posts',           // prevents duplicate scheduling on restart
};
```

### Notification Rate Limiting (quiet hours)

Before sending any push, the notification processor checks:

```typescript
const prefs = await this.notifPreferencesRepo.get(userId);
const hour = getCurrentHourInTimezone(prefs.timezone);
if (hour >= 22 || hour < 7) {
  // Delay job until 7am instead of dropping it
  await this.notifQueue.add(job.name, job.data, {
    delay: msUntil7am(prefs.timezone),
  });
  return;
}
```

---

## 9. Deployment-Ready Architecture

### Environments

```
local/      → docker-compose: Postgres + PostGIS, Redis, Adminer
staging/    → Railway or Render (single container, shared DB)
production/ → AWS ECS (Fargate) or Railway Pro
```

### Production Topology (MVP → Scale-Ready)

```
                    ┌─────────────────────────────────┐
                    │         CloudFlare CDN            │
                    │  (media.muzgram.com → R2)         │
                    └─────────────────────────────────┘

Mobile App + Admin Web
        │
        ▼
┌───────────────────┐
│   AWS ALB / Nginx  │   (terminates TLS, rate limits by IP)
└─────────┬─────────┘
          │
          ▼
┌─────────────────────────────┐
│   NestJS API (ECS Fargate)   │  ← 1 task for MVP, scale to N tasks
│   Port 3000                  │
│   2 vCPU / 2GB RAM           │
└────┬────────────────┬────────┘
     │                │
     ▼                ▼
┌──────────┐    ┌──────────────┐
│ Postgres  │    │    Redis      │
│  (RDS)    │    │ (ElastiCache) │
│ PostGIS   │    │               │
└──────────┘    └──────────────┘

Same NestJS container runs Bull workers (processQueues: true in config).
At scale: separate worker containers with HTTP disabled, queue processing only.
```

### Docker setup

```dockerfile
# apps/api/Dockerfile
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json turbo.json ./
COPY apps/api/package.json ./apps/api/
RUN npm ci
COPY . .
RUN npx turbo build --filter=api

FROM node:20-alpine AS runner
WORKDIR /app
COPY --from=builder /app/apps/api/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
EXPOSE 3000
CMD ["node", "dist/main.js"]
```

### Health checks

```typescript
// health/health.controller.ts
@Get('/health')
@Public()
async check() {
  const dbOk = await this.db.query('SELECT 1');
  const redisOk = await this.redis.ping();
  return {
    status: dbOk && redisOk ? 'ok' : 'degraded',
    db: dbOk ? 'up' : 'down',
    redis: redisOk ? 'up' : 'down',
    version: process.env.APP_VERSION,
    timestamp: new Date().toISOString(),
  };
}
```

ALB health check target: `GET /health`. If DB is down, return 503 → ALB stops routing traffic to this instance.

### Structured Logging

Every log line includes a correlation ID (UUID generated per request in `LoggingInterceptor`), attached to `AsyncLocalStorage` so it's accessible anywhere in the call stack without thread-local hacks.

```typescript
// Every log entry shape
{
  level: 'info' | 'warn' | 'error',
  correlationId: 'a1b2c3-...',
  method: 'GET',
  path: '/feed/now',
  userId: 'user_abc',
  durationMs: 142,
  message: 'Feed query completed',
  meta: { itemCount: 20, cacheHit: true }
}
```

Log to stdout (CloudWatch in production), consume with Datadog or Grafana Cloud.

### API Versioning

All routes prefixed `/v1/`. The global prefix is set in `main.ts`:

```typescript
app.setGlobalPrefix('v1');
```

When breaking changes are needed: add `/v2/` routes alongside `/v1/`. Never remove v1 until all mobile clients on ≥ the new min app version (tracked via `X-App-Version` header). For MVP this is academic — just build the habit now.

### Response Envelope

Every API response is wrapped by `TransformInterceptor`:

```json
{
  "data": { ... },
  "meta": {
    "cursor": "eyJsYXN0...",
    "hasMore": true,
    "total": null
  }
}
```

Error responses from `HttpExceptionFilter`:

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "title must be shorter than 120 characters",
    "statusCode": 400,
    "correlationId": "a1b2c3-..."
  }
}
```

---

## 10. Analytics Event Tracking Strategy

**MVP principle:** Collect everything, query later. Don't build dashboards now — build the data pipeline.

### Client-side event batching

Mobile sends events in batches every 30 seconds (or on app background) via `POST /analytics/events`. Events never block UI — fire-and-forget from mobile.

```typescript
// POST /analytics/events
{
  "events": [
    {
      "event_name": "feed_card_tapped",
      "properties": {
        "target_type": "business",
        "target_id": "uuid",
        "position": 3,
        "category": "food",
        "is_featured": false
      },
      "occurred_at": "2026-04-21T12:34:56Z"
    }
  ]
}
```

### Events to track (MVP priority)

```
# Discovery
feed_viewed            → { city_id, category, item_count }
feed_card_tapped       → { target_type, target_id, position, is_featured }
map_opened             → { zoom_level, center_lat, center_lng }
map_pin_tapped         → { target_type, target_id, distance_m }
explore_category_tapped → { category, subcategory }

# Engagement
save_toggled           → { target_type, target_id, action: 'save'|'unsave' }
share_tapped           → { target_type, target_id, channel: 'whatsapp'|'other' }
directions_tapped      → { target_id, business_type }
call_tapped            → { target_id }
lead_submitted         → { provider_id, service_category }

# Content
post_created           → { post_type, has_image, neighborhood_id }
event_created          → { category, is_free }
business_created       → { business_type }

# Retention
app_opened             → { source: 'direct'|'push'|'deep_link', push_type? }
session_ended          → { duration_seconds, screens_visited }

# Monetization
featured_slot_viewed   → { placement, business_id }
```

### Storage

Analytics events land in `activity_logs` (partitioned by month — already designed). Heavy analytics (search patterns, heatmaps) should move to BigQuery or ClickHouse at MMP stage — the raw events are already collected, so the migration is a backfill, not a rebuild.

### Halal Radar Sessions

`halal_radar_sessions` tracks every "hungry right now" search: `{ user_id, lat, lng, radius, result_count, result_ids[], clicked_id }`. This is the highest-value product signal for understanding which restaurants convert.

---

## 11. Moderation & Reporting Workflow

### Content lifecycle

```
User creates content
        ↓
status = 'pending'   (immediately visible to owner, invisible to public)
        ↓
Admin sees in queue (sorted oldest first, SLA: Events+Posts <1h, Businesses <4h)
        ↓
  [Approve]          [Reject]           [Edit & Approve]
      ↓                  ↓                      ↓
status = 'approved'  status = 'rejected'   admin edits → status = 'approved'
Push to owner         Push with reason       Push to owner
```

**Auto-approve conditions (set per user by admin):**
- `users.auto_approve_events = true` → user has 3+ previously approved events
- `users.auto_approve_posts = true` → user has 5+ previously approved posts

**Major edits on approved content restart the cycle:**
- Address change → back to `pending` (re-geocoding required)
- Name change → back to `pending`
- Halal status claim change → back to `pending`
- Minor edits (phone, hours, photos) → stay `approved`, live immediately

### Report workflow

```
User taps Report → reason + optional description
        ↓
reports row created { status: 'pending' }
        ↓
Bull: CHECK_REPORT_THRESHOLD job
        ↓
  3+ reports on same content in 24h?
  YES → auto-suspend content + Slack/push to admin + insert moderation_actions record
  NO  → sits in admin queue
        ↓
Admin reviews report queue
        ↓
  [Dismiss]           [Remove Content]           [Suspend User]
  status='dismissed'  content soft_deleted        user status='suspended'
                      moderation_actions record    push to user ("account suspended")
```

**Every moderation_actions record is append-only and includes:**
- `admin_id`, `action_type`, `target_type`, `target_id`, `reason`, `created_at`
- No updates, no deletes — full audit trail always available

### Content auto-expiry (not moderation, but related)

```
Community posts → expires_at = created_at + 7 days  → cron soft-deletes nightly
Notice board posts → expires_at = created_at + 30 days → same cron
Promotions → ends_at checked by cron → status = 'expired', is_featured = false
```

---

## 12. What to Design Differently at Production Scale

These are correct for MVP. Change them when the signal below is hit.

| Current Design | Change When | Change To |
|---|---|---|
| Single NestJS container (API + Bull workers) | >500 req/s OR queue lag >30s | Separate API containers + dedicated worker containers (no HTTP) |
| PostgreSQL FTS with tsvector | >500K rows in any content table | Typesense cluster — mirror via `SYNC_SEARCH_INDEX` Bull job |
| Redis single node | >100K concurrent users | Redis Cluster (3 shards) or Upstash Redis with replication |
| activity_logs in same Postgres | >5M rows (~6 months traffic) | Detach to TimescaleDB or BigQuery via `pg_partman` |
| Notification queue in same Bull | >10K pushes/day | Dedicated notification microservice with its own Redis + DB |
| Media served from R2 directly | >1M requests/day | Add Cloudflare Images for on-the-fly resizing + WebP conversion |
| Feed built from 3 parallel queries | >50K items per city | Pre-computed feed via materialized view refreshed every 60s |
| User session cache 5min TTL | Role changes feel slow | Event-driven cache invalidation via Postgres LISTEN/NOTIFY |
| All PostGIS queries on primary DB | Read replica added | Route all `SELECT` queries to replica; writes to primary only |
| Manual moderation only | >500 content submissions/day | Add AWS Rekognition for image scanning + simple spam heuristics |
| Single city, hardcoded | Second city launch | City config table + city-aware caching keys (already designed in schema) |
| No API rate limiting by IP | Scrapers or abuse detected | Add `express-rate-limit` with Redis store at the Nginx/ALB layer |
| Polling-based feed refresh | Need real-time feel | Server-sent events (SSE) for live now strip — long-poll for feed |

---

## 13. Environment Variables — Full Reference

```env
# ─── Core ───────────────────────────────
NODE_ENV=production
PORT=3000
APP_VERSION=0.1.0

# ─── Database ───────────────────────────
DATABASE_URL=postgresql://user:pass@host:5432/muzgram?sslmode=require
DATABASE_POOL_MIN=2
DATABASE_POOL_MAX=10

# ─── Redis ──────────────────────────────
REDIS_URL=redis://localhost:6379
REDIS_KEY_PREFIX=muzgram:

# ─── Auth (Clerk) ───────────────────────
CLERK_SECRET_KEY=sk_live_...
CLERK_PUBLISHABLE_KEY=pk_live_...

# ─── Storage (Cloudflare R2) ────────────
R2_ACCOUNT_ID=abc123
R2_ACCESS_KEY_ID=...
R2_SECRET_ACCESS_KEY=...
R2_BUCKET_NAME=muzgram-media
R2_PUBLIC_URL=https://media.muzgram.com
R2_PRESIGN_TTL_SECONDS=300

# ─── Maps (Mapbox) ──────────────────────
MAPBOX_SECRET_TOKEN=sk.ey...

# ─── Push Notifications (Expo) ──────────
EXPO_ACCESS_TOKEN=...

# ─── Monitoring ─────────────────────────
SENTRY_DSN=https://...@sentry.io/...
LOG_LEVEL=info

# ─── Feature Flags ──────────────────────
FEATURE_SEARCH_TYPESENSE=false
FEATURE_RAMADAN_MODE=false
FEATURE_FRIDAY_FINDER=false

# ─── Business rules ─────────────────────
LEAD_RATE_LIMIT_PER_WEEK=3
POST_RATE_LIMIT_PER_HOUR=5
MAX_MEDIA_SIZE_BYTES=10485760
FEED_DEFAULT_RADIUS_METERS=8000
FEED_MAX_RADIUS_METERS=24000
MAP_MAX_PINS=200
SOFT_DELETE_GRACE_DAYS=30
```

---

## 14. Module Dependency Map

```
                        ┌──────────┐
                        │   auth   │  (every module depends on this)
                        └────┬─────┘
              ┌──────────────┼──────────────┐
              ▼              ▼              ▼
         ┌────────┐    ┌──────────┐   ┌──────────┐
         │ users  │    │   geo    │   │  media   │
         └────────┘    └──────────┘   └──────────┘
              │              │
    ┌─────────┼──────────────┤
    ▼         ▼              ▼
┌──────────┐ ┌────────┐ ┌────────┐
│businesses│ │ events │ │ posts  │  ← content modules
└────┬─────┘ └───┬────┘ └───┬────┘
     │           │           │
     └─────┬─────┴───────────┘
           ▼
    ┌─────────────┐    ┌────────────┐    ┌──────────┐
    │    feed     │    │    map     │    │  search  │
    └─────────────┘    └────────────┘    └──────────┘

    ┌──────┐  ┌───────┐  ┌─────────┐  ┌──────────────┐
    │saves │  │ leads │  │ reports │  │notifications │
    └──────┘  └───────┘  └─────────┘  └──────────────┘

    ┌────────────┐   ┌────────────┐   ┌───────────┐
    │ promotions │   │   admin    │   │ analytics │
    └────────────┘   └────────────┘   └───────────┘
```

`feed` depends on `businesses`, `events`, `posts`, `promotions`.
`admin` depends on `businesses`, `events`, `posts`, `users`, `promotions`, `reports`.
`notifications` depends on all content modules (triggered by their events).

---

## 15. My Additions & Enhancements

Things not in the original product spec that I'm recommending you build from day one:

**1. Feature flags via env vars**
`FEATURE_RAMADAN_MODE=false` — flip to `true` when Ramadan starts. No deploy needed. Ramadan mode module is already built, just inactive. Same pattern for Friday Finder.

**2. `X-App-Version` header on all mobile requests**
Log it via `LoggingInterceptor`. When you push a breaking API change in MMP, you'll know exactly how many devices are still on the old version. This takes 5 minutes to add and saves weeks of pain later.

**3. Idempotency keys on lead creation**
`POST /leads` accepts an `X-Idempotency-Key` header. Stored in Redis for 24h. Double-tapping "Send Enquiry" on a slow connection never creates duplicate leads. Business owners trust the platform more.

**4. `business.contact_tap_count` increment on Call/WhatsApp tap**
No analytics pipeline needed. A single `UPDATE businesses SET contact_tap_count = contact_tap_count + 1 WHERE id = $id` on `GET /businesses/:id/contact` is the minimum viable "proof of value" stat for businesses. Show it in the admin panel as "calls driven this week."

**5. Seed script as a first-class citizen**
`apps/api/src/database/seeds/chicago.seed.ts` — not a one-off throwaway. It should be runnable any time and be idempotent (`ON CONFLICT DO NOTHING`). Devon Ave businesses, neighborhoods, and promotion_plans should all be in here. This is your local dev setup, your staging setup, and your "demo to a business owner on your laptop" setup.

**6. OpenAPI spec auto-generated**
Add `@nestjs/swagger` decorators to every DTO. Auto-generate the spec file on build. The mobile dev and admin dev work from this spec — not from Notion docs. Changes to the API are immediately visible in the spec. Single source of truth.

**7. `POST /analytics/events` is always 200**
Never return an error on analytics events. If Redis is down, still return 200. Analytics failures should never interrupt the user experience. Fire and forget, swallow errors silently, log internally.

**8. Timezone-aware open/closed in the API, not just the client**
The `isOpenNow` utility runs in the API for every search query with an "Open Now" filter. But also expose it as a computed field `is_open_now: boolean` on every business response. Mobile renders this field. The API recalculates it — it's not cached because it changes every minute. This is a 2ms calculation.

**9. `DELETE /auth/account` has a 30-second undo window**
After account deletion is requested, don't set `deleted_at` immediately. Enqueue a Bull job with a 30-second delay. If the same user makes any authenticated request in those 30 seconds (common: accidental tap), cancel the job. After 30 seconds, the job executes and sets `deleted_at`. Users trust you more when you treat their data carefully.

**10. Correlation IDs propagated to Bull jobs**
When a request triggers a Bull job (e.g., lead creation triggers a push notification), pass the `correlationId` into the job data. Log it in the job processor. Now you can trace a complete request → job → push delivery in your logs. Critical for debugging "why didn't I get the notification for that lead?"

---

*Architecture designed for: Devon Ave, Chicago. 500 users. 40 businesses. 8 weeks to launch. Scales to 50K users without a rewrite.*
