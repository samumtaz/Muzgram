# Muzgram — Engineering Execution Plan

> Last updated: 2026-04-21
> Scope: MVP launch — Devon Ave corridor, Chicago
> Team: 1–2 engineers + founder
> Total timeline: 10 sprints (~10 weeks)

---

## How to Read This Plan

Each sprint is self-contained with:
- **Objective** — the single North Star for the sprint
- **Deliverables** — broken into Backend / Mobile / Admin / Database / Testing tracks
- **Dependencies** — what must be true before the sprint starts
- **Acceptance Criteria** — testable gates, not vague goals
- **Risk Flags** — what can derail the sprint and how to mitigate
- **Definition of Done** — checklist to close the sprint

Sprints run in parallel across tracks where possible. Explicit sync points are marked **[SYNC]**.

---

## Team Role Matrix

| Role | Responsibility |
|---|---|
| **Backend Engineer** | NestJS API, database migrations, Redis, Bull queues, media, notifications |
| **Mobile Engineer** | Expo / React Native, screens, components, hooks, stores, API integration |
| **Founder (Atif)** | Admin dashboard (Weeks 8–9), seed data, business outreach, QA sign-off, App Store |
| **All** | PR reviews, acceptance criteria sign-off, launch readiness |

For a solo founder phase: backend first (Sprints 0–4), then mobile (Sprints 5–7), then admin + launch (Sprints 8–10).

---

## Third-Party Services — Account Setup Checklist

Complete before Sprint 1 starts. These are blockers.

- [ ] **Clerk** — create app, enable phone OTP, get publishable + secret keys
- [ ] **Supabase** (or Railway) — PostgreSQL instance, enable PostGIS extension
- [ ] **Upstash** (or Railway) — Redis instance, get connection URL
- [ ] **Cloudflare R2** — create bucket `muzgram-media`, create API token with R2 write access
- [ ] **Mapbox** — create account, get public token (mobile) + secret token (API server-side geocoding)
- [ ] **Expo** — create project, get project ID, configure push notifications
- [ ] **Apple Developer Program** — enroll ($99/year), needed for TestFlight
- [ ] **Google Play Console** — create app ($25 one-time), needed for internal testing track
- [ ] **Sentry** — create project for `api` and `mobile`, get DSN values
- [ ] **GitHub** — private repo, branch protection on `main`, required PR reviews
- [ ] **Vercel** (admin dashboard hosting) — free tier sufficient for MVP

---

## Critical Path

```
Sprint 0 ─── Foundation ─────────────────────────────────────────────────────┐
Sprint 1 ─── DB + Auth ──────────────────────────────────────────────────────┤
Sprint 2 ─── Content APIs ───────────────────────────────────────────────────┤
Sprint 3 ─── Feed + Geo APIs ────────────────────────────────────────────────┤
Sprint 4 ─── Engagement APIs ────────────────────────────────────────────────┤
                                  ├── Sprint 5: Mobile Auth + Feed ───────────┤
                                  ├── Sprint 6: Mobile Map + Explore ─────────┤
                                  ├── Sprint 7: Mobile Profile + Create ──────┤
                              Sprint 8: Admin Dashboard ──────────────────────┤
                              Sprint 9: QA + Performance + Launch Prep ────── LAUNCH
```

Backend (Sprints 1–4) is the critical path. Mobile cannot start meaningfully until Sprint 4 APIs are stable. Admin runs in parallel from Sprint 8.

---

## Global Definition of Done

Every task must satisfy ALL of these before being marked complete:

- [ ] Code is merged to `main` via PR (no direct pushes)
- [ ] PR has at least one review approval (or founder self-reviewed with a 24h delay)
- [ ] No TypeScript errors (`tsc --noEmit` passes)
- [ ] Linting passes (`eslint` — zero warnings, zero errors)
- [ ] Unit tests written and passing (≥80% coverage on new code)
- [ ] No `console.log` statements in committed code
- [ ] Environment variables documented in `.env.example`
- [ ] API changes reflected in `packages/types`

---

## Sprint 0: Developer Foundation
**Duration:** 3 days (before Week 1)
**Objective:** Every engineer has an identical, working local environment. Tooling is configured once and never re-debated.

---

### Deliverables

#### Infrastructure & Tooling
- [ ] Monorepo scaffold via Turborepo
  ```
  muzgram/
  ├── apps/api/          # NestJS
  ├── apps/mobile/       # Expo
  ├── apps/admin/        # React + Vite
  ├── packages/types/    # Shared TS types
  ├── packages/constants/  # Design tokens, categories, Chicago data
  ├── packages/utils/    # Shared pure utilities
  └── infra/
      ├── docker-compose.yml
      └── .env.example
  ```
- [ ] `docker-compose.yml` with: PostgreSQL 16 + PostGIS, Redis 7, Adminer (DB GUI on port 8080)
- [ ] `packages/types` bootstrapped with barrel `index.ts` — empty but importable from all apps
- [ ] `packages/constants` with:
  - `theme.ts` — all design tokens from `docs/02-design-system.md`
  - `categories.ts` — food/events/services/community category + subcategory lists
  - `chicago.ts` — neighborhood list, Devon Ave bounding box, West Ridge default coordinates
- [ ] `packages/utils` with:
  - `distance.ts` — `metersToMiles()`, `formatDistance()` ("0.3 mi away", "Right here")
  - `hours.ts` — `isOpenNow()`, `formatOpenStatus()` ("Closes in 43 min", "Opens at 11am")
  - `time.ts` — `formatRelativeTime()`, `formatEventDate()`

#### Repository & CI
- [ ] GitHub repo created, `main` branch protected (require PR + passing CI)
- [ ] `.github/PULL_REQUEST_TEMPLATE.md`:
  ```markdown
  ## What
  ## Why
  ## Testing done
  ## Screenshots (mobile changes)
  ## Checklist
  - [ ] Types updated in packages/types
  - [ ] .env.example updated if new env vars added
  - [ ] No console.log
  ```
- [ ] `.github/workflows/ci.yml`:
  - Trigger: PR to main
  - Jobs: `typecheck`, `lint`, `test` (all three must pass)
  - Matrix: `[api, mobile, admin]`
- [ ] Commit convention: Conventional Commits (`feat:`, `fix:`, `chore:`, `docs:`)
- [ ] `.commitlintrc.json` enforced via Husky pre-commit hook

#### NestJS API Scaffold (`apps/api`)
- [ ] NestJS project created with:
  - TypeORM, class-validator, class-transformer
  - `@nestjs/config` with `ConfigModule.forRoot({ isGlobal: true, validate })`
  - `@nestjs/throttler` — global rate limiting
  - `compression` middleware
  - `helmet` middleware
  - CORS configured for mobile + admin origins
- [ ] Module skeleton created (empty files) for all 16 product modules: `auth`, `users`, `businesses`, `events`, `posts`, `feed`, `map`, `saves`, `leads`, `media`, `search`, `notifications`, `reports`, `analytics`, `geo`, `admin`
- [ ] Shared infrastructure created:
  - `GlobalExceptionFilter` — catches all unhandled exceptions, formats as RFC 9457 ProblemDetails
  - `CorrelationIdInterceptor` — generates UUID per request, attaches to response header `X-Correlation-Id`
  - `LoggingInterceptor` — logs method, path, status, duration using NestJS Logger
  - `TransformInterceptor` — wraps all 200 responses in `{ "data": ... }` envelope
  - `ClerkAuthGuard` — validates Clerk JWT, extracts userId + role, attaches to `request.user`
  - `RolesGuard` — reads `@Roles()` decorator, checks against `request.user.role`
  - `@CurrentUser()` decorator — param decorator returning `request.user`
  - `@Roles(...roles)` decorator — method-level role annotation
- [ ] `main.ts` wired: all global filters, pipes, interceptors, guards
- [ ] `AppModule` with all module imports stubbed
- [ ] Health check endpoint: `GET /health` returns `{ "status": "ok", "uptime": 123 }`

#### Expo Mobile Scaffold (`apps/mobile`)
- [ ] Expo SDK 53 project created with New Architecture enabled
- [ ] NativeWind v4 configured — `tailwind.config.js` pointing to design tokens from `packages/constants`
- [ ] Expo Router v3 file structure scaffolded:
  ```
  app/
  ├── _layout.tsx          # Root layout (ClerkProvider, QueryClientProvider, GestureHandlerRoot)
  ├── (auth)/
  │   ├── _layout.tsx
  │   ├── phone.tsx
  │   ├── otp.tsx
  │   ├── location.tsx
  │   └── name.tsx
  ├── (tabs)/
  │   ├── _layout.tsx      # Tab navigator
  │   ├── index.tsx        # Home/Now
  │   ├── explore.tsx
  │   ├── map.tsx
  │   ├── saved.tsx
  │   └── profile.tsx
  └── create/
      └── _layout.tsx      # Modal stack
  ```
- [ ] `src/` folder structure created (empty but complete — see `docs/09-mobile-architecture.md`)
- [ ] `src/api/client.ts` — Axios instance with base URL, auth header injection, RFC 9457 ApiError class
- [ ] `src/api/queryClient.ts` — TanStack Query v5 QueryClient with defaults
- [ ] `src/api/queryKeys.ts` — key factory scaffold (empty namespaces)
- [ ] Zustand stores created (empty state shape): `authStore`, `locationStore`, `feedStore`, `mapStore`, `notifStore`, `analyticsStore`
- [ ] ESLint rule added: `no-restricted-imports` blocking `FlatList` (use FlashList), `AsyncStorage` (use MMKV), `StyleSheet` (use NativeWind)

#### Admin Dashboard Scaffold (`apps/admin`)
- [ ] React + Vite + TypeScript project
- [ ] Tailwind CSS configured
- [ ] Clerk React SDK (`@clerk/clerk-react`) installed
- [ ] TanStack Query v5 installed
- [ ] React Router v7 installed
- [ ] Empty pages created: `Overview`, `Queue`, `Businesses`, `Events`, `Posts`, `Users`, `Featured`, `Leads`

---

### Dependencies
- All third-party accounts created (see Services Checklist above)
- `.env.example` agreed upon and shared with team via secure channel (1Password / Doppler)

### Acceptance Criteria
- [ ] `docker-compose up -d` starts Postgres + Redis + Adminer with zero errors
- [ ] `turbo run dev` starts all three apps without TypeScript errors
- [ ] CI pipeline runs green on a blank PR
- [ ] `packages/constants` importable in both `apps/api` and `apps/mobile` without errors
- [ ] `GET /health` returns 200 on the running API
- [ ] Expo app loads on iPhone simulator with no red errors

### Risk Flags
| Risk | Mitigation |
|---|---|
| Expo New Architecture incompatibility with a library | Run `npx expo-doctor` early; flag any yellow warnings |
| PostGIS not available on chosen DB provider | Test on Day 1: `CREATE EXTENSION postgis;` must succeed |
| Clerk phone OTP not available in region | Test OTP delivery to real phone on Day 1 |

---

## Sprint 1: Data Foundation
**Duration:** 5 days (Week 1)
**Objective:** The database is fully migrated, seeded with real Chicago data, and auth is wired end-to-end. Any engineer can sign in with a real phone number and get a valid JWT that the API trusts.

---

### Database Tasks

#### Migrations (run in order)
- [ ] Migration 001: Extensions — `uuid-ossp`, `postgis`, `pg_trgm`, `unaccent`
- [ ] Migration 002: Enums — all PostgreSQL ENUM types from schema doc:
  `user_role`, `business_category`, `halal_status`, `business_status`,
  `event_category`, `post_type`, `post_status`, `notification_type`,
  `moderation_action_type`, `lead_status`, `media_type`
- [ ] Migration 003: Core tables (no FK dependencies):
  `cities`, `neighborhoods`, `users`, `push_tokens`
