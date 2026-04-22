# Muzgram — Build Roadmap

> Last updated: 2026-04-21
> MVP → MMP → Production-Ready

---

## Phase 1: MVP — "Prove the Loop"

**Timeline:** 8 weeks
**Goal:** One suburb cluster (Devon Ave, Chicago). Real users. Real content. Real retention.
**Team:** 1–2 engineers + founder

### Weekly Build Order

#### Week 1: Foundation
- [ ] Monorepo setup (Turborepo): apps/mobile, apps/api, apps/admin, packages/types, packages/constants
- [ ] NestJS project scaffold with module structure
- [ ] PostgreSQL database setup (Supabase or AWS RDS)
- [ ] PostGIS extension enabled
- [ ] Database migrations (all 44 tables)
- [ ] Seed data: Chicago city, West Ridge neighborhood, test businesses
- [ ] Clerk auth integration (phone OTP)
- [ ] JWT validation middleware in NestJS
- [ ] Expo React Native project setup with design system constants
- [ ] Theme file: colors, typography, spacing, radius, animation

#### Week 2: Content APIs
- [ ] Business listings CRUD API (NestJS)
- [ ] Events CRUD API
- [ ] Community posts CRUD API
- [ ] Location geocoding (Mapbox Geocoding API integration)
- [ ] Media upload API (Cloudflare R2 presigned URLs)
- [ ] Admin moderation endpoints (approve/reject/feature)
- [ ] Halal status management endpoints

#### Week 3: Feed APIs
- [ ] Now feed API (proximity + recency sort, PostGIS ST_DWithin)
- [ ] Explore API (category + sub-category filter)
- [ ] Map pins API (bounding box query, clustering data)
- [ ] Featured listings injection into feed
- [ ] Open/closed calculation service (operating hours + timezone)
- [ ] Feed pagination (cursor-based)

#### Week 4: Engagement APIs
- [ ] Saves API (create/delete, by type)
- [ ] Leads API (create lead, notify business owner)
- [ ] Reports API
- [ ] Notifications service (Expo Push + Bull queue)
- [ ] Push token management
- [ ] Deep link schema definition

#### Week 5: React Native — Auth + Feed
- [ ] Onboarding screens (4 screens: phone, OTP, location, name)
- [ ] Location permission flow
- [ ] Now Feed screen (feature card + compact cards + category chips)
- [ ] Live Now strip component
- [ ] Card components (FeatureCard, CompactCard, EventCard, PostCard)
- [ ] Skeleton loaders
- [ ] Category chip component
- [ ] Pull to refresh

#### Week 6: React Native — Map + Explore
- [ ] Mapbox setup (@rnmapbox/maps) with custom dark style
- [ ] Map screen (full-screen, category filter, re-center FAB)
- [ ] Custom pin markers (teardrop SVG per category)
- [ ] Pin clustering
- [ ] Bottom sheet on pin tap (35% / 75% snap)
- [ ] Explore screen (category tabs + sub-category chips + list)
- [ ] Business profile screen
- [ ] Event detail screen
- [ ] Floating tab bar (pill shape, glass effect)