- [ ] Migration 004: Business tables (depends on cities, users, neighborhoods):
  `businesses`, `operating_hours`, `business_media`, `halal_certifications`
- [ ] Migration 005: Content tables (depends on businesses, users):
  `events`, `event_media`, `posts`, `post_media`
- [ ] Migration 006: Engagement tables:
  `saves`, `leads`, `reports`, `moderation_actions`
- [ ] Migration 007: Notification tables:
  `notifications`, `notification_preferences`
- [ ] Migration 008: Analytics tables:
  `analytics_events`, `analytics_sessions`
- [ ] Migration 009: Bonus module tables:
  `ramadan_seasons`, `mosques`, `jummah_times`, `notice_board_posts`, `campaigns`, `campaign_items`
- [ ] Migration 010: Indexes — all GIN, GiST, B-tree, partial indexes from `docs/05-database-schema.md`
  - PostGIS spatial index on `businesses(location)`
  - Partial index: `businesses(city_id) WHERE status = 'active'`
  - GIN index: `businesses(search_vector)`, `events(search_vector)`
  - B-tree: `saves(user_id, target_type, target_id)` UNIQUE
  - B-tree: `analytics_events(created_at)` for partition range queries
- [ ] Migration 011: `tsvector` triggers — `search_vector` auto-updated on INSERT/UPDATE for businesses, events, posts
- [ ] Migration 012: `updated_at` triggers — auto-update `updated_at` on all tables

#### Seed Data (Critical for Demo-readiness)
- [ ] Chicago city record + 25 neighborhoods (with lat/lng centroids)
- [ ] West Ridge as default neighborhood (id hardcoded in `packages/constants/chicago.ts`)
- [ ] **10 real Devon Ave businesses** (manually sourced — actual places with real addresses):
  - 3 halal restaurants (IFANCA certified, real phone + hours)
  - 2 halal restaurants (self-declared)
  - 2 service providers (financial + legal)
  - 1 mosque (Masjid Al-Faatir)
  - 1 grocery (Patel Brothers)
  - 1 event venue
- [ ] **3 upcoming test events** (within next 14 days, real-sounding)
- [ ] **5 community posts** (recent timestamps, different neighborhoods)
- [ ] **Featured slot assignments** — 2 businesses pre-featured
- [ ] **Test admin user** — phone number for founder, role = `super_admin`

---

### Backend Tasks

#### Auth Module
- [ ] `ClerkAuthGuard` — fully implemented:
  - Validates `Authorization: Bearer <clerk_jwt>` header
  - Calls Clerk's `/me` endpoint or validates JWT locally with Clerk's JWKS
  - On first valid auth: upsert user record in `users` table
  - Attaches `{ userId, clerkId, role }` to `request.user`
  - Returns `401` with RFC 9457 body if token invalid/missing
- [ ] `POST /v1/auth/sync` — clerk webhook receiver:
  - Verifies Clerk webhook signature (`svix`)
  - Handles: `user.created`, `user.updated`, `session.revoked`
  - On `user.created`: creates DB record, triggers welcome notification job
- [ ] `DELETE /v1/auth/me` — account deletion:
  - Returns `202 Accepted` immediately
  - Enqueues `DeleteAccountJob` (30-day grace period)
  - Marks user `is_deleted = true`, `deleted_at = now()`
- [ ] `GET /v1/auth/me` — returns current user profile (used for app hydration on launch)

#### Users Module
- [ ] `GET /v1/users/me` — current user profile (name, avatar, neighborhood, role, stats)
- [ ] `PATCH /v1/users/me` — update profile (name, bio, avatar_url, home_neighborhood_id)
  - Major change guard: if display_name contains blocked words → flag for moderation
- [ ] `POST /v1/users/me/push-token` — register/update Expo push token
  - Upserts to `push_tokens` table (one active token per user per platform)
  - Called on every app launch (token can change)
- [ ] `DELETE /v1/users/me/push-token` — deregister on logout

#### Geo Module
- [ ] `GET /v1/geo/cities` — list all cities (used for city selector)
- [ ] `GET /v1/geo/cities/:id/neighborhoods` — neighborhoods for a city
- [ ] `POST /v1/geo/reverse` — reverse geocode lat/lng → returns city_id + neighborhood_id
  - First checks PostGIS `ST_Within` against neighborhood polygons
  - Fallback: nearest neighborhood centroid (`ST_Distance` sort)
- [ ] `GET /v1/geo/autocomplete` — Mapbox Geocoding API proxy (adds Chicago bias, caches 1h in Redis)

---

### Mobile Tasks

#### App Bootstrap
- [ ] `app/_layout.tsx` — root providers:
  - `ClerkProvider` with `publishableKey`
  - `QueryClientProvider` with queryClient
  - `GestureHandlerRootView`
  - `SafeAreaProvider`
  - `ThemeProvider` (NativeWind dark mode context)
  - Auth state check: redirect to `(auth)` or `(tabs)` based on Clerk session
- [ ] `useAuth()` hook — wraps Clerk's `useUser()`, syncs with `authStore`, handles `GET /v1/auth/me` on launch
- [ ] `useInitializeApp()` hook — runs on first render:
  1. Check Clerk session
  2. If authed: fetch `/v1/auth/me`, hydrate authStore, register push token
  3. If not authed: redirect to `(auth)/phone`

#### Auth Screens (4 screens)
- [ ] `app/(auth)/phone.tsx` — route (5 lines max, renders `PhoneScreen`)
- [ ] `src/screens/auth/PhoneScreen.tsx`:
  - PhoneInput component (country flag + formatted input)
  - React Hook Form + Zod: `z.string().regex(/^\+1\d{10}$/, 'Valid US number required')`
  - "Send Code" CTA → calls `clerk.signIn.create({ identifier: phone, strategy: 'phone_code' })`
  - Loading state: button spinner (haptic on tap)
  - Error state: RFC 9457 field error displayed inline
- [ ] `app/(auth)/otp.tsx` — route
- [ ] `src/screens/auth/OtpScreen.tsx`:
  - 6-box OTP input (auto-advance, auto-submit on last digit)
  - 60s countdown → "Resend Code" appears
  - Auto-advance after correct OTP: calls Clerk `attemptFirstFactor({ code })`
  - Wrong code: shake animation (Reanimated), inline error
- [ ] `app/(auth)/location.tsx` — route
- [ ] `src/screens/auth/LocationScreen.tsx`:
  - "Allow Location" primary CTA → `expo-location` permission request
  - "Choose manually" secondary → neighborhood picker modal (FlashList of 25 neighborhoods)
  - On permission granted: reverse geocode via `/v1/geo/reverse`, store in `locationStore`
- [ ] `app/(auth)/name.tsx` — route
- [ ] `src/screens/auth/NameScreen.tsx`:
  - First name input (optional — "Skip" in top right)
  - On submit: `PATCH /v1/users/me`, update `authStore`
  - On skip: proceed to main app with blank display name
  - After name: `router.replace('/(tabs)/')`

---

### Testing Tasks
- [ ] Integration test: `POST /v1/auth/sync` with mock Clerk webhook payload (happy path + invalid signature)
- [ ] Integration test: `ClerkAuthGuard` — valid JWT passes, expired JWT returns 401, no token returns 401
- [ ] Unit test: `packages/utils/hours.ts` — `isOpenNow()` with 10 time scenarios (lunch break, overnight hours, closed today, no hours)
- [ ] Unit test: `packages/utils/distance.ts` — `formatDistance()` with edge cases (0m, 80m → "Right here", 1.5km)
- [ ] Migration smoke test: all 44 tables exist, all indexes exist, `search_vector` triggers fire on INSERT

---

### Acceptance Criteria
- [ ] All 44 database tables created and seeded via `npm run db:seed`
- [ ] Real phone number can complete OTP → receive JWT from Clerk
- [ ] `GET /v1/auth/me` returns user profile with `Authorization: Bearer <token>`
- [ ] Unauthenticated request to protected endpoint returns RFC 9457 `401` response
- [ ] Admin user (role=super_admin) can access admin-only endpoint; regular user gets `403`
- [ ] PostGIS spatial query executes in <50ms on local machine with seed data
- [ ] Expo app boots on iOS simulator → phone screen renders with no errors
- [ ] OTP flow completes end-to-end on a real device

### Risk Flags
| Risk | Mitigation |
|---|---|
| Clerk webhook signature verification complexity | Use official `svix` library — 3 lines of code |
| PostGIS extension unavailable | Confirm on Day 1; have RDS fallback ready |
| OTP delivery delays in US | Test Clerk's default SMS provider; have Twilio fallback |
| 44-table migration fails mid-run | Use transactions per migration; test against clean DB |

---

## Sprint 2: Core Content APIs
**Duration:** 5 days (Week 2)
**Objective:** Businesses, events, and posts can be created, read, updated, and deleted. Media can be uploaded. Admin can approve content. The content pipeline is end-to-end.

---

### Backend Tasks

#### Media Module
- [ ] `POST /v1/media/presign` — generate R2 presigned PUT URL:
  - Input: `{ contentType: 'image/jpeg', folder: 'businesses' | 'events' | 'posts' | 'avatars' }`
  - Validates `contentType` (allow-list: jpeg, png, webp only)
  - Generates unique key: `{folder}/{yyyy-mm}/{uuid}.{ext}`
  - Returns `{ uploadUrl, mediaUrl, key }` — TTL: 5 minutes
  - Rate limit: 20 presign requests per user per hour
- [ ] `POST /v1/media/confirm` — confirm upload completed:
  - Input: `{ key, targetType, targetId }`
  - Verifies file exists in R2 via HEAD request
  - Creates `business_media` / `event_media` / `post_media` record
  - Returns confirmed `media_url`

#### Businesses Module
- [ ] `GET /v1/businesses/:slug` — full business profile:
  - Joins: operating_hours, business_media, halal_certifications
  - Increments `contact_tap_count` if `X-Contact-Tap: true` header present (atomic UPDATE)
  - Response: full BusinessDetail type (defined in `packages/types`)
  - Cache: `business:{slug}` — 5 minutes TTL, invalidated on any update
- [ ] `GET /v1/businesses` — list/discovery endpoint (admin + business owner use):
  - Filter: `city_id`, `category`, `status`, `is_claimed`
  - Pagination: cursor-based, 20 per page
- [ ] `POST /v1/businesses` — create listing:
  - Auth: any authenticated user OR admin
  - Status: `pending` (goes to approval queue)
  - Auto-approve: if `request.user.role === 'admin'`
  - Geocodes address via Mapbox Geocoding API → stores lat/lng
  - Updates `search_vector` tsvector via trigger
  - Returns `202 Accepted` + `{ id, status: 'pending' }`
- [ ] `PATCH /v1/businesses/:id` — update listing:
  - Auth: `business_owner` (own business only) OR `admin`
  - Minor edits (phone, hours, photos): `status = 'active'` immediately
  - Major edits (name, address, halal_status): `status = 'pending_review'`
  - Uses `ETag` + `If-Match` header for optimistic concurrency
  - Returns `200` with updated resource
- [ ] `DELETE /v1/businesses/:id` — soft delete:
  - Auth: `admin` only
  - Sets `status = 'deleted'`, `deleted_at = now()`
  - Removes from all active feeds (cache invalidation)
  - Returns `204 No Content`
- [ ] `POST /v1/businesses/:id/claim` — initiate claim:
  - Creates claim record with `status = 'pending'`
  - Notifies admin (Bull job)
  - Returns `202 Accepted`
- [ ] `GET /v1/businesses/:id/operating-hours` — hours CRUD:
  - Returns array of 7 operating_hours records
- [ ] `PUT /v1/businesses/:id/operating-hours` — replace all hours at once:
  - Auth: business owner (own) OR admin
  - Input: array of `{ day_of_week, opens_at, closes_at, is_closed }`
  - Validates: no overlapping times, valid 24h format
  - Invalidates open/closed cache for this business