#### Week 7: React Native — Profile + Posting
- [ ] User profile screen
- [ ] Edit profile screen
- [ ] Saved items screen (tabs, event countdown)
- [ ] Post creation flow (event / business listing / community post)
- [ ] Image picker + upload
- [ ] Notification preferences screen
- [ ] Deep link handling (muzgram://)
- [ ] WhatsApp share integration

#### Week 8: Admin Dashboard + Polish
- [ ] React + Vite admin app scaffold
- [ ] Approval queue (businesses, events, posts)
- [ ] Featured slot management (drag-and-drop)
- [ ] Business/event/post CRUD tables
- [ ] User management
- [ ] Lead management table
- [ ] KPI overview screen
- [ ] End-to-end testing (push notifications, deep links, map)
- [ ] Performance pass (image lazy loading, feed caching with Redis)
- [ ] App Store + Play Store submission

---

## Phase 2: MMP — "Monetize the Loop"

**Timeline:** Weeks 9–20
**Goal:** Revenue, second city, sticky features

### Priority Order

**P0 — Revenue (Weeks 9–12)**
- [ ] Stripe integration (subscriptions + one-time payments)
- [ ] Promoted listings self-serve (businesses buy featured slots in-app)
- [ ] Business analytics dashboard (views, saves, leads, clicks)
- [ ] Founding member onboarding flow
- [ ] Invoice generation and email delivery

**P0 — Retention (Weeks 11–14)**
- [ ] Ramadan Mode (activated by ramadan_seasons table)
- [ ] Friday Finder / Jummah screen (mosques + jummah_times)
- [ ] Prayer time integration (prayer_time_cache from API)
- [ ] Notice Board (notice_board_posts)
- [ ] Halal Radar shortcut (open food within 1 mile)

**P1 — Engagement (Weeks 13–16)**
- [ ] Event "Interested" / RSVP button + attendee count
- [ ] Post reactions (like/helpful/love)
- [ ] Post comments (threaded, max 2 levels)
- [ ] Reviews + ratings for businesses
- [ ] Business daily specials (structured post type)

**P1 — Discovery (Weeks 15–18)**
- [ ] In-app search with autocomplete (Typesense integration)
- [ ] Advanced filters (open now, halal cert only, price range)
- [ ] Saved item collections / folders
- [ ] Home screen widget (iOS + Android) — Halal Radar

**P2 — Growth (Weeks 17–20)**
- [ ] Campaign Engine (Muslim Business Week)
- [ ] Referral / invite system
- [ ] City selector + second city launch (Bridgeview/Skokie)
- [ ] Business verified badge program
- [ ] Recurring events support (iCal RRULE)
- [ ] Event reminder notifications (24h before, 1h before)

---

## Phase 3: Production-Ready

**Timeline:** Weeks 21+
**Goal:** Scale infrastructure, harden security, add growth loops

### Infrastructure
- [ ] CDN for media (Cloudflare in front of R2)
- [ ] Redis cluster (feed caching, rate limiting, Bull queues)
- [ ] Database read replicas (high-read queries to replica)
- [ ] API rate limiting (per user, per IP, per endpoint)
- [ ] Error tracking (Sentry)
- [ ] APM (Datadog or New Relic)
- [ ] Structured logging (Winston + CloudWatch)
- [ ] Health check endpoints + uptime monitoring

### Security
- [ ] Input sanitization audit
- [ ] SQL injection prevention audit
- [ ] Rate limiting on auth endpoints (brute force prevention)
- [ ] Content moderation automation (image scanning via AWS Rekognition)
- [ ] GDPR/CCPA compliance (data export, deletion)
- [ ] PII encryption at rest

### Scale
- [ ] pg_partman for activity_logs automated partitioning
- [ ] Migrate search to Typesense cluster
- [ ] Background job processing (lead notifications, expiry sweeps, cache warming)
- [ ] Horizontal scaling (multiple API instances behind load balancer)
- [ ] Database connection pooling (PgBouncer)

### Growth
- [ ] Community Groups (local mosque groups, interest groups)
- [ ] Verified business badge program
- [ ] Advanced map clustering (real-time "happening now" pins)
- [ ] ML-based feed personalization (based on category preferences + past clicks)
- [ ] Business competitor analysis dashboard (admin only)
- [ ] Press / media kit page

---

## Tech Architecture

### Monorepo Structure
```
muzgram/
├── apps/
│   ├── mobile/          # React Native + Expo
│   │   ├── src/
│   │   │   ├── screens/
│   │   │   ├── components/
│   │   │   ├── navigation/
│   │   │   ├── hooks/
│   │   │   ├── services/ (API calls)
│   │   │   └── store/   (Zustand)
│   │   ├── assets/
│   │   └── app.json
│   │
│   ├── api/             # NestJS backend
│   │   ├── src/
│   │   │   ├── modules/
│   │   │   │   ├── auth/
│   │   │   │   ├── users/
│   │   │   │   ├── businesses/
│   │   │   │   ├── events/
│   │   │   │   ├── posts/
│   │   │   │   ├── feed/
│   │   │   │   ├── map/
│   │   │   │   ├── leads/
│   │   │   │   ├── notifications/
│   │   │   │   ├── promotions/
│   │   │   │   ├── saves/
│   │   │   │   ├── reports/
│   │   │   │   ├── admin/
│   │   │   │   ├── ramadan/
│   │   │   │   ├── jummah/
│   │   │   │   ├── campaigns/
│   │   │   │   └── geo/
│   │   │   ├── shared/
│   │   │   │   ├── guards/
│   │   │   │   ├── interceptors/
│   │   │   │   ├── decorators/
│   │   │   │   └── filters/
│   │   │   ├── database/
│   │   │   │   └── migrations/
│   │   │   └── main.ts
│   │   └── package.json
│   │
│   └── admin/           # React + Vite web app
│       ├── src/
│       │   ├── pages/
│       │   ├── components/
│       │   └── api/
│       └── package.json
│
├── packages/
│   ├── types/           # Shared TypeScript types
│   │   └── src/
│   │       ├── user.types.ts
│   │       ├── business.types.ts
│   │       ├── event.types.ts
│   │       └── index.ts
│   │
│   ├── constants/       # Design tokens + app constants
│   │   └── src/
│   │       ├── theme.ts
│   │       ├── categories.ts
│   │       ├── chicago.ts  (neighborhood list, bounds)
│   │       └── index.ts
│   │
│   └── utils/           # Shared utility functions
│       └── src/
│           ├── distance.ts
│           ├── hours.ts   (open/closed calculator)
│           ├── time.ts
│           └── index.ts
│
├── infra/
│   ├── docker-compose.yml  (local: postgres, redis, adminer)
│   ├── .env.example
│   └── migrations/
│
└── turbo.json
```

### API Module Structure (NestJS)
```
Each module contains:
  module.ts       — DI wiring
  controller.ts   — HTTP endpoints
  service.ts      — business logic
  dto/            — request/response DTOs (class-validator)
  entities/       — TypeORM entities
  repository.ts   — database queries
```

### State Management (Mobile)
```
Zustand stores:
  authStore       — user, token, onboarding state
  locationStore   — current GPS, home neighborhood, viewing area
  feedStore       — Now feed items, page cursor, category filter
  mapStore        — visible pins, selected pin, camera state
  notifStore      — unread count, preferences
```

---

## Environment Variables

```env
# API
DATABASE_URL=postgresql://user:pass@host:5432/muzgram
REDIS_URL=redis://localhost:6379
CLERK_SECRET_KEY=sk_...
CLERK_PUBLISHABLE_KEY=pk_...
MAPBOX_SECRET_TOKEN=sk.ey...
R2_ACCOUNT_ID=...
R2_ACCESS_KEY_ID=...
R2_SECRET_ACCESS_KEY=...
R2_BUCKET_NAME=muzgram-media
R2_PUBLIC_URL=https://media.muzgram.com
EXPO_PUSH_TOKEN=  # from Expo
STRIPE_SECRET_KEY=sk_...  # MMP
STRIPE_WEBHOOK_SECRET=whsec_...  # MMP

# Mobile
EXPO_PUBLIC_API_URL=https://api.muzgram.com
EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_...
EXPO_PUBLIC_MAPBOX_TOKEN=pk.ey...

# Admin
VITE_API_URL=https://api.muzgram.com
VITE_CLERK_PUBLISHABLE_KEY=pk_...
```

---

## Tech Decisions & Tradeoffs

| Decision | Choice | Alternative | Why |
|---|---|---|---|
| Auth | Clerk | Firebase Auth | Faster phone OTP setup, better Expo SDK |
| Backend | NestJS | Express | More structure, scales better with team |
| Maps | Mapbox | Google Maps | Custom dark style, ~60% cheaper at scale |
| Storage | Cloudflare R2 | AWS S3 | No egress fees — critical for media-heavy app |
| ORM | TypeORM | Drizzle, Prisma | Mature, NestJS-native, good migration tooling |
| State (mobile) | Zustand | Redux, Jotai | Simplest, least boilerplate, easy DevTools |
| Search (MVP) | PostgreSQL FTS | Typesense | No extra infra for MVP; migrate at 500K rows |
| Push | Expo Push | Direct FCM/APNS | Unified API, works on both platforms |
| Monorepo | Turborepo | Nx | Faster, simpler config, better Expo support |

---

## Day 1 Monetization Checklist

Before launch, sell manually:
- [ ] 5 Founding Member slots sold ($99 each = $495)
- [ ] 3 featured business agreements locked in ($75/week)
- [ ] 2 boosted events confirmed ($25 each)
- [ ] Total pre-launch revenue: ~$645

This proves demand before a single line of payment code is written.