#### Events Module
- [ ] `GET /v1/events/:id` — event detail:
  - Joins: event_media, organizer user record
  - Includes: `is_saved` boolean (requires auth; anonymous gets `false`)
  - Cache: `event:{id}` — 2 minutes TTL
- [ ] `GET /v1/events` — list events:
  - Filter: `city_id`, `category`, `status`, `starts_after`, `starts_before`, `is_free`
  - Pagination: cursor, 20 per page
- [ ] `POST /v1/events` — create event:
  - Auth: any authenticated user
  - Status: `pending` (auto-approve if user has ≥3 previously approved events)
  - Validates: `starts_at` must be in the future
  - Geocodes `venue_address` if provided (caches Mapbox result 24h)
  - Returns `202 Accepted` or `201 Created` (if auto-approved)
- [ ] `PATCH /v1/events/:id` — update event:
  - Auth: organizer (own) OR admin
  - If event is `live` and `starts_at` changes → triggers notification to savers (Bull job)
- [ ] `DELETE /v1/events/:id` — cancel event:
  - Auth: organizer (own) OR admin
  - Sets `status = 'cancelled'`
  - Enqueues `EventCancelledNotificationJob` — notifies all savers via push

#### Posts Module
- [ ] `GET /v1/posts/:id` — post detail
- [ ] `GET /v1/posts` — list posts:
  - Filter: `city_id`, `neighborhood_id`, `post_type`, `status`
  - Pagination: cursor, 20 per page
- [ ] `POST /v1/posts` — create post:
  - Auth: any authenticated user
  - Rate limit: 5 posts per hour per user (return `429` with `Retry-After` header)
  - Status: `pending` (auto-approve if user has ≥5 previously approved posts)
  - Auto-expire: `expires_at = NOW() + INTERVAL '7 days'`
  - Validates: text not empty, text ≤500 chars
- [ ] `DELETE /v1/posts/:id` — delete post:
  - Auth: author (own) OR admin
  - Hard delete (posts are ephemeral, 7-day lifecycle)
  - Returns `204 No Content`

#### Admin Module (Approval Queue)
- [ ] `GET /v1/admin/queue` — pending approval queue:
  - Auth: `moderator` | `admin` | `super_admin` only
  - Filter: `type` (business|event|post|claim), `city_id`
  - Sort: oldest first (SLA priority)
  - Returns unified list: `{ type, id, title, submittedAt, submittedBy, preview }`
  - Pagination: 50 per page
- [ ] `POST /v1/admin/queue/:type/:id/approve` — approve item:
  - Updates status to `active` / `live`
  - Logs `moderation_actions` record: `{ action: 'approved', moderatorId, reason: null }`
  - Triggers approval notification to owner (Bull job)
  - Idempotent: second approval is no-op
- [ ] `POST /v1/admin/queue/:type/:id/reject` — reject item:
  - Input: `{ reason: 'duplicate' | 'outside_coverage' | 'incomplete' | 'spam' | 'inappropriate', note?: string }`
  - Updates status to `rejected`
  - Logs `moderation_actions`
  - Triggers rejection notification with reason
- [ ] `POST /v1/admin/queue/:type/:id/edit-and-approve` — admin edits then approves:
  - Combines a PATCH + approve in one atomic operation
  - Logs both actions in `moderation_actions`

---

### Mobile Tasks

#### Design System Foundation (Blocks all other mobile work)
- [ ] `src/components/ui/` — core atoms:
  - `Button.tsx` — variants: `primary`, `secondary`, `ghost`, `destructive`; sizes: `sm`, `md`, `lg`; loading state (ActivityIndicator replaces label); haptic on press
  - `Input.tsx` — NativeWind styled, error state (red border + error text below), clear button, ref forwarding
  - `Badge.tsx` — halal badge (`IFANCA` green, `ISNA` green, `Self-declared` amber, `Unknown` gray); open/closed pill
  - `Avatar.tsx` — expo-image with blurhash; fallback: initials on deterministic color circle
  - `Icon.tsx` — wrapper around `@expo/vector-icons/Feather` (consistent icon set)
  - `Skeleton.tsx` — animated shimmer placeholder (Reanimated linear gradient shimmer)
  - `Divider.tsx`, `Spacer.tsx` — layout helpers
- [ ] `src/components/typography/` — text scale:
  - `Heading.tsx` (h1/h2/h3 variants), `Body.tsx`, `Caption.tsx`, `Label.tsx`
  - All using NativeWind classes mapped to design system type scale
- [ ] `src/components/layout/`:
  - `Screen.tsx` — `SafeAreaView` + scroll-aware header slot + background color
  - `Header.tsx` — transparent/solid toggle prop, back button support, title slot, right action slot
  - `Container.tsx` — horizontal padding wrapper (16px default, 24px on large screens)

#### Shared Card Components
- [ ] `src/components/cards/BusinessCard.tsx`:
  - Props: `business`, `variant: 'featured' | 'compact'`
  - Featured: 200px hero image (`expo-image` + blurhash), gradient overlay, title, halal badge, open status, distance, cuisine
  - Compact: 80×80px thumbnail, right-side text stack, halal badge, open status, distance
  - Skeleton variant: `BusinessCardSkeleton.tsx`
- [ ] `src/components/cards/EventCard.tsx`:
  - Props: `event`, `variant: 'featured' | 'compact'`
  - Featured: 200px image, date chip (colored by recency), title, venue, distance, free/paid pill
  - Compact: date column + text stack
  - Skeleton: `EventCardSkeleton.tsx`
- [ ] `src/components/cards/PostCard.tsx`:
  - Props: `post`
  - Optional image thumbnail, post type chip, body (3-line clamp), poster row, neighborhood + timestamp
  - Skeleton: `PostCardSkeleton.tsx`

---

### Testing Tasks
- [ ] Integration test: `POST /v1/businesses` → creates record, status=pending, enqueues notification job
- [ ] Integration test: `POST /v1/businesses/:id/claim` → creates claim, returns 202
- [ ] Integration test: Admin approve → status=active, notification job created
- [ ] Integration test: Admin reject → status=rejected, `moderation_actions` record created
- [ ] Integration test: `POST /v1/media/presign` → returns valid R2 signed URL (mock R2 client)
- [ ] Integration test: `POST /v1/events` → validates past date returns 422
- [ ] Integration test: Rate limit on `POST /v1/posts` — 6th post returns 429 with `Retry-After`
- [ ] Unit test: `isOpenNow()` with overnight hours (opens 11pm, closes 2am) — edge case
- [ ] Unit test: Auto-approve logic — user with ≥3 approved events gets 201, others get 202
- [ ] Snapshot test: `BusinessCard`, `EventCard`, `PostCard` — no unexpected renders

### Acceptance Criteria
- [ ] Business can be created, approved, and appears in DB with `status=active`
- [ ] Event with past date returns `422` with RFC 9457 validation errors
- [ ] Media presign returns a valid URL that actually accepts a PUT request to R2
- [ ] Admin approval queue returns all pending items, oldest first
- [ ] Reject with reason sends the reason in the `moderation_actions` log
- [ ] ETag on PATCH — stale `If-Match` value returns `412 Precondition Failed`
- [ ] Design system card components render without errors in Expo Go

### Risk Flags
| Risk | Mitigation |
|---|---|
| R2 presigned URL PUT fails due to CORS | Configure R2 bucket CORS to allow `PUT` from app and web origins |
| Mapbox geocoding API quota | Cache all geocoding results aggressively (24h per unique address) |
| ETag concurrency too complex for MVP | Simplify to `version` counter on rows; skip ETag for posts (not concurrently edited) |

---

## Sprint 3: Feed, Geo & Map APIs
**Duration:** 5 days (Week 3)
**Objective:** The core differentiated experience — the Now feed, Explore, and Map — are API-complete and performant. A real user in West Ridge gets relevant, proximity-sorted content.

---

### Backend Tasks

#### Feed Module
- [ ] `GET /v1/feed/now` — the Now feed:
  - Auth: optional (anonymous uses default coords)
  - Query params: `lat`, `lng`, `radius_km` (default 15), `category`, `cursor`, `limit` (default 20)
  - Coordinates rounded to 3 decimal places in cache key (~100m cells, prevents GPS noise cache misses)
  - **Algorithm:**
    ```sql
    SELECT *, (
      recency_score(created_at) +
      proximity_score(ST_Distance(location, ST_MakePoint($lng, $lat)::geography)) +
      CASE WHEN is_featured THEN 200 ELSE 0 END
    ) AS score
    FROM (
      -- UNION of active businesses, upcoming events, recent posts
      SELECT 'business' AS type, id, ... FROM businesses
      WHERE city_id = $city_id AND status = 'active'  -- city_id filter FIRST
        AND ST_DWithin(location, ST_MakePoint($lng, $lat)::geography, $radius_m)
      UNION ALL
      SELECT 'event' AS type, id, ... FROM events WHERE ...
      UNION ALL
      SELECT 'post' AS type, id, ... FROM posts WHERE ...
    ) AS feed_items
    WHERE score > 0
    ORDER BY score DESC, id DESC
    ```
  - Cache: `feed:now:{cityId}:{latRounded}:{lngRounded}:{category}` — 2 minutes TTL
  - **Cursor pagination:** `{ cursor: 'score:1340:id:uuid', hasMore: true }`
  - Featured items: always injected at positions 1 and 4 (never bumped by cursor)
  - Live Now strip: separate query for items with `is_live_now = true`
  - Response: `{ data: FeedItem[], meta: { cursor, hasMore }, liveNow: LiveItem[] }`
- [ ] `GET /v1/feed/explore` — explore/browse:
  - Auth: optional
  - Query: `lat`, `lng`, `category`, `subcategory`, `sort` (nearby|recent), `cursor`, `limit`
  - No score weighting — simpler: proximity or recency depending on `sort`
  - Cache: `feed:explore:{params_hash}` — 5 minutes TTL
- [ ] `GET /v1/feed/now/live` — live now strip only:
  - Returns events currently happening + restaurants open now within 3km
  - Cache: `feed:live:{cityId}:{latRounded}:{lngRounded}` — 60 seconds TTL
  - Used for real-time strip polling (mobile polls every 60s when app is in foreground)

#### Map Module
- [ ] `GET /v1/map/pins` — all pins for viewport:
  - Query: `north`, `south`, `east`, `west` (bounding box), `category`, `zoom`
  - Uses `ST_MakeEnvelope(west, south, east, north, 4326)`
  - city_id derived from center of bounding box
  - At zoom < 13: returns cluster data `{ lat, lng, count }` instead of individual pins
  - At zoom ≥ 13: returns individual pins with minimal data (id, type, lat, lng, category, is_featured, is_live)
  - Cache: `map:pins:{bbox_rounded}:{category}` — 60 seconds TTL
  - Max 500 pins per response (enforced server-side)
- [ ] `GET /v1/map/pin/:type/:id` — lightweight pin preview (for bottom sheet):
  - Returns ≤200 bytes: `{ id, name, slug, thumbnail, distance, openStatus, halalBadge, category }`
  - Cache: `map:preview:{type}:{id}` — 5 minutes TTL
  - Called on pin tap before user swipes up for full detail

#### Restaurants Module (Read-only discovery)
- [ ] `GET /v1/restaurants` — halal food discovery:
  - Auth: optional
  - Query: `lat`, `lng`, `radius_km`, `cuisine`, `halal_status`, `open_now`, `cursor`
  - `open_now` filter: computed via `is_open_now()` SQL function (uses operating_hours + timezone)
  - Cache: `restaurants:{params_hash}` — 2 minutes TTL (open_now changes frequently, so short TTL)

#### Services Module (Read-only discovery)
- [ ] `GET /v1/services` — service provider discovery:
  - Auth: optional
  - Query: `lat`, `lng`, `radius_km`, `service_category`, `cursor`
  - No open_now filter (services don't have operating hours in MVP)

#### Open/Closed Calculation Service
- [ ] `OpenStatusService` (shared service, injected by Feed, Restaurants, Businesses modules):
  - `isOpenNow(business_id)` — checks `operating_hours` table against `America/Chicago` timezone
  - `getOpenStatus(business_id)` — returns `{ isOpen, label, urgency }`:
    - `{ isOpen: true, label: 'Open until 10pm', urgency: null }` — normal open
    - `{ isOpen: true, label: 'Closes in 43 min', urgency: 'amber' }` — < 1 hour left
    - `{ isOpen: false, label: 'Opens at 11am', urgency: null }` — closed
    - `{ isOpen: false, label: 'Closed today', urgency: null }` — no hours today
    - `{ isOpen: null, label: 'Hours not listed', urgency: 'amber' }` — no data
  - Cache: `open:{business_id}:{date_hour}` — 1 hour TTL
  - **Important:** never assume open if data is missing — always amber "Hours not listed"

---

### Mobile Tasks

#### Feed Screen
- [ ] `src/api/endpoints/feed.ts`:
  - `fetchFeedNow(params)` — calls `GET /v1/feed/now`
  - `fetchFeedLive(params)` — calls `GET /v1/feed/now/live`
  - `fetchFeedExplore(params)` — calls `GET /v1/feed/explore`
- [ ] `src/hooks/feed/useFeedNow.ts`:
  - `useInfiniteQuery` with `queryKeys.feed.now(params)`
  - `getNextPageParam`: extracts cursor from last page `meta.cursor`
  - `select`: flattens pages → `data.pages.flatMap(p => p.data)`
  - Rounds lat/lng to 3 decimal places before passing to query key
- [ ] `src/hooks/feed/useLiveNow.ts`:
  - `useQuery` with 60-second `staleTime` and `refetchInterval: 60_000`
  - Only active when app is in foreground (`useAppState` check)
- [ ] `src/screens/home/HomeScreen.tsx`:
  - Transparent → solid header on scroll (Reanimated `useAnimatedScrollHandler`)
  - Header: Logo (SVG) + location subtitle (neighborhood name) + notification bell + search icon
  - `LiveNowStrip` — horizontal FlashList of live event pills
  - Category chips — horizontal FlashList, tap updates `feedStore.activeCategory`
  - Main feed — vertical FlashList:
    - Position 0: `FeatureCard` (if featured item exists)
    - Position 1–N: `CompactCard` or `EventCard` or `PostCard` based on `item.type`
    - `onEndReachedThreshold={0.8}` → calls `fetchNextPage()`
  - `refreshControl` — pull to refresh → `refetch()`
  - Loading state: `SkeletonFeed` (1 SkeletonFeatureCard + 5 SkeletonCompactCard)
  - Empty state: "Today looks quiet" + 3 upcoming events + "Explore all" CTA
- [ ] `src/components/feed/LiveNowStrip.tsx`:
  - Horizontal FlashList of pills
  - Each pill: `{ emoji, name, distance }` — rose color, pulse animation on "LIVE" badge
  - Tap → navigate to detail screen

#### Category Chip Component
- [ ] `src/components/feed/CategoryChips.tsx`:
  - Props: `categories`, `activeCategory`, `onSelect`
  - FlashList horizontal
  - Active chip: filled (accent.gold background), inactive: outlined
  - Haptic on select (`impactAsync('light')`)
  - Animates underline/fill on selection (Reanimated shared value)

---

### Testing Tasks
- [ ] Integration test: `GET /v1/feed/now` with real seed data — returns businesses + events + posts sorted by score
- [ ] Integration test: Featured items appear at position 0/3 regardless of score
- [ ] Integration test: `GET /v1/map/pins` with bounding box covering Devon Ave — returns correct pins
- [ ] Integration test: `GET /v1/map/pin/business/:id` — returns ≤200 byte preview
- [ ] Performance test: `GET /v1/feed/now` with 1000 seed businesses — query time <200ms (check with `EXPLAIN ANALYZE`)
- [ ] Performance test: `GET /v1/map/pins` — <100ms with 500 pins in viewport
- [ ] Unit test: `OpenStatusService.getOpenStatus()` — 8 scenarios (normal, closes-soon, just-opened, closed-today, overnight, no-hours, DST boundary, all-week)
- [ ] Cache test: Second call to `GET /v1/feed/now` returns cached response (check Redis key exists)

### Acceptance Criteria
- [ ] `GET /v1/feed/now` for West Ridge returns Devon Ave businesses + events sorted correctly
- [ ] Featured businesses appear at top regardless of recency score
- [ ] `open_now=true` filter excludes closed restaurants (tested against a business with closing-hour in the past)
- [ ] Map pins API returns pins within bounding box only — no pins outside
- [ ] Cache hit rate >80% on feed endpoint after 10 repeated calls
- [ ] Feed query runs in <200ms on staging database (verified with `EXPLAIN ANALYZE`)
- [ ] Mobile HomeScreen renders with data from feed API, pull-to-refresh works

### Risk Flags
| Risk | Mitigation |
|---|---|
| Feed score algorithm produces wrong ordering | Test with seed data; manually verify top 5 results make sense |
| Redis cache invalidation missing (stale open/closed) | Set TTL for open status to 1h (hourly granularity is good enough) |
| Map viewport query too slow at high zoom-out | Enforce clustering at zoom < 13; cap at 500 pins; test with 10K businesses |

---

## Sprint 4: Engagement, Notifications & Search APIs
**Duration:** 5 days (Week 4)
**Objective:** The social layer — saves, leads, reports, and push notifications — works end-to-end. A user can save content, send a lead, report abuse, and receive a push notification on their device.

---

### Backend Tasks

#### Saves Module
- [ ] `POST /v1/saves` — save an item:
  - Auth: required
  - Input: `{ targetType: 'business'|'event'|'post', targetId: string }`
  - Upserts `saves` table (UNIQUE constraint on `user_id, target_type, target_id`)
  - Returns `201 Created` with `{ isSaved: true }`
- [ ] `DELETE /v1/saves` — unsave:
  - Input: `{ targetType, targetId }` (query params)
  - Returns `204 No Content`
- [ ] `GET /v1/saves` — current user's saved items:
  - Auth: required
  - Filter: `targetType`
  - Pagination: cursor, 20 per page
  - Enriches with current item data (join businesses/events/posts)
  - Marks unavailable items: `{ isAvailable: false, reason: 'deleted' | 'cancelled' }`
- [ ] `GET /v1/saves/check` — batch check save state:
  - Auth: required
  - Input: `{ items: Array<{ targetType, targetId }> }` — up to 100 items
  - Returns: `{ data: Array<{ targetType, targetId, isSaved: boolean }> }`
  - Used by feed to check save state on render (prevents N+1 per card)
  - Cache: `saves:check:{userId}:{items_hash}` — 30 seconds TTL

#### Leads Module
- [ ] `POST /v1/leads` — submit a lead:
  - Auth: required
  - Input: `{ businessId, message?: string }` — name + phone auto-filled from auth
  - Rate limit: max 3 leads from same user to same business per week
  - Creates `leads` record with `status = 'new'`
  - Enqueues `NewLeadNotificationJob` → push to business owner immediately
  - Returns `201 Created`
- [ ] `GET /v1/leads/mine` — user's submitted leads (for history)
- [ ] `GET /v1/businesses/:id/leads` — leads for a business:
  - Auth: business owner (own) OR admin
  - Filter: `status` (new|contacted|closed)
  - Pagination: cursor
- [ ] `PATCH /v1/leads/:id` — update lead status:
  - Auth: business owner only
  - Input: `{ status: 'contacted' | 'closed' }`

#### Reports Module
- [ ] `POST /v1/reports` — report content:
  - Auth: required
  - Input: `{ targetType: 'business'|'event'|'post'|'user', targetId, reason, details? }`
  - Idempotent: one report per user per target (unique constraint)
  - Returns `201 Created`
- [ ] `GET /v1/reports` — admin: list reports:
  - Auth: `moderator` | `admin`
  - Filter: `targetType`, `status` (pending|reviewed)
  - Pagination: cursor, 50 per page
- [ ] `PATCH /v1/reports/:id` — admin: resolve report:
  - Auth: `admin`
  - Input: `{ resolution: 'dismissed' | 'actioned' | 'content_removed' }`
  - Creates `moderation_actions` record
- [ ] `GET /v1/reports/mine` — current user's report IDs:
  - Returns `{ data: [{ targetType, targetId }] }` (just IDs, not full reports)
  - Used by mobile to pre-load "Already reported" state and grey out Report button

#### Notifications Module
- [ ] `GET /v1/notifications` — current user's notification inbox:
  - Auth: required
  - Filter: `isRead`
  - Pagination: cursor, 30 per page
  - Returns: `{ type, title, body, deepLink, isRead, createdAt }`
- [ ] `PATCH /v1/notifications/read` — mark as read:
  - Input: `{ notificationIds?: string[] }` (empty = mark all as read)
  - Returns `204 No Content`
- [ ] `GET /v1/notifications/preferences` — user's notification preferences
- [ ] `PATCH /v1/notifications/preferences` — update preferences:
  - Input: `{ newNearbyEvent?, eventDayReminder?, leadAlert?, quietHoursStart?, quietHoursEnd? }`

#### Notification Bull Queues (Infrastructure)
- [ ] `NotificationQueue` Bull queue configured on Redis
- [ ] `NewLeadNotificationJob` processor:
  - Fetches business owner push token
  - Sends via Expo Push API
  - On success: creates `notifications` record in DB
  - On failure: exponential backoff (3 retries: 30s, 2m, 10m)
- [ ] `EventApprovedNotificationJob` processor:
  - Sends push to event creator
  - Deep link: `muzgram://event/{id}`
- [ ] `EventCancelledNotificationJob` processor:
  - Fetches all users who saved the event
  - Batch sends push notifications (Expo batch API, max 100 per call)
  - Throttled: 100 notifications per second
- [ ] `NearbyEventNotificationJob` processor:
  - Triggered when event is approved
  - Finds all users within 5km who have `new_nearby_event` preference enabled
  - Checks quiet hours before sending (default 10pm–7am America/Chicago)
  - Rate limit: max 1 "nearby event" notification per user per day

#### Search Module
- [ ] `GET /v1/search` — full-text search:
  - Auth: optional
  - Query params: `q` (min 2 chars), `category`, `lat`, `lng`, `radius_km`, `cursor`
  - `q` sanitized: `unaccent(plainto_tsquery('english', $q))`
  - Searches `search_vector` (tsvector) on businesses, events, posts
  - Results ranked by `ts_rank` + proximity weight
  - Response: `{ data: SearchResult[], meta: { cursor, hasMore, total, resultLabel: '12 results near West Ridge' } }`
  - Returns 422 if `q.length < 2`
  - Returns 422 if `q.length > 100` (truncation notice in error detail)

#### Analytics Module
- [ ] `POST /v1/analytics/events` — receive analytics batch:
  - Auth: required
  - Input: `{ events: AnalyticsEvent[] }` — max 100 events per batch
  - Always returns `200 OK` (never blocks UX)
  - Asynchronously inserts to `analytics_events` via Bull queue
- [ ] `POST /v1/analytics/sessions` — session tracking:
  - Auth: required
  - Input: `{ sessionId, platform, appVersion, cityId }`
  - Synchronous insert (critical for D7/D30 retention data)
  - Returns `201 Created`

---

### Mobile Tasks

#### Saves Hook + Optimistic Toggle
- [ ] `src/api/endpoints/saves.ts` — API functions
- [ ] `src/hooks/feed/useToggleSave.ts` — optimistic mutation:
  ```typescript
  onMutate: async ({ targetType, targetId, isSaved }) => {
    haptic('selection');
    await queryClient.cancelQueries({ queryKey: queryKeys.saves.check(...) });
    const previous = queryClient.getQueryData(queryKeys.saves.check(...));
    queryClient.setQueryData(queryKeys.saves.check(...), (old) => ({
      ...old, data: old.data.map(item =>
        item.target_id === targetId ? { ...item, is_saved: !isSaved } : item
      ),
    }));
    return { previous };
  },
  onError: (_, __, context) => {
    queryClient.setQueryData(queryKeys.saves.check(...), context?.previous);
    haptic('error');
  },
  ```
- [ ] Save button component with animated heart icon (Reanimated spring scale on toggle)

#### Notification Infrastructure
- [ ] `src/hooks/notifications/useRegisterPushToken.ts`:
  - Calls `expo-notifications` to get Expo push token
  - Posts to `POST /v1/users/me/push-token`
  - Called on every app launch (token can change)
- [ ] `src/hooks/notifications/useNotificationHandler.ts`:
  - `notifications.addNotificationReceivedListener` — app in foreground → show in-app toast
  - `notifications.addNotificationResponseReceivedListener` — app in background tap → navigate via deep link
- [ ] Deep link router — maps `muzgram://event/:id`, `muzgram://business/:slug`, `muzgram://leads` to Expo Router routes

#### Toast System
- [ ] `src/components/feedback/ToastManager.tsx`:
  - Global singleton (rendered in root layout)
  - `useToast()` hook: `showToast({ message, type: 'success'|'error'|'info', duration? })`
  - Animated: slides in from top (Reanimated), auto-dismisses after 3s
  - Success: emerald left border. Error: rose left border. Info: gold left border.

---

### Testing Tasks
- [ ] Integration test: Save → unsave → `GET /v1/saves/check` returns correct state
- [ ] Integration test: `GET /v1/saves/check` with 50 items batch — all return correct `isSaved`
- [ ] Integration test: Lead submission rate limit — 4th lead to same business in same week returns 429
- [ ] Integration test: `POST /v1/analytics/events` always returns 200 (even with malformed events)
- [ ] Integration test: Notification preferences — quiet hours suppress `NearbyEventNotificationJob`
- [ ] Unit test: `NewLeadNotificationJob` — mock Expo Push API, verify payload structure
- [ ] Unit test: `EventCancelledNotificationJob` — verify all savers are notified (mock push, 50 savers)
- [ ] Unit test: Search `q` sanitization — special chars don't break SQL (`'; DROP TABLE`, `<script>`)
- [ ] E2E test (real device): Send lead → business owner phone receives push notification within 10 seconds

### Acceptance Criteria
- [ ] Save toggle is optimistic — UI updates instantly, no loading state visible
- [ ] `GET /v1/saves/check` with 50 items responds in <100ms
- [ ] Lead notification arrives on device within 10 seconds of submission
- [ ] "Already reported" state: report button greyed out after `GET /v1/reports/mine`
- [ ] Search for "halal restaurant" returns relevant Devon Ave businesses
- [ ] Analytics batch always returns 200, even with empty array `{ events: [] }`
- [ ] Quiet hours: notification sent at 9pm CST gets queued, delivered at 7am next day

### Risk Flags
| Risk | Mitigation |
|---|---|
| Expo push quota exceeded during testing | Use Expo's free tier (no limit for development); add rate limiting before launch |
| Search results poor quality with PG FTS | Test with real queries; add `unaccent` + synonym rules if needed; Typesense for MMP |
| Notification fan-out to 1000 savers blocks queue | Use Expo batch API (100/call); process in chunks with Bull concurrency: 5 |

---

## Sprint 5: Mobile — Auth, Feed & Core UX
**Duration:** 5 days (Week 5)
**Objective:** A fresh install user can complete onboarding and see a real Now feed with DevonAve content within 90 seconds. The core loop is experienceable.

---

### Mobile Tasks

#### Tab Navigation
- [ ] `app/(tabs)/_layout.tsx` — custom floating tab bar:
  - 5 tabs: Home, Explore, Map, Saved, Profile
  - Pill-shaped tab bar (glass effect, backdrop blur)
  - Active tab: icon fills + label visible. Inactive: icon outline only
  - Tab bar floats above content with `position: 'absolute'`
  - `tabBarStyle` accounts for bottom safe area inset
  - Animated: active tab slides pill indicator (Reanimated shared value)
  - Haptic on tab switch (`impactAsync('light')`)
- [ ] Bottom safe area padding on all screen content (accounts for floating tab bar height + inset)

#### Home Screen Polish
- [ ] Transparent → solid header animation:
  - `useAnimatedScrollHandler` tracks scroll Y
  - `useAnimatedStyle` interpolates `backgroundColor` alpha: 0 → 1 over first 80px scroll
  - `borderBottomWidth` fades in at same breakpoint
- [ ] Neighborhood name in header subtitle:
  - `locationStore.neighborhood.name` → "West Ridge" below logo
  - Tap → neighborhood picker modal (future feature: tappable for MMP)
- [ ] Pull-to-refresh → `refetch()` → haptic confirmation on complete
- [ ] `onEndReached` at 80% → `fetchNextPage()` → appends cards without scroll jump
- [ ] "Nothing new today" empty state:
  - Shows when feed returns 0 items
  - 3 "Coming Up" cards (upcoming events from next 7 days)
  - CTA: "Explore all Devon Ave content" → navigates to Explore tab
- [ ] "Using last known location" banner: amber, dismissable, shown when GPS unavailable

#### Skeleton Feed System
- [ ] `src/components/feed/SkeletonFeed.tsx`:
  - Renders during `isLoading` state
  - Composition: 1×`SkeletonFeatureCard` + 5×`SkeletonCompactCard`
  - Each skeleton: shimmer animation (Reanimated `withRepeat` + linear gradient)
  - Exact same dimensions as real cards — no layout shift on hydration
- [ ] `SkeletonFeatureCard.tsx` — 200px height shimmer block + 2 text lines
- [ ] `SkeletonCompactCard.tsx` — 80px square shimmer + 3 text lines on right

#### Notification Bell (Header)
- [ ] Bell icon in header with unread badge count
- [ ] `src/hooks/notifications/useUnreadCount.ts` — polls `GET /v1/notifications?isRead=false&limit=1` for count
- [ ] Badge: red dot with count (disappears at 0, shows "9+" above 9)

#### App Launch Performance
- [ ] `app/_layout.tsx` — splash screen held until:
  1. Clerk session resolved
  2. If authed: `GET /v1/auth/me` returns (max 3s timeout; show app anyway on timeout)
  3. Push token registered
  - `SplashScreen.preventAutoHideAsync()` + `SplashScreen.hideAsync()` on ready
- [ ] First paint target: <2 seconds on 4G connection

#### Analytics Queue
- [ ] `src/store/analyticsStore.ts` — Zustand store with MMKV persist:
  - Queue: `AnalyticsEvent[]`
  - `enqueue(event)` — adds to queue, max queue size: 200 events
  - `flush()` — sends batch to `POST /v1/analytics/events`, clears queue
- [ ] Auto-flush triggers:
  - Every 30 seconds (foreground only — `useAppState`)
  - On app going to background (`AppState.addEventListener('change')`)
  - On reconnect after offline
- [ ] Tracked events: `view_feed`, `tap_card`, `tap_save`, `tap_directions`, `tap_call`, `tap_share`, `view_detail`

---

### Testing Tasks
- [ ] E2E (Detox): Fresh install → phone → OTP → location allow → name → land on Home feed
- [ ] E2E: Pull to refresh → spinner → updated content
- [ ] E2E: Scroll to 80% → next page loads and appends
- [ ] E2E: No internet → cached feed visible + offline banner
- [ ] Snapshot: Tab bar renders correctly (active/inactive states)
- [ ] Snapshot: SkeletonFeed matches BusinessCard dimensions (no layout shift)
- [ ] Performance: First paint on Home feed < 2s (measure with Expo DevTools)
- [ ] Unit test: `analyticsStore.flush()` — queued events sent in correct batch format

### Acceptance Criteria
- [ ] New user completes onboarding in <90 seconds on real device
- [ ] Home feed loads real Devon Ave businesses within 2s
- [ ] Featured card appears at position 0 every time
- [ ] Skeleton appears during load — no blank white flash
- [ ] Scroll to bottom triggers next page load — no layout jump
- [ ] Tab bar floats correctly above content with correct safe area on both iPhone 15 and SE
- [ ] Notification bell shows correct unread count after a notification is received
- [ ] Analytics events are flushed on app background (verify with network inspector)

### Risk Flags
| Risk | Mitigation |
|---|---|
| Skeleton dimensions don't match real card dimensions | Build skeleton AFTER real card; match heights exactly |
| Tab bar overlaps content on older phones | Test on iPhone SE (small screen); increase content bottom padding |
| Auth redirect loop (infinite loop between `(auth)` and `(tabs)`) | Add isLoading guard before redirect; show loading screen during Clerk session check |

---

## Sprint 6: Mobile — Map, Explore & Detail Screens
**Duration:** 5 days (Week 6)
**Objective:** The Map and Explore experiences are fully functional. Users can discover Devon Ave on the map, tap a pin, preview in a bottom sheet, and navigate to the full detail screen.

---

### Mobile Tasks

#### Map Screen
- [ ] `src/screens/map/MapScreen.tsx`:
  - Full-screen `MapboxGL.MapView`:
    - `styleURL`: custom dark Muzgram style (hosted on Mapbox Studio)
    - Default center: `locationStore.coords` || West Ridge fallback
    - Default zoom: 14
    - Camera ref for programmatic control
  - `MapboxGL.UserLocation` — blue dot, animated
  - Category chips (glass pill, floating above map at top): All / Food / Events / Services
  - "Re-center" FAB (gold, bottom right, 56px): animates camera back to user location
  - Pin layer (`MapboxGL.ShapeSource` + `MapboxGL.SymbolLayer`):
    - GeoJSON source from `GET /v1/map/pins?north=&south=&east=&west=&category=`
    - Custom teardrop SVG images registered per category + state
  - Cluster layer: `MapboxGL.CircleLayer` + `MapboxGL.SymbolLayer` for count
  - `onPress` on pin → fetch `GET /v1/map/pin/:type/:id` → open bottom sheet at 35%
  - `onRegionDidChange` → debounce 500ms → refetch pins for new viewport

- [ ] Custom pin assets:
  - SVG teardrop shape: 40×52px, white icon center, category-colored fill
  - States: default / selected (scale 1.3 + white ring, Reanimated) / live (rose pulse ring) / featured (gold star badge at top-right)
  - Generated as static PNG assets at 1x/2x/3x — registered with `MapboxGL.registerImage()`
  - Categories: food (amber), event (rose), service (emerald), community (purple), mosque (teal)

- [ ] Bottom sheet (map):
  - `@gorhom/bottom-sheet` — 3 snap points: `['35%', '75%', '95%']`
  - 35% snap: quick preview card (thumbnail, name, open status, distance, `[Directions]` CTA)
  - Swipe to 75%: full business/event/post card with all details
  - Swipe to 95%: embedded `ScrollView` with full detail screen content
  - Close: drag down past 35% → pin deselects → sheet dismisses
  - Back to map: tap map background

#### Explore Screen
- [ ] `src/screens/explore/ExploreScreen.tsx`:
  - Category tabs at top: All / Food / Events / Services / Community
  - Sub-category chips below tabs (changes per category)
  - Sort toggle: "Nearby" / "Recent" (right-aligned)
  - Result count label: "47 results near West Ridge"
  - FlashList of mixed content (`estimatedItemSize={100}`)
  - `keyExtractor`: `${item.type}::${item.id}` — prevents reconciliation collision
  - Empty state per sub-category: "No [subcategory] listings yet — know one? Add it!" + Add button
  - Load more: `onEndReached` at 80%
- [ ] `src/hooks/feed/useFeedExplore.ts` — infinite query for explore endpoint

#### Business Detail Screen
- [ ] `src/screens/business/BusinessDetailScreen.tsx`:
  - Route: `app/business/[slug].tsx` (thin wrapper)
  - Hero image: 240px, `expo-image` with blurhash placeholder
  - Business logo: 60px circle, absolute positioned overlapping hero bottom
  - Header overlay: transparent with back button + share icon
  - Status row: business name + halal badge + claimed badge + open status pill
  - Action row: `[Call]` `[Directions]` `[Save]` `[Share]` `[WhatsApp]`
    - Call: `Linking.openURL('tel:' + phone)` — hidden if no phone
    - Directions: opens Maps app with business address
    - Share: WhatsApp first-class (full card), then system share sheet
    - WhatsApp: `Linking.openURL('https://wa.me/?text=...')`
  - Tab bar below: Info / Photos
  - Info tab: description, address, hours (per-day grid), halal cert details
  - Photos tab: 2-column image grid (expo-image, tap to full-screen)
  - "Claim this business" banner (if !is_claimed): gold outline, bottom of info tab
  - Report button: bottom of screen, small ghost text

#### Event Detail Screen
- [ ] `src/screens/event/EventDetailScreen.tsx`:
  - Route: `app/event/[id].tsx`
  - Full-bleed 220px cover image
  - Date chip: colored by proximity ("Today!" rose, "Tomorrow" amber, "In 3 days" gray)
  - Mini-map snapshot (static Mapbox map image via Static Images API)
  - Organiser row: avatar + name + "by"
  - Price: "Free" (green) or price_label
  - RSVP link: external browser via `expo-web-browser`
  - Actions: `[Save]` `[Share]` `[Directions]` `[Report]`

#### Service Provider Detail Screen
- [ ] `src/screens/service/ServiceDetailScreen.tsx`:
  - Route: `app/service/[id].tsx`
  - Hero + logo (same pattern as BusinessDetail)
  - Service type chip + languages spoken badges + response time
  - Lead CTA bottom sheet:
    - `[Contact Provider]` primary button → opens bottom sheet
    - Sheet: pre-filled name + phone (from authStore), optional message (150 char)
    - `[Send Enquiry]` → `POST /v1/leads` → close sheet → toast "Enquiry sent"
    - Rate limit error (429) → toast "You've contacted this provider recently"

---

### Testing Tasks
- [ ] E2E: Open map → tap food pin → bottom sheet appears with correct business
- [ ] E2E: Swipe bottom sheet to 75% → full card shown → tap `[View Full Details]` → navigate to detail screen
- [ ] E2E: Explore → select "Services" tab → select "Legal" sub-category → results filter correctly
- [ ] E2E: Business detail → tap `[Call]` → phone dialer opens (test on device)
- [ ] E2E: Service detail → send enquiry → toast "Enquiry sent" + lead appears in admin dashboard
- [ ] Snapshot: Map category chips render correctly
- [ ] Performance: Map pins load < 500ms after viewport change (check network tab)
- [ ] Regression: Save toggle on detail screen propagates back to feed card (cache invalidation)

### Acceptance Criteria
- [ ] Map loads Devon Ave pins within 2 seconds of screen open
- [ ] Pin tap → bottom sheet opens at 35% with correct preview within 500ms
- [ ] Cluster bubbles appear when zoomed out past zoom level 13
- [ ] Explore filter by subcategory returns only matching items
- [ ] Business detail shows correct open/closed status (tested at closing time)
- [ ] Lead submission from service screen creates record in DB + business owner gets push
- [ ] Back navigation from detail screen returns to correct scroll position in feed

### Risk Flags
| Risk | Mitigation |
|---|---|
| Mapbox SDK bundle size too large | Use `@rnmapbox/maps` slim build; check Hermes bundle analysis |
| Custom teardrop pin images not loading | Pre-register all images in `MapScreen` `onDidFinishLoadingMap` callback |
| Bottom sheet conflicts with gesture handler on Android | Test on Android 14; configure `overScrollMode='never'` on ScrollView inside sheet |

---

## Sprint 7: Mobile — Profile, Create Flow & Polish
**Duration:** 5 days (Week 7)
**Objective:** Users can create content, manage their profile, see their notifications, and share content via WhatsApp. The app feels complete end-to-end.

---

### Mobile Tasks

#### Create Flow (Modal Stack)
- [ ] `app/create/_layout.tsx` — modal stack root
- [ ] `app/create/index.tsx` — picker screen (which type: Event / Listing / Post)
- [ ] `src/screens/create/CreatePickerScreen.tsx`:
  - 3 large option cards: "Add an Event", "Add a Business/Service", "Share with the community"
  - Each card: large icon + title + subtitle + arrow
  - Tap → push to respective create form
- [ ] `src/screens/create/CreateEventScreen.tsx`:
  - React Hook Form + Zod schema from `packages/types`
  - Fields: title, category dropdown, starts_at (date+time picker), location (address autocomplete using Mapbox)
  - Optional: description, end time, cover image, is_free/price toggle, external link
  - Image picker: `expo-image-picker` → resize to max 1200px (`expo-image-manipulator`) → presign → PUT → confirm
  - Upload progress: animated progress bar
  - Submit: `POST /v1/events` → 202 toast: "Event submitted for review — usually approved in under an hour" → navigate back
  - Form validation: live inline errors after blur (React Hook Form `mode: 'onBlur'`)
- [ ] `src/screens/create/CreateBusinessScreen.tsx`:
  - Similar pattern to CreateEvent
  - Fields: name, category, subcategory, address (Mapbox autocomplete), phone, halal_status radio group
  - Optional: description, website, Instagram handle, cover photo
  - Submit: `POST /v1/businesses` → 202 toast
- [ ] `src/screens/create/CreatePostScreen.tsx`:
  - Simpler: text area (500 char counter), post_type chip selector, optional photo
  - Neighborhood auto-detected from `locationStore` (shown as badge, tappable to change)
  - 5-posts-per-hour rate limit handled: if 429 received → toast "Slow down! Try again in [X] minutes"
  - Submit: `POST /v1/posts` → 201/202 toast → navigate back

#### User Profile Screen
- [ ] `src/screens/profile/ProfileScreen.tsx`:
  - Avatar (80px, deterministic color fallback) + display name + neighborhood badge + "Member since" date
  - Stats row: Posts count / Saves count (tappable → navigates to respective list)
  - Tab bar: "My Posts" / "My Events"
  - Each tab: FlashList of own posts/events
  - Settings CTA: gear icon in top right
- [ ] `src/screens/profile/EditProfileScreen.tsx`:
  - Avatar picker: camera / photo library → resize → upload
  - Name input (40 char), bio textarea (160 char), neighborhood picker
  - Save: `PATCH /v1/users/me` → toast "Profile updated"
- [ ] `src/screens/profile/SettingsScreen.tsx`:
  - List items: Edit Profile, My Neighborhood, Notifications, Privacy & Data, Help, Delete Account, Log Out
  - Log Out: Clerk `signOut()` → clear all Zustand stores → navigate to `(auth)`
  - Delete Account: confirmation modal → `DELETE /v1/auth/me` → log out

#### Saved Items Screen
- [ ] `src/screens/saved/SavedScreen.tsx`:
  - Tab bar: All / Food / Events / Services / Posts
  - FlashList per tab
  - Event cards show countdown chips:
    - "In 3 days" — gray
    - "Tomorrow" — amber
    - "Today!" — rose pulse
    - "Passed" — grayed out, moved to "Past Events" section header
  - Unavailable items (deleted/cancelled): faded card + "No longer available" caption
  - Empty state: "Nothing saved yet — star items to save them here"

#### Notifications Screen
- [ ] `src/screens/notifications/NotificationsScreen.tsx`:
  - FlashList of notifications (newest first)
  - Each item: icon by type + title + body + relative time
  - Unread: slightly lighter background
  - Tap → mark read + navigate to deep link target
  - "Mark all read" button in header
  - Empty state: "You're all caught up"
- [ ] `src/screens/notifications/NotificationPreferencesScreen.tsx`:
  - Toggle switches: New nearby event / Event day reminder / Lead alerts / Quiet hours toggle
  - Quiet hours: time pickers for start/end (if toggle is on)
  - Save: `PATCH /v1/notifications/preferences`

#### Search Screen
- [ ] `src/screens/search/SearchScreen.tsx`:
  - Search bar (auto-focused on mount, clear button)
  - 2-char minimum before API call, 300ms debounce
  - Result tabs: All / Food / Events / Services
  - Result count label
  - Recent searches list (empty query state): from MMKV, last 5
  - Clear recent searches button
  - Offline: cached results + banner
  - Empty results: "No results for '[query]'" + "Expand to all of Chicago?" CTA
- [ ] `src/hooks/search/useSearch.ts` — debounced query hook with MMKV recent searches

#### WhatsApp Share
- [ ] `src/lib/share.ts`:
  - `shareToWhatsApp(item)` — generates message with name + address + distance + `muzgram://` deep link
  - `shareViaSheet(item)` — `Share.share()` (fallback)
- [ ] Share button pattern: WhatsApp icon first (primary), share icon second (secondary)
- [ ] Deep link format in share text: `muzgram://business/noon-o-kabab` — opens app or prompts install

#### Halal Badge Education
- [ ] Tap on halal badge → bottom sheet explaining tier system:
  - "IFANCA Certified" — most trusted, Chicago-based inspections
  - "ISNA Certified" — national certification
  - "Self-Declared Halal" — business's own claim, not third-party verified
  - "Status Unknown" — hasn't provided certification info yet
  - "Learn more about halal certification" → external browser link

---

### Testing Tasks
- [ ] E2E: Create event → form validation fires on submit with empty title → inline error visible
- [ ] E2E: Create event → submit → 202 toast → appears in admin approval queue
- [ ] E2E: Create post → rate limit on 6th post → correct error toast
- [ ] E2E: Save a business → view in Saved screen → unsave → disappears from Saved screen
- [ ] E2E: Event expires (past start time) → moves to "Passed" section in Saved
- [ ] E2E: Share business via WhatsApp → WhatsApp opens with correct message text
- [ ] E2E: Search "halal" → results appear within 500ms
- [ ] E2E: Log out → clear session → redirect to phone screen

### Acceptance Criteria
- [ ] Event create form validates: past date → error, no title → error, all good → submits
- [ ] Image upload in create form: picks image, shows upload progress, confirms on success
- [ ] WhatsApp share message contains business name, distance, and deep link
- [ ] Search results appear within 500ms of 300ms debounce completing
- [ ] Saved event with countdown chip shows correct label on the correct day
- [ ] Settings → Delete Account → 202 received → logged out → cannot log back in for 30 days
- [ ] Notification tap → navigates to correct screen via deep link

### Risk Flags
| Risk | Mitigation |
|---|---|
| `expo-image-picker` permissions on Android 13+ changed | Handle `MEDIA_LIBRARY` vs `READ_MEDIA_IMAGES` permission split |
| Mapbox address autocomplete latency on slow connections | Show typed address as fallback option if autocomplete >2s |
| WhatsApp deep link format changes | Test on iOS + Android before launch; have share sheet as fallback |

---

## Sprint 8: Admin Dashboard
**Duration:** 5 days (Week 8, parallel with Sprint 7 polish or start of Week 9)
**Objective:** Founder/admin can approve content, manage featured slots, view KPIs, and manage all data from a web dashboard without touching the database.

---

### Admin Dashboard Tasks

#### Foundation
- [ ] Clerk auth wired: `<ClerkProvider>` + `<SignIn>` redirect for non-authenticated
- [ ] Role check: on load, fetch `/v1/auth/me` — if role not in `['admin', 'moderator', 'super_admin']` → redirect to `/unauthorized`
- [ ] Sidebar navigation:
  - Items: Overview, Approval Queue, Businesses, Events, Posts, Users, Featured, Leads, Settings
  - Active state highlight
  - Collapsible on mobile viewport
- [ ] TanStack Query wired with 30s `staleTime` defaults
- [ ] Global error toast (react-hot-toast)
- [ ] Shared `AdminApiClient` — Axios instance with Clerk JWT injection

#### Overview Page (KPI Dashboard)
- [ ] Metric cards (auto-refresh every 60s):
  - New users today
  - Pending approvals (with urgency color: 0=green, 1-5=amber, 6+=red)
  - New listings this week
  - Active events
  - Leads this week
  - Featured slots active (X of 6)
- [ ] Quick actions: "Go to Approval Queue" CTA if pending > 0
- [ ] Recent activity feed: last 10 moderation actions (who approved what)

#### Approval Queue Page
- [ ] Unified queue: businesses + events + posts + claims — sorted oldest first
- [ ] Filter tabs: All / Businesses / Events / Posts / Claims
- [ ] Each queue item card shows:
  - Content preview (title, category, submitter name, submitted time)
  - Countdown since submission (amber if >1h, red if >4h — SLA tracking)
  - Three action buttons: `[✓ Approve]` `[✗ Reject]` `[✎ Edit & Approve]`
- [ ] Approve: `POST /v1/admin/queue/{type}/{id}/approve` → item disappears from queue → success toast
- [ ] Reject: opens modal with reject reason dropdown + optional note → `POST /v1/admin/queue/{type}/{id}/reject`
- [ ] Edit & Approve: opens inline edit form → save + approve in one call
- [ ] Real-time queue: auto-refetch every 30 seconds (shows new submissions without page reload)
- [ ] Keyboard shortcut: `a` = approve, `r` = reject (when item is focused)

#### Content Management Pages (Businesses, Events, Posts)
- [ ] TanStack Table v8 with:
  - Server-side pagination (cursor-based via API)
  - Column sorting (click header)
  - Column filters: search bar + status dropdown + category dropdown
  - Row actions: Edit, Feature/Unfeature, Soft Delete
- [ ] Business table columns: Name, Category, Halal Status, Status, Claimed, City, Created, Actions
- [ ] Event table columns: Title, Category, Date, Status, City, Created, Actions
- [ ] Post table columns: Type, Snippet, Author, Status, City, Expires, Actions
- [ ] Inline edit: click row → expand inline form (name, status, halal_status, is_featured)
- [ ] Business hours editor: per-day time pickers grid (7 rows × opens/closes)

#### Featured Slot Management Page
- [ ] 6 slot grid (2 Now feed, 2 Explore header, 2 Map gold pins)
- [ ] Each slot card:
  - Current occupant: thumbnail + name + "featured since" date
  - "Featured until" date (if set)
  - Actions: `[Replace]` `[Remove]` `[Extend 7 days]`
  - Empty slot: dashed border + `[+ Assign Content]` button
- [ ] Replace/Assign: search modal → type to search businesses/events → select → confirm
- [ ] Drag-and-drop reordering between slots (react-beautiful-dnd)
- [ ] `PATCH /v1/admin/featured/:slotId` → updates slot assignment

#### User Management Page
- [ ] User table: Name, Phone, Role, City, Created, Status, Actions
- [ ] Actions: View profile, Change role (dropdown), Suspend/Unsuspend
- [ ] Role change: `PATCH /v1/admin/users/:id/role` → `{ role: 'user' | 'business_owner' | 'moderator' }`
- [ ] Suspend: `POST /v1/admin/users/:id/suspend` → `{ reason }` → user's JWT invalidated on next request

#### Leads Management Page
- [ ] Leads table: Business, User, Phone, Message snippet, Status, Created
- [ ] Filter: by business, by status
- [ ] Useful for manual follow-up / dispute resolution

---

### Backend Tasks (supporting Admin Dashboard)

- [ ] `GET /v1/admin/kpis` — aggregated KPI data (protected, admin only):
  - `newUsersToday`, `pendingApprovals`, `newListingsThisWeek`, `activeEvents`, `leadsThisWeek`, `featuredSlotsActive`
  - Computed with PostgreSQL aggregates (no Redis cache — small query)
- [ ] `GET /v1/admin/activity` — recent moderation actions (last 20):
  - Joins: `moderation_actions` + `users` (moderator) + target item
- [ ] `PATCH /v1/admin/users/:id/role` — change user role:
  - Auth: `super_admin` only
  - Validates: cannot demote another super_admin
- [ ] `POST /v1/admin/users/:id/suspend` — suspend user:
  - Sets `is_suspended = true`, `suspended_reason`
  - Clerk suspend via Clerk Admin API (invalidates active sessions)
- [ ] `GET /v1/admin/featured` — list all 6 featured slots with current occupants
- [ ] `PATCH /v1/admin/featured/:slotId` — assign/replace slot:
  - Input: `{ targetType, targetId, featuredUntil? }`
  - Updates `businesses.is_featured` / `events.is_featured`
  - Invalidates feed cache for that slot's city
  - Returns updated slot

---

### Testing Tasks
- [ ] E2E (Playwright): Log in to admin → Queue shows pending items → Approve → item disappears from queue
- [ ] E2E: Reject with reason → business owner receives push with reason
- [ ] E2E: Featured slot → Replace → new business appears in Now feed at position 0 (mobile)
- [ ] E2E: User suspension → suspended user's next API call returns `403`
- [ ] Integration test: `GET /v1/admin/kpis` returns correct counts matching DB state
- [ ] Integration test: Non-admin user accessing `GET /v1/admin/queue` returns `403`
- [ ] Cross-system test: Admin approves business → appears in mobile feed within 2 minutes (cache TTL expiry)

### Acceptance Criteria
- [ ] Non-admin Clerk user redirected to `/unauthorized` — cannot access any admin page
- [ ] Approval queue shows items oldest-first; approving removes item from queue instantly
- [ ] Featured slot assignment changes are reflected in mobile feed within 2 minutes
- [ ] Leads table shows all leads with business name, submitter phone, message
- [ ] KPI dashboard refreshes automatically every 60 seconds
- [ ] Keyboard shortcut `a` on queue item triggers approve action

### Risk Flags
| Risk | Mitigation |
|---|---|
| Drag-and-drop library conflict with TanStack Table | Use react-beautiful-dnd only on Featured page; TanStack Table on data pages |
| Clerk admin SDK rate limits on user management | Cache user list; avoid polling user data |
| Admin can approve same item twice (race condition) | Backend `moderation_actions` idempotency check — second approve is no-op |

---

## Sprint 9: Search, Notifications Polish & Business Owner Portal
**Duration:** 4 days (Week 9)
**Objective:** Tie up all remaining MVP features: business owner portal, notification center polish, search completeness, and the reports/moderation cycle fully working.

---

### Backend Tasks

#### Business Owner Portal APIs
- [ ] `GET /v1/businesses/mine` — business owner's own listings:
  - Auth: `business_owner` role
  - Returns all businesses claimed by this user
- [ ] `GET /v1/businesses/:id/stats` — basic analytics:
  - Returns: `{ viewsThisWeek, savesThisWeek, leadsThisWeek, viewsTotal }`
  - Computed from `analytics_events` table
  - Cache: 1 hour TTL
- [ ] `GET /v1/businesses/:id/leads` — lead inbox (business owner's perspective):
  - Auth: own business only
  - Returns leads with name, phone, message, timestamp, status

#### Moderation Cycle (Admin)
- [ ] `GET /v1/admin/reports` — pending reports list (already built in Sprint 4, now wired to admin dashboard)
- [ ] Admin Reports page: filter by type, view report details, resolve with one click
- [ ] Auto-flag: if a business receives 5 reports → auto-suspends listing + creates admin task

#### Push Notification Edge Cases
- [ ] Quiet hours enforcement: `NearbyEventNotificationJob` checks `America/Chicago` time before sending
- [ ] Push token expiry handling: if Expo push returns `DeviceNotRegistered` → mark token inactive, remove from DB
- [ ] Cancelled event reminder suppression: before sending "Event tomorrow" push, verify event not cancelled

---

### Mobile Tasks

#### Business Owner Portal (In-App)
- [ ] Profile screen: if `authStore.user.role === 'business_owner'` → show "My Business" tab
- [ ] `src/screens/business/MyBusinessScreen.tsx`:
  - Preview card of claimed business (same as BusinessCard)
  - Stats: Views this week / Saves this week / Leads this week
  - CTAs: `[Edit Listing]` `[View Leads]`
- [ ] `src/screens/business/EditListingScreen.tsx`:
  - Pre-populated form with current business data
  - Minor edit fields: phone, hours, photos
  - Major edit indicator: "Address changes require admin review"
  - Submit: `PATCH /v1/businesses/:id` with ETag
- [ ] `src/screens/business/LeadInboxScreen.tsx`:
  - List of received leads: name, phone, message, time
  - Status tabs: New / Contacted / Closed
  - Tap row: bottom sheet with full lead details + `[Call directly]` button
  - Mark as contacted: swipe right action

#### Halal Radar (Bonus Feature — if time allows)
- [ ] Quick-access screen: `app/radar.tsx`
- [ ] `src/screens/radar/HalalRadarScreen.tsx`:
  - No navigation, no filters — just open restaurants within 1 mile
  - FlashList sorted by distance
  - Each item: name, distance, halal badge, "Open until X" — one-tap `[Directions]`
  - Empty: "Nothing open within 1 mile right now — try expanding to 3 miles"
- [ ] Accessible via: long-press Map tab icon in tab bar

---

### Testing Tasks
- [ ] Integration test: Business with 5 reports → `is_featured = false` + admin task created
- [ ] Integration test: Push token `DeviceNotRegistered` → token removed from DB
- [ ] E2E: Business owner logs in → sees "My Business" tab → edits phone → change is live immediately
- [ ] E2E: Business owner sees leads with correct status after marking one as "contacted"
- [ ] E2E: Cancel a saved event → push received → event grayed out in Saved screen

### Acceptance Criteria
- [ ] Business owner can edit phone/hours from in-app portal without admin review
- [ ] Address edit shows "pending review" indicator — not live immediately
- [ ] Lead inbox shows newest leads first
- [ ] 5-report auto-flag removes business from feed + notifies admin
- [ ] Quiet hours prevent push delivery (verified: job created but not sent before 7am)

---

## Sprint 10: QA, Performance & Launch Readiness
**Duration:** 5 days (Week 10)
**Objective:** The app is production-ready. Performance is verified. App Store assets are submitted. Monitoring is live. Seed data is real. Launch checklist is complete.

---

### Performance Pass

#### Backend
- [ ] Run `EXPLAIN ANALYZE` on top 5 queries:
  - `GET /v1/feed/now` — verify city_id index hit first
  - `GET /v1/map/pins` — verify ST_MakeEnvelope index hit
  - `GET /v1/restaurants?open_now=true` — verify operating_hours join efficiency
  - `GET /v1/search?q=halal` — verify GIN index used for tsvector
  - `GET /v1/saves/check` — verify UNIQUE index hit
- [ ] All queries must complete in <200ms at 1000 seed rows
- [ ] Load test with k6:
  - 50 concurrent users hitting `GET /v1/feed/now` for 60 seconds
  - Target: p95 response time <500ms, zero 5xx errors
  - Test: `GET /v1/map/pins` with 10K pins in DB
- [ ] Redis cache warm-up:
  - On deploy: pre-warm `GET /v1/feed/now` for Chicago with default West Ridge coords
  - Verify cache hit rate >90% after warm-up
- [ ] Connection pool configured: PgBouncer pool mode = transaction, max 25 connections
- [ ] Bull queue concurrency configured: notification = 10, moderation = 5, analytics = 20

#### Mobile
- [ ] Hermes bundle size check: total JS bundle <10MB
- [ ] `expo-image` blurhash loaded on all images (no blank white boxes)
- [ ] FlashList `estimatedItemSize` tuned per card type (measure with DevTools)
- [ ] `InteractionManager.runAfterInteractions` on heavy screen mounts
- [ ] Memory leak check: navigate through all screens 10 times, check memory profile in Expo DevTools
- [ ] Android performance: test on mid-range device (Pixel 6a or Samsung A54)
- [ ] iOS performance: test on iPhone 13 and iPhone SE 3rd gen

---

### Error Monitoring Setup
- [ ] Sentry DSN configured in NestJS (`@sentry/nestjs`):
  - All unhandled exceptions captured
  - User ID attached to Sentry events via `ClerkAuthGuard`
  - Correlation ID attached to Sentry events
  - Filter out: `ClerkExpiredJWT` errors (noise — these are normal)
- [ ] Sentry DSN configured in Expo (`@sentry/react-native`):
  - All uncaught JS exceptions captured
  - Redux/Zustand state breadcrumbs
  - Release tracking wired to `app.json` version number
- [ ] Sentry alert rules:
  - New error type: notify immediately (Slack + email)
  - Error rate >10/min: alert
  - API p95 latency >2s: alert

---

### Security Audit
- [ ] Input sanitization review: all DTOs use class-validator; no raw string interpolation in SQL
- [ ] Rate limiting verified on:
  - `POST /v1/auth` — 10/15min per IP
  - `POST /v1/posts` — 5/hour per user
  - `POST /v1/leads` — 3/week per user per business
  - `POST /v1/media/presign` — 20/hour per user
- [ ] Helmet headers configured: CSP, HSTS, X-Frame-Options, X-Content-Type-Options
- [ ] CORS locked to: `https://app.muzgram.com`, `https://admin.muzgram.com`
- [ ] R2 bucket: public read only for `media.muzgram.com/*`; write requires signed URL
- [ ] Admin routes: role check from DB row on every request (not from JWT claim)
- [ ] `X-Idempotency-Key` validation: reject duplicate POST within 24h window
- [ ] SQL injection test: run sqlmap against staging API (basic scan)

---

### Real Seed Data (Pre-Launch)
The app must never launch with placeholder data. These must be real, verified, accurate.

- [ ] **Minimum 25 real Devon Ave businesses** entered, approved, active:
  - 10 halal restaurants (with correct hours, phone, halal status)
  - 5 service providers (financial, legal, real estate, healthcare, auto)
  - 3 mosques (with correct prayer times, Jummah info)
  - 3 grocery/specialty stores
  - 2 dessert/bakery spots
  - 2 event venues
- [ ] All businesses: correct operating hours, phone numbers, addresses verified on Google Maps
- [ ] Halal certifications: only use known sources (IFANCA list, ISNA list, or founder-verified)
- [ ] **5 upcoming events** (real community events if possible, or test events with realistic data)
- [ ] **3 featured businesses** pre-assigned to featured slots
- [ ] All media: real photos (with permission — founders can photograph businesses personally)

---

### App Store Preparation

#### iOS (TestFlight → App Store)
- [ ] `app.json` configured:
  - `bundleIdentifier: 'com.muzgram.app'`
  - `buildNumber: '1'`
  - `version: '1.0.0'`
  - `infoPlist`: location usage descriptions, camera usage, photo library usage, push notification entitlements
- [ ] App icons: 1024×1024 PNG + all required sizes (use Expo's icon pipeline)
- [ ] Splash screen: dark background (#0F0F11) + Muzgram logo (centered)
- [ ] App name: "Muzgram"
- [ ] `eas.json` configured for production build profile
- [ ] `eas build --platform ios --profile production` — production build
- [ ] TestFlight: internal test (yourself + 2 others) — 48h validation
- [ ] App Store metadata:
  - Subtitle: "Discover Local Muslim Life"
  - Description: 500 word description (copy from product-vision.md)
  - Keywords: halal food, muslim community, chicago, devon ave, islamic events
  - Category: Food & Drink (primary), Lifestyle (secondary)
  - Age rating: 4+ (no objectionable content)
  - Privacy policy URL: `muzgram.com/privacy`
  - Support URL: `muzgram.com/support`
- [ ] App Store screenshots: 6.7" (iPhone 15 Pro Max), 6.1" (iPhone 14), 5.5" (iPhone 8 Plus)
  - Required screens: Home feed, Map, Business detail, Event detail, Saved items
  - Use Expo's screenshot tool or Figma device frames

#### Android (Play Store)
- [ ] `app.json`: `package: 'com.muzgram.app'`, `versionCode: 1`
- [ ] `eas build --platform android --profile production` — AAB build
- [ ] Play Store internal testing track → closed testing → production
- [ ] Play Store listing: same copy as App Store
- [ ] Feature graphic: 1024×500 banner (dark, Muzgram brand colors)

---

### Launch Day Runbook

#### T-minus 48h
- [ ] Final production build submitted to both App Stores
- [ ] Staging environment smoke test: onboarding → feed → map → create → save
- [ ] All 25 seed businesses verified with live photos
- [ ] Admin dashboard: all featured slots assigned
- [ ] Sentry verified: test error reaches dashboard within 60 seconds
- [ ] Push notification test: send test push to internal team devices
- [ ] DNS: `api.muzgram.com`, `admin.muzgram.com`, `muzgram.com` all resolving correctly

#### T-minus 24h
- [ ] App approved by Apple / Google (submit at T-72h to account for review time)
- [ ] Invite 20 beta users (Devon Ave community contacts) via TestFlight
- [ ] Pre-load admin queue: review any pending content from beta users
- [ ] Brief admin team on approval SLAs: events <1h, businesses <4h, claims <24h

#### T=0 (Launch)
- [ ] Set `status = 'live'` on all 25 seed businesses (if they were in `pending_review`)
- [ ] Post launch announcement in community channels (WhatsApp groups, Instagram)
- [ ] Monitor Sentry dashboard for first 2 hours
- [ ] Monitor API logs for any 5xx spikes
- [ ] Keep admin queue open — expect 10-20 new submissions in first 24h

#### T+24h
- [ ] Review analytics: DAU, session length, onboarding completion rate
- [ ] Address any critical bugs (P0: app crash, P1: broken core flow)
- [ ] Post "We're live!" to Devon Ave business owners via WhatsApp

---

### Final Launch Checklist

**Backend**
- [ ] `NODE_ENV=production` set
- [ ] All secrets in environment (no hardcoded keys)
- [ ] Database backups scheduled (daily automated)
- [ ] `VACUUM ANALYZE` run on all tables post-seeding
- [ ] Health check endpoint responding
- [ ] API reachable via `https://api.muzgram.com/v1/health`

**Mobile**
- [ ] No `console.log` in production build
- [ ] Sentry source maps uploaded for this release
- [ ] Deep links tested on both iOS and Android
- [ ] Push notifications tested on both platforms
- [ ] Location permission flow tested on cold start (no previous permission)
- [ ] Offline mode tested: airplane mode → cached feed visible

**Admin**
- [ ] Admin dashboard deployed to Vercel
- [ ] Approval queue auto-refreshes every 30s
- [ ] Founder can log in with their Clerk account
- [ ] Featured slots assigned

**Legal/Operations**
- [ ] Privacy policy page live at `muzgram.com/privacy`
- [ ] Terms of service page live at `muzgram.com/terms`
- [ ] Business listing disclaimer: "Muzgram does not guarantee halal certification — always verify with the business"

---

## Sprint Summary Table

| Sprint | Duration | Focus | Key Output |
|---|---|---|---|
| **Sprint 0** | 3 days | Tooling + scaffold | Monorepo, CI, all scaffolds running |
| **Sprint 1** | 5 days | DB + Auth | 44 tables migrated, OTP auth works, seed data |
| **Sprint 2** | 5 days | Content APIs | Business/Event/Post CRUD + admin approval queue |
| **Sprint 3** | 5 days | Feed + Geo + Map | Now feed, Explore, Map pins — performant |
| **Sprint 4** | 5 days | Engagement + Notifs | Saves, Leads, Reports, Push notifications |
| **Sprint 5** | 5 days | Mobile Auth + Feed | Onboarding → Now feed end-to-end |
| **Sprint 6** | 5 days | Mobile Map + Explore | Map, Explore, Business/Event/Service detail |
| **Sprint 7** | 5 days | Mobile Profile + Create | Create flow, Profile, Saved, Search |
| **Sprint 8** | 5 days | Admin Dashboard | Approval queue, Featured slots, KPIs |
| **Sprint 9** | 4 days | Business Owner Portal | In-app owner portal, notification polish |
| **Sprint 10** | 5 days | QA + Launch | Performance, security, App Store, launch |

**Total: ~52 engineering days (solo) or ~27 days (2-person team)**

---

## Parallel Track Strategy (2-Person Team)

For maximum velocity with 2 engineers:

```
Week 1:  Both on Sprint 0 (1 day) + Sprint 1 split (Backend: DB + Auth / Mobile: Scaffold + Design System)
Week 2:  Backend: Sprint 2 APIs / Mobile: Continues Design System + Card Components
Week 3:  Backend: Sprint 3 Feed+Map APIs / Mobile: Sprint 5 (Auth + Feed screens)
Week 4:  Backend: Sprint 4 Engagement APIs / Mobile: Sprint 6 (Map + Explore screens)
Week 5:  Backend: Sprint 9 polish / Mobile: Sprint 7 (Profile + Create)
Week 6:  Both on Sprint 8 (Admin Dashboard — founder leads, engineer supports)
Week 7:  Both on Sprint 10 (QA + performance + App Store)
```

**Key insight:** Mobile can start screens as soon as APIs are available on staging. Use mock data (`src/api/__mocks__`) for screens that aren't yet backed by a live endpoint.

---

## Technical Debt Log Template

Track deferred decisions here — don't let them get forgotten:

| Item | Sprint Deferred | Deferred From | Impact | Owner |
|---|---|---|---|---|
| Typesense migration | MMP | Sprint 3 | Search quality | Backend |
| Stripe billing | MMP | — | Monetization | Founder |
| Comments/likes | MMP | — | Engagement | Backend |
| Ramadan Mode activation | MMP | — | Retention | Full team |
| Jummah screen | MMP | — | Friday habit | Mobile |
| Analytics dashboard (business-facing) | MMP | Sprint 8 | Monetization | Full team |
| Redis cluster (high availability) | Phase 3 | Sprint 1 | Reliability | DevOps |
| Read replicas | Phase 3 | Sprint 1 | Scale | DevOps |

---

## Definition of Done — Sprint Gates

Before closing any sprint, ALL of the following must be true:

**Code Quality**
- [ ] Zero TypeScript errors in all packages
- [ ] Zero ESLint errors or warnings
- [ ] All PRs merged with review sign-off
- [ ] No `TODO:` comments left in sprint-authored code

**Testing**
- [ ] All integration tests for sprint endpoints passing
- [ ] No previously-passing test is now failing (zero regressions)
- [ ] Sprint acceptance criteria items checked off (every single one)

**Demo-ability**
- [ ] The sprint's feature can be demonstrated end-to-end on a staging device
- [ ] Founder has personally tested the feature on a real phone (not simulator)

**Deployability**
- [ ] Staging environment reflects all sprint changes
- [ ] `.env.example` updated with any new environment variables
- [ ] `packages/types` updated with any new shared types

---

*This plan is a living document. Update sprint status inline as work completes. When a sprint is done, mark the objective ✅ and note actual completion date vs planned.*
