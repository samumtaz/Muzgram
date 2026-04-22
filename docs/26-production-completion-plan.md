# Muzgram — Full Production Completion Plan
## Starter Codebase → Launch-Ready Platform

> Audience: Principal engineer / CTO-level execution reference
> Status: Starter codebase complete. This document drives everything from here to launch.
> Last updated: April 2026

---

## PHASE A — Production Gap Assessment

Brutally honest accounting of what the starter codebase does NOT have.

### A1. Critical Gaps (blocks launch)

| Gap | Why It Blocks Launch | Severity |
|-----|----------------------|----------|
| No Stripe integration | Manual Zelle/Venmo doesn't scale past 20 businesses | P0 |
| No real analytics pipeline | Can't measure D7 retention, funnel, or monetization ROI | P0 |
| No full-text search | Users can't find content by name — city density irrelevant without search | P0 |
| apps/web doesn't exist | SEO layer is entirely missing. Zero organic traffic. | P0 |
| No CI/CD pipeline | Deployments are manual. One bad push = downtime. | P0 |
| Worker processors are stubs | Moderation, push delivery, and content expiry all no-ops | P0 |
| No audit logging | No admin action history. Compliance risk. | P0 |
| No staging environment | Testing against production DB is not acceptable | P0 |
| RBAC only partially enforced | Admin routes exist but role checks not applied consistently | P0 |
| No lead system built | Core monetization mechanic (paid leads) not implemented | P0 |

### A2. High-Severity Gaps (degrade UX severely)

| Gap | Impact |
|-----|--------|
| No notification center screen (mobile) | Push opens go nowhere. No inbox. |
| No search screen (mobile) | No way to find specific business or event by name |
| Map clustering not implemented | 200+ pins will crash render on low-end Android |
| No onboarding flow beyond auth | User drops after OTP — no neighborhood selection, no interest capture |
| No deep link handling | Shared links don't open in app |
| No empty states wired to real data | "Nothing near you" shows even when data exists |
| No error boundaries in mobile | One API failure crashes entire screen |
| No Sentry wired up | Crashes invisible in production |
| No provider onboarding flow | Businesses can't self-serve — everything is manual |
| No subscription/entitlement system | Featured logic is manual toggle, no billing attached |
| Admin dashboard missing: billing, analytics, city management, verification queue | Admin is essentially blind |
| No E2E tests | No safety net for regressions |
| No app store assets | Can't submit to App Store or Play Store |
| No privacy policy or terms page | App Store will reject without them |

### A3. Medium-Severity Gaps (acceptable at launch if prioritized post-week-1)

| Gap | Plan |
|-----|------|
| No review/ratings system | Deferred to MMP by design |
| No Typesense search | PostgreSQL FTS sufficient for MVP |
| No read replica | Single Supabase DB sufficient for <500 req/s |
| No Ramadan mode | Feature-flagged, activates automatically |
| No social sharing cards for web | OpenGraph covers basics |
| Photo moderation is stubbed (Vision API) | Auto-approve in MVP with manual review fallback |
| No data export for businesses | Deferred to MMP |
| No in-app purchase or subscription UI for businesses | Direct to web billing for MVP |

### A4. What the Starter Codebase Got Right

- Database schema + PostGIS — solid, production-appropriate
- Feed scoring algorithm — correct mental model, needs tuning not rebuild
- Auth flow (Clerk + webhook sync) — correct pattern
- Module structure (NestJS) — clean, extensible
- RFC 9457 error format — correct
- Cursor pagination — correct
- R2 media upload pattern (presign → upload → confirm) — correct
- NativeWind design system — applied consistently
- Turborepo monorepo — correct structure

---

## PHASE B — Backend Completion Roadmap

### B1. Scope

Complete the NestJS API from scaffolded to production-ready across 14 work streams.

### B2. Module List

```
NEW modules to create:
  apps/api/src/modules/
    billing/          ← Stripe subscriptions, featured seat purchases, lead packs
    leads/            ← Lead creation, delivery, tracking, cap enforcement
    search/           ← PostgreSQL FTS with tsquery, structured filters
    analytics/        ← Event ingest pipeline (POST /analytics/events)
    audit/            ← Append-only admin action log
    onboarding/       ← Business onboarding workflow (claim → verify → activate)
    notifications-center/  ← Notification inbox for users
    support/          ← User-facing support ticket creation
    admin-stats/      ← Aggregated dashboard metrics for admin

EXISTING modules to harden:
  auth/             ← RBAC guards, refresh handling, session invalidation
  users/            ← Soft delete, GDPR erasure, PII masking
  listings/         ← Full validation, slug uniqueness, claim workflow
  events/           ← Recurring event expansion, cancellation workflow
  moderation/       ← Full queue API, action workflow, escalation notes
  notifications/    ← Real Expo push delivery (worker processor)
  feed/             ← Tuned scoring weights, A/B hook, Redis TTL
  geo/              ← Map clustering endpoint, bounding box optimization
  media/            ← Processing pipeline, blurhash generation
```

### B3. Technical Design Decisions

**Billing (Stripe):**
- One Stripe Customer per business (not per user). Business creates Stripe Customer on first payment.
- Three products: `featured_listing` (subscription $75/mo), `event_boost` (one-time $25), `lead_pack` (one-time $50 for 10 leads)
- Stripe webhook at `POST /v1/billing/webhook` — verify signature with `stripe.webhooks.constructEvent()`
- Entitlement synced to DB: `subscriptions` table tracks `(businessId, productKey, status, currentPeriodEnd)`
- `isFeatured` and `featuredUntil` set by billing service, not manually by admin (admin can override)

**Leads:**
- Lead = user expressing interest in a provider (tap call/WhatsApp = implicit lead, form submit = explicit)
- Lead cost deducted from lead_pack balance, not charged per lead at charge time
- Cap: max 3 leads from same user to same provider per 7 days (database-enforced unique index)
- Lead delivery: push notification to business + email (SendGrid/Resend) within 60s via Bull queue

**Search:**
- `listings.search_vector tsvector` column: `to_tsvector('english', name || ' ' || COALESCE(description, '') || ' ' || COALESCE(address, ''))`
- GIN index on `search_vector`
- Query: `WHERE search_vector @@ plainto_tsquery('english', $1) AND city_id = $2`
- Ranking: `ts_rank_cd(search_vector, query) * (save_count * 0.01 + 1)` — combines text relevance with popularity
- Events: separate `events.search_vector` on `(title || ' ' || description || ' ' || organizer_name)`

**Analytics:**
- `POST /v1/analytics/events` accepts batch of up to 50 events, always returns 202
- Events stored in `analytics_events` table (append-only, partitioned by week)
- Worker flushes from queue to DB every 5 minutes
- Retention-critical events (`session_start`, `session_end`) written synchronously, not batched

**RBAC:**
```typescript
// Roles: user | business_owner | moderator | admin | super_admin
// Guards stack: ClerkAuthGuard → RolesGuard → ResourceOwnerGuard

@Roles('admin', 'moderator')
@UseGuards(ClerkAuthGuard, RolesGuard)
```
- Role stored in `users.role` column (not in Clerk JWT claims — DB is source of truth)
- Admin routes re-read role from DB on every request (not cached — prevents stale role escalation)

**Audit Logging:**
- Append-only `audit_logs` table: `(id, actorId, actorRole, action, targetType, targetId, before, after, ip, userAgent, createdAt)`
- `AuditService.log()` called in every admin action — NestJS interceptor handles automatically for admin routes
- Never update or delete audit log rows

### B4. Database Migrations Required

```
005-billing-tables.ts       → subscriptions, payments, lead_packs, lead_transactions
006-leads-table.ts          → leads (userId, providerId, type, status, deliveredAt)
007-search-vectors.ts       → search_vector columns + GIN indexes on listings + events
008-analytics-tables.ts     → analytics_events (partitioned), analytics_sessions
009-audit-logs.ts           → audit_logs (append-only)
010-notifications-inbox.ts  → notification_inbox (separate from notification_log)
011-support-tickets.ts      → support_tickets, support_messages
012-onboarding-workflow.ts  → business_verifications (claim → docs → verified)
```

### B5. API Endpoints to Add

```
Billing:
  POST /v1/billing/checkout          ← Create Stripe checkout session
  POST /v1/billing/portal            ← Stripe customer portal (manage subscription)
  POST /v1/billing/webhook           ← Stripe webhook receiver (public, signature-verified)
  GET  /v1/billing/status            ← Current subscription + entitlements for auth business

Leads:
  POST /v1/leads                     ← Create lead (tap call = implicit, form = explicit)
  GET  /v1/leads                     ← Business views their received leads (auth: business)
  PATCH /v1/leads/:id/status         ← Mark lead: new → contacted → converted | dismissed

Search:
  GET  /v1/search?q=&cityId=&type=   ← Unified search (listings + events)
  GET  /v1/search/suggest?q=         ← Autocomplete (top 5 name matches, no FTS)

Analytics:
  POST /v1/analytics/events          ← Batch event ingest (always 202)
  POST /v1/analytics/sessions        ← Session start/end (synchronous)

Notifications inbox:
  GET  /v1/notifications             ← User notification inbox (paginated)
  POST /v1/notifications/read-all    ← Mark all read
  PATCH /v1/notifications/:id/read   ← Mark single read

Onboarding:
  POST /v1/onboarding/business/start ← Begin business claim workflow
  POST /v1/onboarding/business/verify ← Submit verification docs (image upload)
  GET  /v1/onboarding/business/status ← Check claim status

Support:
  POST /v1/support/tickets           ← Create support ticket
  GET  /v1/support/tickets           ← User views own tickets
  POST /v1/support/tickets/:id/messages ← Add message to ticket

Admin additions:
  GET  /v1/admin/stats               ← Dashboard metrics
  GET  /v1/admin/verifications       ← Pending business verification queue
  PATCH /v1/admin/verifications/:id  ← Approve / reject verification
  GET  /v1/admin/leads               ← Lead volume analytics
  GET  /v1/admin/revenue             ← MRR, payments, churn
  GET  /v1/admin/audit-logs          ← Audit log viewer
  GET  /v1/admin/support-tickets     ← Support queue
  PATCH /v1/admin/support-tickets/:id ← Resolve ticket
  POST /v1/admin/cities              ← Add new city
  PATCH /v1/admin/cities/:id         ← Update city (launch_status, metadata)
```

### B6. Acceptance Criteria

- All 92 MVP endpoints return correct status codes and envelope format
- `POST /v1/billing/webhook` processes all 6 Stripe event types with idempotency
- Search returns results in < 200ms for queries against 10K listings (GIN index confirmed via EXPLAIN ANALYZE)
- Analytics events batch endpoint handles 50 events/request, never returns 5xx
- RBAC: a `user` role JWT cannot access any `/v1/admin/*` route (verified by integration test)
- Audit log record created for every admin action (verified by test)
- Lead cap enforced: 4th lead from same user to same provider within 7 days returns 429

### B7. Code Generation Order

1. `005-billing-tables.ts` migration + Stripe service + billing module
2. `006-leads-table.ts` migration + leads module (controller + service)
3. `007-search-vectors.ts` migration + search module
4. `008-analytics-tables.ts` migration + analytics module
5. RBAC guards: `RolesGuard`, `ResourceOwnerGuard` — apply across all modules
6. `AuditService` + `AuditInterceptor` — wire to admin routes
7. `009-audit-logs.ts` migration
8. Notification inbox module + `010-notifications-inbox.ts`
9. Business onboarding workflow + `012-onboarding-workflow.ts`
10. Worker processors: push-notification (real Expo SDK), moderation (Vision API), content-expiry

---

## PHASE C — Mobile App Completion Roadmap

### C1. Scope

Complete the React Native Expo app from basic scaffolding to production-ready across all screens, flows, and system integrations.

### C2. Screen Inventory

```
COMPLETE (from starter):
  ✓ (auth)/index.tsx    — phone entry
  ✓ (auth)/verify.tsx   — OTP
  ✓ (tabs)/index.tsx    — feed (basic)
  ✓ (tabs)/map.tsx      — map (basic, no clustering)
  ✓ (tabs)/explore.tsx  — category browse (basic)
  ✓ (tabs)/post.tsx     — post creation (basic)
  ✓ (tabs)/profile.tsx  — profile (basic)

MUST BUILD:
  (onboarding)/welcome.tsx          — first launch after auth
  (onboarding)/neighborhood.tsx     — neighborhood selection
  (onboarding)/interests.tsx        — category interests capture
  (onboarding)/permissions.tsx      — location + notification permission request

  listing/[id].tsx                  — business detail
  event/[id].tsx                    — event detail
  provider/[id].tsx                 — service provider detail
  
  search/index.tsx                  — search screen with filters
  search/results.tsx                — search results list
  
  notifications/index.tsx           — notification inbox
  
  saves/index.tsx                   — saved items screen
  
  settings/index.tsx                — app settings
  settings/notifications.tsx        — notification preferences
  settings/account.tsx              — account settings (delete account)
  
  business/claim.tsx                — claim a listing flow
  business/onboarding.tsx           — business profile setup
  business/dashboard.tsx            — business owner view (their listing, leads, stats)
  business/leads.tsx                — leads inbox for business owners
  business/edit.tsx                 — edit business listing
  
  report/[contentType]/[id].tsx     — report flow (bottom sheet)
  
  create/photo.tsx                  — photo post creation
  create/event.tsx                  — event creation (for business owners + organizers)
  
  deep-links/                       — universal link handler screens
```

### C3. Key Technical Decisions

**Navigation Architecture:**
```
app/
  _layout.tsx                       ← Root: ClerkProvider, QueryClient, GestureHandler
  (onboarding)/                     ← First-time user flow (redirected from _layout if !hasCompletedOnboarding)
  (auth)/                           ← Unauthenticated flow
  (tabs)/                           ← Main app (authenticated + onboarded)
  (modal)/                          ← Full-screen modals (report, share, business claim)
  listing/[id].tsx                  ← Pushed from feed/map/explore
  event/[id].tsx
  provider/[id].tsx
  search/
  notifications/
  saves/
  settings/
  business/
```

**Deep Linking:**
```typescript
// app.json linking config
"scheme": "muzgram",
"universalLinks": ["muzgram.com"],

// Expo Router handles automatically:
// muzgram://listing/sabri-nihari → app/listing/[id].tsx
// muzgram://event/eid-bazaar-2026 → app/event/[id].tsx
// https://muzgram.com/chicago/places/sabri-nihari → same (Universal Links)
```

**Map Clustering:**
```typescript
// Use react-native-clusterer (Supercluster wrapper for React Native)
// Cluster pins when > 30 visible in viewport
// Cluster tap → camera zoom into cluster center
// Never render > 100 individual pins simultaneously
```

**Analytics Integration (PostHog):**
```typescript
// apps/mobile/src/lib/analytics.ts
import PostHog from 'posthog-react-native';

export const analytics = new PostHog('POSTHOG_API_KEY', {
  host: 'https://app.posthog.com',
  disabled: __DEV__,
});

// Event taxonomy (see Phase H for full list)
export const track = (event: AnalyticsEvent, props?: Record<string, unknown>) =>
  analytics.capture(event, props);
```

**Error Boundaries:**
```typescript
// apps/mobile/src/components/ErrorBoundary.tsx
// Every screen wrapped — prevents cascade crash
// Shows "Something went wrong" with retry button
// Reports to Sentry: Sentry.captureException(error)
```

**Offline Handling:**
```typescript
// TanStack Query staleTime = 5min, cacheTime = 24h
// Users get cached feed data when offline
// Mutation queue: saves, post creation queued offline, replay on reconnect
// OfflineBanner: NetInfo.addEventListener
```

### C4. UI/UX Completion Requirements

**Feed screen hardening:**
- Featured cards show gold "Featured" ribbon, appear in positions 1 and 4 (never adjacent)
- Daily specials show countdown timer until midnight
- Event cards show "In X hours" or "Tomorrow" not raw date string
- Pull-to-refresh animates smoothly (no layout jump)
- Category pills scroll horizontally on overflow (not wrap)
- Empty state: illustration + copy varies by category filter

**Listing detail screen:**
- Hero image with parallax scroll (Reanimated v3)
- Hours accordion: today's hours highlighted, "Open Now" / "Closes at X:XXpm"
- Halal badge: `✓ Certified` (emerald) | `✓ Owner-verified` (gold) | no badge (unverified)
- Photos grid: 1-3 photos visible, tap → full-screen viewer
- Daily special banner: only visible if special is active for today
- CTA buttons: Call, WhatsApp, Directions (all logged as analytics events)
- "From the community" section: 3 recent posts mentioning this place
- Similar nearby section: 4 cards, same category, nearest
- Share: native share sheet + WhatsApp-specific share (pre-formatted message)
- Bottom fixed CTA: "Save" (heart) + "Share" — always visible

**Map screen hardening:**
- Clustering with react-native-clusterer (pin count badge on cluster)
- Category color filter pills above map
- Bottom sheet: 35% → 75% → 95% snap points
- Pin tap → bottom sheet rises to 35% with mini card
- Mini card → "View Details" → pushes detail screen
- Current location button (top-right) — jumps to user GPS
- "Search this area" button appears when user pans significantly

**Business dashboard (business owners only):**
- "My Listing" tab: shows their live listing as users see it
- "Leads" tab: list of received leads with contact info
- "Stats" tab: views, saves, call taps this week (simple bar chart)
- "Post Special" button: quick-create daily special
- "Boost" button: initiates Stripe checkout for event boost or featured slot

### C5. Dependencies

- `react-native-clusterer` for map clustering
- `posthog-react-native` for analytics
- `@sentry/react-native` for crash reporting
- `react-native-reanimated` v3 (already in Expo SDK)
- `@gorhom/bottom-sheet` v5 (already planned)
- `react-native-netinfo` for offline detection
- `@stripe/stripe-react-native` for business payment UI

### C6. Acceptance Criteria

- Cold start to interactive feed: < 2.5s on mid-range Android
- Map renders 200+ listings with clustering: no jank on scroll
- Deep link `muzgram://listing/sabri-nihari` opens correct detail screen from killed app state
- Push notification tap from killed state routes to correct screen
- Offline: feed shows cached data with offline banner; post creation shows "Will send when online"
- Business owner role: "My Business" tab visible in profile, leads count badge on tab

---

## PHASE D — Web Marketing + SEO Platform Roadmap

### D1. Scope

Build `apps/web` from zero to a fully indexed, performance-optimized SEO platform targeting 50K+ pages within 12 months. Detailed specs already in `docs/25-seo-implementation-plan.md`.

### D2. Module List

```
apps/web/src/
  app/
    page.tsx                      ← Homepage
    [city]/page.tsx               ← City hub
    [city]/eat/page.tsx           ← Category
    [city]/eat/[sub]/page.tsx     ← Subcategory
    [city]/go-out/page.tsx
    [city]/go-out/[sub]/page.tsx
    [city]/connect/page.tsx
    [city]/connect/[sub]/page.tsx
    [city]/mosques/page.tsx
    [city]/places/[slug]/page.tsx  ← Business detail
    [city]/events/[slug]/page.tsx  ← Event detail
    [city]/tonight/page.tsx
    [city]/this-weekend/page.tsx
    near-me/[category]/page.tsx
    guides/[slug]/page.tsx
    for-businesses/page.tsx        ← Provider acquisition
    for-organizers/page.tsx        ← Event organizer acquisition
    download/page.tsx              ← App install
    privacy/page.tsx
    terms/page.tsx
    sitemap.ts
    robots.ts
    api/revalidate/route.ts
    opengraph-image.tsx            ← Dynamic OG images

  components/
    layout/Header.tsx
    layout/Footer.tsx
    layout/AppDownloadBanner.tsx   ← Smart app banner (iOS/Android)
    feed/ListingCard.tsx
    feed/EventCard.tsx
    feed/CategoryPills.tsx
    seo/BreadcrumbNav.tsx
    seo/SchemaScript.tsx
    seo/RelatedContent.tsx
    seo/NeighborhoodNav.tsx
    conversion/InstallCTA.tsx      ← "Download the app" conversion module
    conversion/BusinessCTA.tsx     ← "List your business" acquisition module

  lib/
    db.ts                          ← Read-only PG pool
    cache/redis.ts                 ← Redis withCache helper
    cache/tags.ts                  ← Cloudflare Cache-Tag helpers
    schema/business.schema.ts      ← LocalBusiness JSON-LD
    schema/event.schema.ts         ← Event JSON-LD
    schema/breadcrumb.schema.ts
    schema/faq.schema.ts
    seo/titles.ts                  ← Title formula functions
    seo/meta.ts                    ← Meta description formulas
    seo/canonical.ts               ← Canonical URL logic
```

### D3. Homepage Design

```
muzgram.com/

Above fold:
  H1: "Find Halal Spots, Events & Services Near You"
  Subheadline: "The local guide for Muslim Chicago — restaurants, events, and trusted pros."
  CTA: "Explore Chicago →" (links to /chicago) | "Download App" (App Store / Play Store)
  Background: dark (#0D0D0D), subtle map overlay of Chicago

Sections:
  - "What's Near You" — 6 listing cards from Chicago (hardcoded for MVP, geo-detect post-launch)
  - "Happening This Week" — 4 event cards
  - "Browse by Category" — 3 category cards: Eat | Go Out | Connect
  - "For Businesses" — 2-column split: "Reach your community" + CTA → /for-businesses
  - "Cities on Muzgram" — Chicago cluster cities as badge links
  - Footer: Privacy, Terms, App Store, Google Play, Instagram link
```

### D4. Provider Acquisition Pages

```
/for-businesses
  H1: "Grow Your Halal Business With Muzgram"
  Subhead: "Get discovered by thousands of local Muslims looking for what you offer."
  3 value props: Verified listing | Real leads | Featured placement
  Pricing table: Free (basic listing) | Pro $49/mo | Featured $75/mo
  CTA: "List My Business" → deep links to app business onboarding flow
  OR web-based claim form (email + phone, admin follows up)
  Social proof: "20+ founding businesses in Chicago"

/for-organizers
  H1: "Promote Your Events to Muslim Chicago"
  Value: Free event listing + boosted placement option ($25)
  CTA → app event creation or web form
```

### D5. Conversion Flow (Web → App)

```
User lands on /chicago/places/sabri-nihari (SEO traffic)
  ↓
Reads business page (hours, photos, halal badge)
  ↓
Sees AppDownloadBanner (sticky bottom bar):
  "See live updates and map → Get Muzgram (free)"
  [App Store] [Google Play]
  ↓
If app installed: Universal Link opens app directly to listing
If not installed: App Store → installs → deep link returns to listing
  ↓
Attribution: UTM params on App Store link → tracks SEO-to-install conversion
```

### D6. Acceptance Criteria

- Lighthouse score ≥ 90 on mobile for all page types
- LCP < 1.5s on city and category pages
- All business pages have valid LocalBusiness JSON-LD (verified via Google Rich Results Test)
- All event pages have valid Event JSON-LD
- Sitemap.xml contains all active listings and events (verified count)
- robots.txt blocks `/api/`, `/admin/`, all query-string URLs
- Near-me geo redirect works: `/near-me/halal-restaurants` redirects to `/chicago/eat` for Chicago IPs
- `noindex` applied to pages with < 2 listings (thin content prevention)

---

## PHASE E — Admin Dashboard Completion Roadmap

### E1. Scope

Upgrade `apps/admin` from basic data tables to an operational command center.

### E2. Page Additions

```
EXISTING (from starter — needs hardening):
  /dashboard          ← Add real metrics
  /moderation         ← Add action buttons, escalation notes
  /listings           ← Add approve/reject, edit, featured toggle
  /events             ← Add approve/reject, cancel
  /posts              ← Add hide/restore/delete
  /users              ← Add role change, ban, trust tier

NEW PAGES:
  /verifications      ← Business verification queue
  /leads              ← Lead volume, delivery stats
  /revenue            ← MRR, payments, subscription status
  /cities             ← Active cities, launch_status, listing counts
  /notifications-log  ← Recent pushes, delivery rates
  /audit-logs         ← Admin action history (read-only)
  /support            ← Support ticket queue
  /settings           ← Feature flags, founding member slots, rate limits
  /seo                ← Guide pages editor, noindex overrides
```

### E3. Dashboard Metrics (Real-Time)

```typescript
// GET /v1/admin/stats returns:
{
  users: { total: number; newToday: number; activeThisWeek: number };
  content: { listings: number; events: number; posts: number; pendingReview: number };
  revenue: { mrr: number; activeSubscriptions: number; newThisMonth: number };
  leads: { totalToday: number; deliveryRate: number };
  moderation: { queueDepth: number; avgResolutionHours: number };
  notifications: { sentToday: number; deliveryRate: number; optInRate: number };
}
```

### E4. Verification Queue Workflow

```
Business submits claim → status: pending_review
Admin opens /verifications
  → sees: business name, claimant phone, submitted docs (photos)
  → actions: Approve (sets trust_tier=3, sends push to claimant) | Reject (requires reason) | Request More Info
All actions write to audit_log
Business owner notified via push + email on status change
```

### E5. Acceptance Criteria

- Dashboard loads in < 1s (metrics are cached, not live queries)
- Moderation queue action (approve/reject) reflected in mobile feed within 2 minutes
- Audit log shows every admin action with actor, target, before/after state
- Revenue page shows correct MRR synced from Stripe
- City management: admin can add a new city and it appears in generateStaticParams on next web build

---

## PHASE F — Monetization Implementation Roadmap

### F1. Stripe Integration Architecture

```typescript
// apps/api/src/modules/billing/billing.service.ts

// Products (created once in Stripe dashboard):
const STRIPE_PRODUCTS = {
  FEATURED_LISTING:  'prod_featured_listing',   // $75/mo subscription
  BUSINESS_PRO:      'prod_business_pro',        // $49/mo subscription (MMP)
  EVENT_BOOST:       'prod_event_boost',         // $25 one-time
  LEAD_PACK_10:      'prod_lead_pack_10',        // $50 one-time (10 leads)
  LEAD_PACK_25:      'prod_lead_pack_25',        // $100 one-time (25 leads)
};

// Checkout flow:
// 1. Business taps "Feature My Listing" in app
// 2. App calls POST /v1/billing/checkout { product: 'FEATURED_LISTING', successUrl, cancelUrl }
// 3. API creates/retrieves Stripe Customer for this business
// 4. Creates Stripe Checkout Session (hosted page)
// 5. Returns { checkoutUrl } — app opens in WebView or browser
// 6. On success: Stripe webhook fires → API sets listing.isFeatured=true, featuredUntil=+30days
```

### F2. Subscription Entitlement Model

```sql
-- subscriptions table (from migration 005)
CREATE TABLE subscriptions (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  business_id       UUID NOT NULL REFERENCES listings(id),
  stripe_customer_id  VARCHAR(100) NOT NULL,
  stripe_subscription_id VARCHAR(100),
  product_key       VARCHAR(50) NOT NULL,  -- 'featured_listing' | 'business_pro'
  status            VARCHAR(20) NOT NULL,  -- 'active' | 'past_due' | 'cancelled' | 'trialing'
  current_period_start TIMESTAMPTZ,
  current_period_end   TIMESTAMPTZ,
  cancelled_at      TIMESTAMPTZ,
  created_at        TIMESTAMPTZ DEFAULT NOW(),
  updated_at        TIMESTAMPTZ DEFAULT NOW()
);
```

### F3. Webhook Event Handlers

```typescript
// Stripe events to handle:
'checkout.session.completed'   → activate subscription/one-time purchase
'customer.subscription.updated' → sync status to subscriptions table
'customer.subscription.deleted' → deactivate features (grace period: 3 days)
'invoice.payment_failed'       → set status='past_due', notify business owner
'invoice.payment_succeeded'    → renew featuredUntil by 30 days
'charge.refunded'              → deactivate + refund_at timestamp
```

### F4. Free vs Paid Feature Gating

```typescript
// Entitlement checks (used in feed service + listing service):

async function isListingFeatured(listingId: string): Promise<boolean> {
  const sub = await subscriptionRepo.findOne({
    where: {
      businessId: listingId,
      productKey: 'featured_listing',
      status: In(['active', 'trialing']),
      currentPeriodEnd: MoreThan(new Date()),
    },
  });
  return !!sub;
}

// Feed scoring: featured boost only applied if isListingFeatured returns true
// This replaces manual isFeatured toggle — billing is the source of truth
```

### F5. Monetization UX Rules

- Featured badge appears on card and detail page: `★ Featured`
- Never show price of competitor's spend to users — only show the result (featured placement)
- Boost CTAs only shown to authenticated business owners for their own listings
- Web billing for MVP (Stripe Checkout hosted page), not in-app purchase (avoids Apple 30% cut)
- Lead counter visible on business dashboard: "X leads this month"

### F6. Acceptance Criteria

- Stripe checkout session creates correctly and redirects business to Stripe hosted page
- After successful payment, listing `isFeatured = true` within 60s (webhook processing time)
- After subscription cancellation, `isFeatured` reverts after 3-day grace period
- `invoice.payment_failed` triggers email to business owner within 5 minutes
- Lead pack: business with 0 remaining leads gets 429 on new lead creation
- Revenue page in admin shows correct MRR matching Stripe dashboard

---

## PHASE G — Moderation, Trust, and Safety Roadmap

### G1. Content Moderation Pipeline

```
Content created (post / event / listing photo)
  ↓
AUTO-CHECKS (synchronous, < 100ms):
  - Text: regex banned_phrases list (hardcoded)
  - Length: minimum 10 chars
  - Link detection: reject if contains URL (community posts)
  ↓
AI MODERATION (async, Bull queue, < 3s):
  - Photo: Google Vision SafeSearch
  - Text: basic toxicity check (Perspective API, optional)
  ↓
TRUST TIER ROUTING:
  Tier 0 (unverified): → pending_review queue (manual)
  Tier 1+ (trusted): → auto-approve if AI scan passes
  Tier 3+ (verified business): → auto-approve, no AI needed
  ↓
HUMAN REVIEW (admin dashboard /moderation):
  - Pending queue shows content + context
  - Actions: Approve | Reject + reason | Escalate | User warning
  - SLA target: < 4 hours for Tier 0 content
```

### G2. Report Resolution Workflow

```typescript
// report status flow:
// submitted → under_review → resolved_action_taken | resolved_no_action | escalated

// Auto-actions by report weight threshold:
// Community posts: auto-hide at weight ≥ 3.0 (existing)
// Listings: flag for review at weight ≥ 2.0 (never auto-hide)
// Users: flag for review at 3 reports, auto-suspend at 5

// Report weight by tier:
// Tier -1 (blocked): 0 (blocked users can't report)
// Tier 0: 0.2
// Tier 1: 0.5
// Tier 2: 1.0
// Tier 3: 1.5
// Tier 4: 2.0
```

### G3. Trust Tier Progression

```
Tier 0 (Unverified) — default new user
  → Content goes to manual review queue
  → Upgrade to Tier 1: account > 7 days AND ≥ 3 saves AND no reports

Tier 1 (Trusted User)
  → Content auto-approved if AI scan passes
  → Upgrade to Tier 2: ≥ 5 posts AND ≥ 10 saves AND account > 30 days

Tier 2 (Contributor)
  → Content auto-approved (no AI needed for text)
  → Manual upgrade: admin reviews and promotes

Tier 3 (Verified Business)
  → Verification workflow completed (phone call or in-person)
  → Admin grants via /verifications queue

Tier 4 (Verified Organizer)
  → Track record of 5+ events, admin review
```

### G4. Verification Workflow (Business)

```
Step 1: Business submits claim (phone number + business name)
Step 2: Admin calls or texts to verify (MVP — manual)
Step 3: Admin marks verified in dashboard
Step 4: Business trust_tier → 3, can_post_events = true, verified_badge = true
Step 5: Business notified via push + email

MMP: Self-serve verification with document upload + automated review
```

### G5. Spam Prevention

```typescript
// Rate limits (applied via ThrottlerModule per route):
const RATE_LIMITS = {
  POST_CREATE:     { limit: 5,  ttl: 3600 },   // 5 posts per hour
  REPORT_CREATE:   { limit: 10, ttl: 3600 },
  LEAD_CREATE:     { limit: 20, ttl: 3600 },
  LISTING_CLAIM:   { limit: 3,  ttl: 86400 },  // 3 claims per day
  SEARCH:          { limit: 60, ttl: 60 },
  FEED:            { limit: 120, ttl: 60 },
};

// IP-based blocking via Cloudflare WAF rules (not in-app)
// User-based banning stored in users.status = 'banned' | 'suspended'
// Suspended = temporary (30 days), Banned = permanent
```

### G6. Acceptance Criteria

- Photo with LIKELY adult content score in Vision API → auto-rejected, never published
- 5 reports from Tier 1+ users against same post → auto-hidden within 30s
- Business claim for listing that's already claimed → 409 error with clear message
- Admin can ban a user from dashboard → all their active posts hidden within 5 minutes
- Audit log shows every moderation action with before/after state

---

## PHASE H — Analytics and Growth Instrumentation Roadmap

### H1. Analytics Stack

**Primary:** PostHog (self-hosted on Railway or cloud plan)
**Secondary:** Google Analytics 4 (web layer only — for SEO/organic tracking)
**Revenue:** Stripe Dashboard (source of truth for MRR)
**Crash:** Sentry (mobile + API)

### H2. Event Taxonomy (Canonical)

```typescript
// All analytics events — the complete taxonomy
// Mobile: posthog-react-native
// Web: posthog-js
// API: PostHog Node SDK (server-side for sensitive events)

export const ANALYTICS_EVENTS = {
  // Onboarding funnel
  ONBOARDING_STARTED:           'onboarding_started',
  LOCATION_PERMISSION_GRANTED:  'location_permission_granted',
  LOCATION_PERMISSION_DENIED:   'location_permission_denied',
  NEIGHBORHOOD_SELECTED:        'neighborhood_selected',
  ONBOARDING_COMPLETED:         'onboarding_completed',

  // Auth funnel
  PHONE_ENTERED:                'phone_entered',
  OTP_REQUESTED:                'otp_requested',
  OTP_VERIFIED:                 'otp_verified',
  AUTH_COMPLETED:               'auth_completed',

  // Feed engagement
  FEED_OPENED:                  'feed_opened',
  FEED_ITEM_VIEWED:             'feed_item_viewed',         // viewport impression
  FEED_ITEM_TAPPED:             'feed_item_tapped',
  FEED_CATEGORY_FILTERED:       'feed_category_filtered',
  FEED_REFRESHED:               'feed_refreshed',
  FEED_PAGINATED:               'feed_paginated',

  // Map engagement
  MAP_OPENED:                   'map_opened',
  MAP_PIN_TAPPED:               'map_pin_tapped',
  MAP_CATEGORY_FILTERED:        'map_category_filtered',
  MAP_AREA_SEARCHED:            'map_area_searched',
  MAP_ZOOMED:                   'map_zoomed',

  // Content engagement
  LISTING_VIEWED:               'listing_viewed',           // detail screen open
  LISTING_CALL_TAPPED:          'listing_call_tapped',
  LISTING_WHATSAPP_TAPPED:      'listing_whatsapp_tapped',
  LISTING_DIRECTIONS_TAPPED:    'listing_directions_tapped',
  LISTING_WEBSITE_TAPPED:       'listing_website_tapped',
  LISTING_SHARED:               'listing_shared',

  EVENT_VIEWED:                 'event_viewed',
  EVENT_SAVED:                  'event_saved',
  EVENT_SHARED:                 'event_shared',

  // Save behavior
  ITEM_SAVED:                   'item_saved',
  ITEM_UNSAVED:                 'item_unsaved',
  SAVES_SCREEN_OPENED:          'saves_screen_opened',

  // Search
  SEARCH_INITIATED:             'search_initiated',
  SEARCH_QUERY_SUBMITTED:       'search_query_submitted',
  SEARCH_RESULT_TAPPED:         'search_result_tapped',
  SEARCH_ZERO_RESULTS:          'search_zero_results',

  // Post creation
  POST_CREATE_STARTED:          'post_create_started',
  POST_CREATE_PHOTO_ADDED:      'post_create_photo_added',
  POST_CREATE_SUBMITTED:        'post_create_submitted',
  POST_CREATE_ABANDONED:        'post_create_abandoned',

  // Notifications
  PUSH_PERMISSION_GRANTED:      'push_permission_granted',
  PUSH_PERMISSION_DENIED:       'push_permission_denied',
  PUSH_NOTIFICATION_OPENED:     'push_notification_opened',
  NOTIFICATION_INBOX_OPENED:    'notification_inbox_opened',

  // Business / monetization funnel
  BUSINESS_CLAIM_STARTED:       'business_claim_started',
  BUSINESS_CLAIM_SUBMITTED:     'business_claim_submitted',
  BUSINESS_DASHBOARD_OPENED:    'business_dashboard_opened',
  LEAD_RECEIVED:                'lead_received',            // server-side
  BOOST_CTA_TAPPED:             'boost_cta_tapped',
  CHECKOUT_STARTED:             'checkout_started',
  CHECKOUT_COMPLETED:           'checkout_completed',       // server-side (Stripe webhook)
  SUBSCRIPTION_ACTIVATED:       'subscription_activated',   // server-side
  SUBSCRIPTION_CANCELLED:       'subscription_cancelled',   // server-side

  // Churn signals
  APP_BACKGROUNDED:             'app_backgrounded',
  SESSION_ENDED:                'session_ended',
} as const;
```

### H3. Retention Metric Infrastructure

```typescript
// D7 / D30 retention: computed from analytics_sessions table
// Session = app open (foreground) after > 30min gap since last open

// Weekly cohort retention query:
SELECT
  DATE_TRUNC('week', first_seen_at) AS cohort_week,
  COUNT(DISTINCT user_id) AS cohort_size,
  COUNT(DISTINCT CASE WHEN days_since_first ≤ 7 THEN user_id END) AS retained_d7,
  COUNT(DISTINCT CASE WHEN days_since_first ≤ 30 THEN user_id END) AS retained_d30
FROM (
  SELECT
    user_id,
    MIN(created_at) OVER (PARTITION BY user_id) AS first_seen_at,
    EXTRACT(EPOCH FROM (created_at - MIN(created_at) OVER (PARTITION BY user_id))) / 86400 AS days_since_first
  FROM analytics_sessions
) t
GROUP BY 1
ORDER BY 1 DESC;
```

### H4. City Density Metrics (Critical for Launch Decision)

```sql
-- These metrics drive the "add another city" decision
-- Target: >10 listings per km² in dense cluster, >20 events/month, >5 daily posts

SELECT
  c.name AS city,
  COUNT(DISTINCT l.id) AS listings,
  COUNT(DISTINCT l.id) / NULLIF(c.area_km2, 0) AS density_per_km2,
  COUNT(DISTINCT e.id) FILTER (WHERE e.start_at > NOW()) AS upcoming_events,
  COUNT(DISTINCT p.id) FILTER (WHERE p.created_at > NOW() - INTERVAL '7 days') AS posts_this_week
FROM cities c
LEFT JOIN listings l ON l.city_id = c.id AND l.is_active = true
LEFT JOIN events e ON e.city_id = c.id AND e.is_active = true
LEFT JOIN community_posts p ON p.city_id = c.id AND p.deleted_at IS NULL
GROUP BY c.id
ORDER BY density_per_km2 DESC;
```

### H5. Provider Monetization Funnel Tracking

```
Business discovers Muzgram → claims listing → activates listing → first week active
→ receives first lead → taps "Boost" CTA → completes checkout → subscription active
→ measures ROI (leads received vs subscription cost)

Key funnel metrics:
- Claim conversion rate: # who complete claim / # who start
- Activation rate: # who complete onboarding / # who claimed
- Monetization conversion: # who subscribe / # who are activated
- Churn rate: # who cancel / # active subscriptions
- Lead-to-revenue: avg revenue per activated business per month
```

### H6. Acceptance Criteria

- PostHog receiving events from mobile within 500ms of user action
- `auth_completed` event fires exactly once per signup (not on re-login)
- `checkout_completed` event fires server-side (Stripe webhook) — not client-side (prevents fraud inflation)
- D7 cohort retention query returns results matching manual calculation for test cohort
- City density dashboard accessible to admin in < 2s

---

## PHASE I — DevOps, Environments, and Deployment Roadmap

### I1. Environment Strategy

```
Local:       .env (gitignored) · Docker Compose (PostGIS, Redis, MinIO)
Development: Railway dev project · Supabase dev project · Vercel preview deploys
Staging:     Railway staging project · Supabase staging project · Separate Clerk instance
Production:  Railway prod · Supabase prod · Vercel prod · Cloudflare
```

### I2. Railway Service Map (Production)

```
muzgram-api       → apps/api (NestJS, PORT=3000)
muzgram-worker    → apps/worker (NestJS context, no HTTP)
muzgram-web       → apps/web (Next.js — OR Vercel, Vercel preferred)
muzgram-admin     → apps/admin (Vite static — Vercel)

External services (not on Railway):
  Supabase          → PostgreSQL (primary + read replica)
  Upstash Redis     → Cache + Bull queues
  Cloudflare R2     → Media storage
  Cloudflare CDN    → DNS + caching for web
  Clerk             → Auth
  Stripe            → Billing
  PostHog           → Analytics
  Sentry            → Error tracking
  SendGrid/Resend   → Transactional email
```

### I3. CI/CD Pipeline (GitHub Actions)

```yaml
# .github/workflows/api.yml — runs on push to main

name: API Deploy
on:
  push:
    branches: [main]
    paths: ['apps/api/**', 'packages/**']

jobs:
  test:
    steps:
      - pnpm install
      - pnpm turbo typecheck --filter=@muzgram/api
      - pnpm turbo test --filter=@muzgram/api
      - pnpm turbo lint --filter=@muzgram/api

  migrate:
    needs: test
    steps:
      - Run TypeORM migrations against staging DB (DATABASE_DIRECT_URL_STAGING)
      - Verify migration ran without error (exit code 0)
      - If fail: alert Slack + block deploy

  deploy:
    needs: migrate
    steps:
      - Deploy to Railway staging
      - Health check: GET /health → 200 with db:connected
      - If health check passes: promote to production (Railway blue/green)
```

### I4. Secrets Management

```
Development: .env file (gitignored)
CI/CD: GitHub Actions Secrets
Staging/Prod: Railway environment variables (encrypted at rest)

SECRET ROTATION PLAN:
  Clerk keys: rotate quarterly + immediately on team member departure
  Stripe keys: rotate if ever logged/exposed
  Supabase password: rotate quarterly (changed once already this session)
  R2 access keys: rotate quarterly
  REVALIDATE_SECRET: rotate with each major deploy
  JWT secrets: N/A (Clerk manages)
```

### I5. Database Backup Strategy

```
Supabase: Daily automated backups (7-day retention on free, 30-day on Pro)
Additional:
  - Weekly pg_dump to R2 bucket 'muzgram-backups' (cron job in worker)
  - Backup verification: weekly automated restore test to staging DB
  - Point-in-time recovery: available on Supabase Pro (critical before launch)

Worker cron job (in BullMQ scheduled job):
  Every Sunday 2am: pg_dump → compress → upload to R2 backups bucket
  Alert if backup fails: Sentry alert
```

### I6. Monitoring Stack

```
Uptime: Better Uptime (free tier) — monitors /health every 60s
Errors: Sentry (mobile: @sentry/react-native, API: @sentry/node)
Logs: Railway built-in log streaming → LogTail (free tier for aggregation)
Metrics: Railway metrics dashboard (CPU, memory, request count)
Queue health: Bull Board at /admin/queues (protected by admin auth)
DB health: Supabase dashboard (connection pool, slow query log)
```

### I7. Acceptance Criteria

- CI pipeline runs on every PR and blocks merge on test failure
- Migrations run automatically on deploy to staging, manually approved for production
- API health check returns 200 within 30s of Railway deploy completion
- Sentry alerts fire within 2 minutes of a new error type appearing
- Database backup completed and verified every Sunday
- Staging environment fully isolated from production (separate Clerk, Stripe test mode, Supabase)

---

## PHASE J — QA, Performance, and Security Roadmap

### J1. Test Coverage Strategy

```
Unit tests:       Feed scoring algorithm · Slug generation · Trust weight calculation · Utility functions
Integration tests: API endpoints (Happy path + error paths + auth) · DB queries
E2E tests:        Auth flow · Feed → listing detail · Post creation · Business claim · Checkout

Tools:
  API: Jest + Supertest (test against real Supabase test DB — no mocks)
  Mobile: Detox (E2E on real device/emulator)
  Web: Playwright (E2E for critical pages)
  Performance: k6 (load testing feed endpoint)
```

### J2. Critical Test Scenarios

```
Security tests (must pass before launch):
  [ ] JWT from one user cannot access another user's data
  [ ] Admin JWT required for all /admin/* routes
  [ ] Stripe webhook without valid signature returns 400
  [ ] SQL injection attempt in search query returns 422, not 500
  [ ] Rate limit: 61st request to POST /posts in 1 hour returns 429
  [ ] Expired JWT returns 401 (not 403 or 200)

Data integrity tests:
  [ ] Save toggle race condition: 10 concurrent save requests → savesCount increments exactly once
  [ ] Duplicate lead (same user, same provider, within 7 days) → 429
  [ ] Duplicate idempotency key with different body → 409
  [ ] Claiming an already-claimed listing → 409

Business logic tests:
  [ ] Feed doesn't return listings from city B when user is in city A
  [ ] Featured listings appear in positions 1 and 4 only
  [ ] Community posts expire after 7 days (worker job tested)
  [ ] isFeatured reverts 3 days after subscription cancellation
```

### J3. Performance Benchmarks

```
Target (measured with k6, 100 concurrent users, p95):
  GET /v1/feed                      < 300ms
  GET /v1/listings/:id              < 150ms
  GET /v1/map/pins                  < 200ms
  GET /v1/search?q=                 < 200ms
  POST /v1/analytics/events (batch) < 50ms  (just queue push, no DB write)

Mobile:
  Cold start to interactive feed    < 2.5s (mid-range Android)
  Feed scroll FPS                   ≥ 55fps (Profiler check)
  Map render with 200 pins          < 1s, no jank

Web (Lighthouse mobile):
  City page LCP                     < 1.5s
  Business page LCP                 < 1.5s
  Performance score                 ≥ 90
```

### J4. Security Hardening Checklist

```
Authentication:
  [ ] All routes except @Public() require valid Clerk JWT
  [ ] JWT expiry: Clerk default (1 hour session tokens, auto-refreshed)
  [ ] Admin routes re-read role from DB (not from JWT claims)
  [ ] CORS: only allows muzgram.com, app.muzgram.com origins in production

Input validation:
  [ ] class-validator on all DTOs with strict rules
  [ ] File upload: MIME type whitelist (image/jpeg, image/png, image/webp only)
  [ ] File size: max 10MB enforced before presign (not just R2 limit)
  [ ] Search query: max 100 chars, sanitized (no SQL injection via parameterized queries)
  [ ] All user-generated text: max lengths enforced, HTML stripped

Infrastructure:
  [ ] Supabase connection: SSL required
  [ ] R2 bucket: not public except /public/* prefix
  [ ] Admin dashboard: IP allowlist in Cloudflare (only your IP)
  [ ] API: Cloudflare WAF rules (block bad bots, rate limit by IP)
  [ ] Secrets: never logged, never in git

OWASP Top 10 addressed:
  [ ] A01 Broken Access Control → RBAC guards on all routes
  [ ] A02 Cryptographic Failures → Clerk handles auth, TLS everywhere
  [ ] A03 Injection → Parameterized queries (TypeORM), no raw SQL with user input
  [ ] A04 Insecure Design → Rate limiting, lead cap, idempotency keys
  [ ] A05 Security Misconfiguration → Prod env vars in Railway, not in code
  [ ] A07 Auth Failures → Clerk handles, short-lived JWTs
  [ ] A08 Software Integrity → package-lock.json committed, Dependabot enabled
```

### J5. Privacy and Compliance Basics

```
Required before launch:
  [ ] Privacy Policy page on web (muzgram.com/privacy)
  [ ] Terms of Service page on web (muzgram.com/terms)
  [ ] In-app: terms acceptance on first signup (record accepted_terms_at timestamp)
  [ ] In-app: "Your data stays on your device" — push token stored only to deliver notifications
  [ ] User deletion: POST /v1/users/me/delete → soft delete + 30-day hard delete schedule
  [ ] Data export: GET /v1/users/me/export → returns user's data as JSON (GDPR Article 20)
  [ ] Location data: not stored server-side (only used for query, not persisted per user)
  [ ] Analytics opt-out: PostHog respects user's analytics preference (stored in settings)
  [ ] Apple: Privacy manifest required for Expo SDK 52+ (expo-privacy-manifests)
```

---

## PHASE K — Launch Readiness Roadmap

### K1. App Store Submission Requirements

```
iOS (App Store):
  [ ] App icon: 1024×1024 PNG, no alpha, no rounded corners (Apple adds)
  [ ] Screenshots: 6.7" (iPhone 15 Pro Max) — 5 required, show Feed, Map, Listing detail, Events, Search
  [ ] App preview video: optional but strongly recommended (30s max)
  [ ] Description: 4,000 chars max. Lead with utility, not religion.
  [ ] Keywords: halal,restaurants,events,chicago,muslim,community,local,food,nearby,discovery
  [ ] Age rating: 4+ (no objectionable content)
  [ ] Privacy policy URL: https://muzgram.com/privacy (REQUIRED — app rejected without)
  [ ] App Review notes: "For testing, use phone +1 555-000-0000, OTP: 123456" (test credentials)
  [ ] In-app purchases: declare Stripe-based subscriptions as "non-IAP" (web-only payment)
  [ ] Location usage: "Muzgram uses your location to show nearby restaurants, events, and services."
  [ ] Apple Privacy Manifest: required for SDK dependencies

Android (Google Play):
  [ ] App icon: 512×512 PNG
  [ ] Feature graphic: 1024×500 JPG
  [ ] Screenshots: phone + 7" tablet (5 required each)
  [ ] Short description: 80 chars
  [ ] Full description: 4,000 chars
  [ ] Content rating: Everyone (complete questionnaire honestly)
  [ ] Privacy policy URL: same as iOS
  [ ] Data safety form: complete honestly (location used but not stored; no financial data collected)
  [ ] Signing key: upload AAB (not APK), use Google Play App Signing
```

### K2. Go-Live Checklist

```
Infrastructure:
  [ ] Production API deployed to Railway (health check green)
  [ ] Production worker deployed (queue processors confirmed running)
  [ ] Production web deployed to Vercel (Lighthouse ≥ 90)
  [ ] Supabase production project (not free tier — Pro plan for PITR backup)
  [ ] Upstash Redis production instance configured
  [ ] R2 production bucket with media.muzgram.com custom domain
  [ ] Cloudflare DNS fully configured (api., admin., media. subdomains)
  [ ] Sentry alerts configured (error rate > 1% triggers Slack message)
  [ ] All 12 production environment variables verified in Railway

Database:
  [ ] All migrations (001–012) applied to production DB
  [ ] Spatial indexes confirmed (EXPLAIN ANALYZE on feed query)
  [ ] Chicago city seed record present
  [ ] 150+ listings seeded with real photos + coordinates
  [ ] 5+ recurring events set up for mosques

Auth:
  [ ] Clerk production instance (not dev)
  [ ] Clerk webhook endpoint configured to production API URL
  [ ] Test: new phone → OTP → user created in production DB

Billing:
  [ ] Stripe live mode keys (not test keys) in production
  [ ] Stripe webhook endpoint configured in Stripe dashboard
  [ ] Test payment with Stripe test card before switching to live mode

Analytics:
  [ ] PostHog production project configured
  [ ] Mobile: POSTHOG_API_KEY set to production key
  [ ] Test: app open → verify events appearing in PostHog within 30s

Content:
  [ ] All 150+ seed listings have photos uploaded to R2
  [ ] All listing coordinates verified (no lat/lng swaps)
  [ ] At least 3 recurring events per mosque
  [ ] Privacy policy and terms pages live on muzgram.com

App stores:
  [ ] iOS app approved and held (manual release)
  [ ] Android app approved (Google Play internal track first, then production)
  [ ] Universal Links configured (.well-known/apple-app-site-association live)
  [ ] App Links configured (.well-known/assetlinks.json live)

SEO:
  [ ] apps/web deployed to Vercel production
  [ ] sitemap.xml accessible at muzgram.com/sitemap.xml
  [ ] Google Search Console: sitemap submitted
  [ ] robots.txt verified
  [ ] 3 pages spot-checked in Google Rich Results Test (Business + Event + FAQ)
```

### K3. Day-1 Monitoring Dashboard (bookmark these)

```
- Sentry: sentry.io/organizations/muzgram/issues/
- Railway API logs: railway.app → muzgram-api → Logs
- Supabase: supabase.com → project → Table Editor (users table — watch installs)
- PostHog: posthog.com → Insights → "Daily active users" dashboard
- Stripe: dashboard.stripe.com (revenue, new subscriptions)
- Upstash: console.upstash.com (Redis queue depth)
- Cloudflare: cloudflare.com → Analytics (traffic, cache hit rate)
```

---

## PHASE L — Post-Launch and Multi-City Scale Roadmap

### L1. MMP Gate Criteria (do not start MMP until all pass)

```
D7 retention ≥ 35%
Monthly Active Users ≥ 500
Paying businesses ≥ 20
MRR ≥ $3,000
```

### L2. City 2 Expansion Checklist (< 40 hours work)

```
Engineering (4 hours):
  [ ] Add city record to cities table (name, slug, center coordinates, bounding box, area_km2)
  [ ] Set launch_status = 'active'
  [ ] Verify generateStaticParams picks up new city on next web build
  [ ] Trigger Vercel rebuild (auto via webhook or manual deploy)

Content (20 hours):
  [ ] Seed 100+ listings from Google Places + community research
  [ ] Verify all coordinates in PostGIS viewer
  [ ] Upload photos for top 20 businesses to R2
  [ ] Set up 5+ recurring events
  [ ] Write 1 editorial paragraph for city hub page (unique, not template)
  [ ] Write 1 guide page: "Best Halal Restaurants in [City]"
  [ ] Seed 3 community posts per top 10 businesses

SEO (4 hours):
  [ ] Submit new city URLs to Google Search Console
  [ ] Verify structured data on 3 new pages
  [ ] Add city to sitemap (automatic via sitemap.ts query)

Operations (4 hours):
  [ ] Test feed for new city coordinates returns correct results
  [ ] Verify map pins appear correctly
  [ ] Configure push notification radius for new city center
  [ ] Add city to Cloudflare near-me redirect config
  [ ] Announce in existing mosque WhatsApp groups for that city
```

### L3. Architectural Triggers for Scale

```
< 500 req/s (Chicago MVP):
  Current architecture — no changes needed

500+ req/s OR 500K+ content rows:
  → Separate worker from API container (already separate in monorepo)
  → Add Supabase read replica (1 click in Supabase dashboard)
  → Switch feed queries to read replica (TypeORM replication config)
  → Add Typesense search node (stop using PostgreSQL FTS)

2,000+ req/s OR 5+ cities:
  → Enable Supabase connection pooling (PgBouncer — enable in dashboard)
  → Redis: switch from Upstash to Redis Cluster (Upstash supports this)
  → Feed caching: increase TTL from 60s to 120s (reduces DB pressure)
  → CDN: enable Cloudflare caching for API responses (city-level feed endpoint)

10,000+ req/s OR US-wide:
  → Evaluate moving API to Fly.io (multi-region)
  → PostgreSQL: consider Neon serverless for auto-scaling
  → Analytics: move from PostgreSQL analytics_events to ClickHouse
  → Notifications: dedicated service (>10K pushes/day)
```

---

## STEP 3 — Code Generation Prompt Pack

The following prompts are copy-paste ready for any coding model. Execute in order.

---

### Prompt 1: Billing Module (Stripe Integration)

```
You are extending the Muzgram NestJS API at apps/api. The codebase uses NestJS + Fastify + TypeORM + Supabase PostgreSQL.

TASK: Build the complete billing module with Stripe integration.

FILES TO CREATE:
  apps/api/src/modules/billing/billing.module.ts
  apps/api/src/modules/billing/billing.controller.ts
  apps/api/src/modules/billing/billing.service.ts
  apps/api/src/modules/billing/dto/create-checkout-session.dto.ts
  apps/api/src/database/entities/subscription.entity.ts
  apps/api/src/database/entities/payment.entity.ts
  apps/api/src/database/migrations/005-billing-tables.ts

DEPENDENCIES: Add stripe@^14.x to apps/api/package.json

PRODUCTS (hardcoded constants, no Stripe product lookup):
  FEATURED_LISTING: $75/mo subscription
  BUSINESS_PRO: $49/mo subscription (feature-flagged, not yet visible in app)
  EVENT_BOOST: $25 one-time
  LEAD_PACK_10: $50 one-time (10 leads)

ENDPOINTS:
  POST /v1/billing/checkout
    Auth: ClerkAuthGuard (business_owner role required)
    Body: { product: 'featured_listing' | 'event_boost' | 'lead_pack_10', listingId: string, successUrl: string, cancelUrl: string }
    Action: Create or retrieve Stripe Customer for this listing's owner → create Stripe Checkout Session → return { checkoutUrl }

  POST /v1/billing/portal
    Auth: ClerkAuthGuard (business_owner)
    Body: { listingId: string, returnUrl: string }
    Action: Create Stripe Customer Portal session → return { portalUrl }

  POST /v1/billing/webhook
    Auth: NONE — public route (@Public decorator)
    Headers: stripe-signature (Stripe sends this)
    Action: Verify signature with stripe.webhooks.constructEvent(rawBody, sig, STRIPE_WEBHOOK_SECRET)
    Handle events:
      checkout.session.completed → create subscription or payment record, activate feature
      customer.subscription.updated → sync status to subscriptions table
      customer.subscription.deleted → set status=cancelled, schedule feature deactivation in 3 days
      invoice.payment_failed → set status=past_due, log to audit
      invoice.payment_succeeded → extend featuredUntil by 30 days

  GET /v1/billing/status
    Auth: ClerkAuthGuard (business_owner)
    Query: ?listingId=
    Returns: { isFeatured: boolean, featuredUntil: string|null, activeSubscriptions: Subscription[], leadBalance: number }

MIGRATION 005:
  CREATE TABLE subscriptions (id, business_id FK listings, stripe_customer_id, stripe_subscription_id, product_key, status, current_period_start, current_period_end, cancelled_at, created_at, updated_at)
  CREATE TABLE payments (id, business_id, stripe_payment_intent_id, product_key, amount_cents, currency, status, created_at)
  CREATE TABLE lead_packs (id, business_id, total_leads, used_leads, stripe_payment_intent_id, created_at, expires_at)

WEBHOOK RAW BODY: Fastify requires rawBody to verify Stripe signature. Add rawBody: true to FastifyAdapter config in main.ts and use req.rawBody in webhook handler.

ENTITLEMENT CHECK: After checkout.session.completed for featured_listing, set listings.is_featured=true AND listings.featured_until = NOW() + INTERVAL '30 days'. After subscription.deleted (plus 3-day grace), set is_featured=false.

AUDIT: Every webhook event that modifies subscription state must call AuditService.log() with actorId='stripe', action='subscription_updated', targetType='listing'.

WIRE UP: Register BillingModule in app.module.ts.

Preserve existing patterns: RFC 9457 errors, ClerkAuthGuard, @Public() decorator, class-validator DTOs, response interceptor.
```

---

### Prompt 2: Leads Module

```
You are extending the Muzgram NestJS API at apps/api.

TASK: Build the complete leads module — creation, delivery, tracking, and business inbox.

FILES TO CREATE:
  apps/api/src/modules/leads/leads.module.ts
  apps/api/src/modules/leads/leads.controller.ts
  apps/api/src/modules/leads/leads.service.ts
  apps/api/src/modules/leads/dto/create-lead.dto.ts
  apps/api/src/database/entities/lead.entity.ts
  apps/api/src/database/migrations/006-leads-table.ts
  apps/worker/src/processors/lead-delivery.processor.ts

MIGRATION 006:
  CREATE TABLE leads (
    id UUID PK,
    user_id UUID FK users NOT NULL,
    listing_id UUID FK listings NOT NULL,
    lead_type VARCHAR(20) NOT NULL CHECK (lead_type IN ('call_tap', 'whatsapp_tap', 'message_form')),
    status VARCHAR(20) DEFAULT 'new' CHECK (status IN ('new', 'contacted', 'converted', 'dismissed')),
    message TEXT,
    user_phone VARCHAR(20),
    user_display_name VARCHAR(100),
    delivered_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
  );
  CREATE UNIQUE INDEX idx_leads_cap ON leads(user_id, listing_id) WHERE created_at > NOW() - INTERVAL '7 days';
  -- This unique index enforces max 1 lead per user per listing per 7 days at DB level

ENDPOINTS:
  POST /v1/leads
    Auth: ClerkAuthGuard (user role)
    Body: { listingId: string, leadType: 'call_tap'|'whatsapp_tap'|'message_form', message?: string }
    Validation:
      - Check lead pack balance for listing's owner → if 0 balance and no active subscription, return specific error
      - Check 7-day cap (unique index will enforce, catch and return 429 with user-facing message)
      - Enqueue lead delivery job (push notification to business owner within 60s)
    Returns: 201 with { id, status: 'new' }
    Error types: 'lead-limit-exceeded' (429), 'provider-not-accepting-leads' (422)

  GET /v1/leads
    Auth: ClerkAuthGuard (business_owner only — their listings' leads)
    Query: ?listingId=&status=&cursor=&limit=20
    Returns: paginated leads with user contact info

  PATCH /v1/leads/:id/status
    Auth: ClerkAuthGuard (must own the listing the lead belongs to)
    Body: { status: 'contacted'|'converted'|'dismissed' }
    Returns: 200 updated lead

WORKER PROCESSOR (lead-delivery.processor.ts):
  Queue: 'leads'
  Job: deliver lead to business owner
  Actions:
    1. Load listing + owner user
    2. Send push notification to owner: "New lead from [User Display Name]"
    3. Send email to owner (Resend/SendGrid): lead details + user contact
    4. Update lead.delivered_at = NOW()
  Handle: owner has no push token → skip push, still send email

WIRE UP: Register LeadsModule in app.module.ts. Register 'leads' queue in BullModule. Register LeadDeliveryProcessor in worker app.module.ts.

ANALYTICS: POST /v1/leads also fires analytics event 'lead_created' server-side via AnalyticsService.
```

---

### Prompt 3: Search Module

```
You are extending the Muzgram NestJS API at apps/api.

TASK: Build the search module using PostgreSQL full-text search.

FILES TO CREATE:
  apps/api/src/modules/search/search.module.ts
  apps/api/src/modules/search/search.controller.ts
  apps/api/src/modules/search/search.service.ts
  apps/api/src/database/migrations/007-search-vectors.ts

MIGRATION 007:
  -- Add search vectors
  ALTER TABLE listings ADD COLUMN IF NOT EXISTS search_vector tsvector;
  ALTER TABLE events ADD COLUMN IF NOT EXISTS search_vector tsvector;

  -- Populate existing rows
  UPDATE listings SET search_vector = to_tsvector('english',
    COALESCE(name, '') || ' ' ||
    COALESCE(description, '') || ' ' ||
    COALESCE(address, '') || ' ' ||
    COALESCE(neighborhood, '')
  );

  UPDATE events SET search_vector = to_tsvector('english',
    COALESCE(title, '') || ' ' ||
    COALESCE(description, '') || ' ' ||
    COALESCE(address, '')
  );

  -- GIN indexes for fast FTS
  CREATE INDEX CONCURRENTLY idx_listings_search ON listings USING GIN(search_vector);
  CREATE INDEX CONCURRENTLY idx_events_search ON events USING GIN(search_vector);

  -- Triggers to keep vectors fresh on update
  CREATE FUNCTION listings_search_vector_update() RETURNS trigger AS $$
  BEGIN
    NEW.search_vector := to_tsvector('english',
      COALESCE(NEW.name, '') || ' ' || COALESCE(NEW.description, '') || ' ' || COALESCE(NEW.address, '')
    );
    RETURN NEW;
  END;
  $$ LANGUAGE plpgsql;
  CREATE TRIGGER trg_listings_search BEFORE INSERT OR UPDATE ON listings
    FOR EACH ROW EXECUTE FUNCTION listings_search_vector_update();

  -- Same trigger for events

ENDPOINTS:
  GET /v1/search?q=&cityId=&type=&cursor=&limit=20
    Auth: @Public()
    Query params:
      q: string (required, min 2 chars, max 100 chars)
      cityId: UUID (required)
      type: 'listing'|'event'|'all' (default: 'all')
      limit: number (default: 20, max: 50)
      cursor: base64url cursor
    Logic:
      - Sanitize q with plainto_tsquery (handles typos, stops injection)
      - Listings query:
          SELECT l.*, ts_rank_cd(l.search_vector, query) * (l.save_count * 0.01 + 1) AS rank
          FROM listings l, plainto_tsquery('english', $1) query
          WHERE l.search_vector @@ query AND l.city_id = $2 AND l.is_active = true
          ORDER BY rank DESC, l.save_count DESC
      - Events query: same pattern on events table, filter start_at > NOW()
      - Merge results: interleave listings and events by rank score
      - Cache: 60s Redis (key: search:{cityId}:{normalizedQuery})
    Returns: CursorPage<SearchResult> where SearchResult has itemType: 'listing'|'event'

  GET /v1/search/suggest?q=&cityId=
    Auth: @Public()
    Fast autocomplete — NO FTS, just ILIKE prefix match on name
    SELECT name, slug, main_category FROM listings WHERE city_id = $1 AND name ILIKE $2 || '%' AND is_active = true LIMIT 5
    Union with same query on events
    Returns: { suggestions: { id, name, type, slug }[] }
    Cache: 120s Redis
    NEVER use this for full search — only for typeahead dropdown

SEARCH ANALYTICS:
  Log every search_query_submitted event to analytics queue (async, non-blocking)
  Track zero-result queries separately for content gap analysis
```

---

### Prompt 4: Analytics Module

```
You are extending the Muzgram NestJS API at apps/api.

TASK: Build the analytics event ingest pipeline and session tracking.

FILES TO CREATE:
  apps/api/src/modules/analytics/analytics.module.ts
  apps/api/src/modules/analytics/analytics.controller.ts
  apps/api/src/modules/analytics/analytics.service.ts
  apps/api/src/modules/analytics/dto/track-events.dto.ts
  apps/api/src/database/entities/analytics-event.entity.ts
  apps/api/src/database/entities/analytics-session.entity.ts
  apps/api/src/database/migrations/008-analytics-tables.ts

MIGRATION 008:
  CREATE TABLE analytics_events (
    id          BIGSERIAL,
    user_id     UUID REFERENCES users(id) ON DELETE SET NULL,
    session_id  VARCHAR(40) NOT NULL,
    event_name  VARCHAR(100) NOT NULL,
    properties  JSONB DEFAULT '{}',
    app_version VARCHAR(20),
    platform    VARCHAR(10),  -- ios | android | web
    city_id     UUID REFERENCES cities(id),
    created_at  TIMESTAMPTZ DEFAULT NOW()
  ) PARTITION BY RANGE (created_at);

  -- Create weekly partitions (extend monthly as needed)
  CREATE TABLE analytics_events_2026_w17 PARTITION OF analytics_events
    FOR VALUES FROM ('2026-04-21') TO ('2026-04-28');
  -- (add more partitions in worker weekly job)

  CREATE INDEX idx_analytics_user ON analytics_events(user_id, created_at DESC);
  CREATE INDEX idx_analytics_event_name ON analytics_events(event_name, created_at DESC);

  CREATE TABLE analytics_sessions (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    session_id  VARCHAR(40) NOT NULL UNIQUE,
    platform    VARCHAR(10) NOT NULL,
    app_version VARCHAR(20),
    started_at  TIMESTAMPTZ NOT NULL,
    ended_at    TIMESTAMPTZ,
    duration_seconds INTEGER,
    created_at  TIMESTAMPTZ DEFAULT NOW()
  );
  CREATE INDEX idx_sessions_user ON analytics_sessions(user_id, started_at DESC);

ENDPOINTS:
  POST /v1/analytics/events
    Auth: ClerkAuthGuard (optional — if no JWT, events stored without userId)
    Body: { events: AnalyticsEvent[] } where AnalyticsEvent = { name, properties?, sessionId, platform, appVersion, timestamp? }
    Validation: max 50 events per request, event name max 100 chars
    Action: Push to 'analytics' Bull queue (non-blocking) → return 202 immediately
    NEVER return 4xx/5xx for analytics failures — log error internally but always return 202

  POST /v1/analytics/sessions
    Auth: ClerkAuthGuard (required — retention data needs userId)
    Body: { action: 'start'|'end', sessionId: string, platform: string, appVersion: string, durationSeconds?: number }
    Action: SYNCHRONOUS DB write (retention metrics are critical, not batch-able)
    start → upsert analytics_sessions (started_at = NOW())
    end → update ended_at, duration_seconds

WORKER PROCESSOR (analytics.processor.ts):
  Queue: 'analytics'
  Concurrency: 5
  Job: flush event batch to analytics_events table
  Batch INSERT (single query, up to 50 rows)
  Forward to PostHog via PostHog Node SDK (fire and forget)

WEEKLY PARTITION JOB:
  Add to worker's scheduled jobs (BullMQ cron):
  Every Monday 1am: CREATE TABLE analytics_events_{week} PARTITION OF analytics_events FOR VALUES FROM (...) TO (...)
  Log partition creation to audit_logs

WIRE UP: Register AnalyticsModule in app.module.ts.
```

---

### Prompt 5: RBAC Guards and Audit Logging

```
You are extending the Muzgram NestJS API at apps/api.

TASK: Implement production-quality RBAC and append-only audit logging.

FILES TO CREATE:
  apps/api/src/common/guards/roles.guard.ts
  apps/api/src/common/guards/resource-owner.guard.ts
  apps/api/src/common/decorators/roles.decorator.ts
  apps/api/src/common/interceptors/audit.interceptor.ts
  apps/api/src/modules/audit/audit.module.ts
  apps/api/src/modules/audit/audit.service.ts
  apps/api/src/database/entities/audit-log.entity.ts
  apps/api/src/database/migrations/009-audit-logs.ts

FILES TO UPDATE:
  apps/api/src/modules/users/users.controller.ts     → add @Roles guards
  apps/api/src/modules/moderation/moderation.controller.ts → add @Roles + @UseInterceptors(AuditInterceptor)
  apps/api/src/modules/listings/listings.controller.ts     → add ResourceOwnerGuard on PATCH/DELETE

MIGRATION 009:
  CREATE TABLE audit_logs (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    actor_id    VARCHAR(100) NOT NULL,  -- userId or 'stripe' or 'system'
    actor_role  VARCHAR(30) NOT NULL,
    action      VARCHAR(100) NOT NULL,  -- 'listing.approve', 'user.ban', 'subscription.activate'
    target_type VARCHAR(50) NOT NULL,
    target_id   VARCHAR(100),
    before_state JSONB,
    after_state  JSONB,
    ip_address  VARCHAR(45),
    user_agent  VARCHAR(300),
    created_at  TIMESTAMPTZ DEFAULT NOW()
  );
  -- Never add UPDATE or DELETE permissions on this table to the app user
  CREATE INDEX idx_audit_actor ON audit_logs(actor_id, created_at DESC);
  CREATE INDEX idx_audit_target ON audit_logs(target_type, target_id, created_at DESC);

ROLES GUARD:
  @Injectable()
  export class RolesGuard implements CanActivate {
    // Read role from request.user.role (set by ClerkAuthGuard from DB)
    // @Roles('admin', 'moderator') → allow if user.role is in allowed list
    // super_admin passes all role checks
    // If no @Roles decorator on route → pass through (role not required)
  }

RESOURCE OWNER GUARD:
  // Ensures user can only modify their own resources
  // Reads resourceId from params, checks ownership via DB query
  // admin/super_admin bypass ownership check
  // Example: PATCH /v1/listings/:id → check listing.claimed_by_user_id === request.user.id

AUDIT INTERCEPTOR:
  // Applied to all admin controllers via @UseInterceptors(AuditInterceptor)
  // Before action: capture existing state (DB read)
  // After action: capture new state
  // Write to audit_logs: actor, action (from @AuditAction('listing.approve') decorator), before/after
  // Never throw on audit failure — log error but let response proceed

AUDIT SERVICE:
  async log(entry: AuditLogEntry): Promise<void>
  // Writes to audit_logs table — no cache, direct DB write
  // Called directly by BillingService for Stripe events (actor='stripe')
  // Called by SystemJobs for automated actions (actor='system')

USER ENTITY UPDATE:
  Add role column: @Column({ type: 'varchar', default: 'user' }) role: UserRole;
  enum UserRole { USER = 'user', BUSINESS_OWNER = 'business_owner', MODERATOR = 'moderator', ADMIN = 'admin', SUPER_ADMIN = 'super_admin' }
  ClerkAuthGuard: after loading user from DB, set request.user = userEntity (includes role)

APPLY RBAC to existing controllers:
  @Get('/admin/*') routes → @Roles('admin', 'moderator', 'super_admin')
  @Patch('/users/:id/trust-tier') → @Roles('admin', 'super_admin')
  @Post('/events') → @Roles('business_owner', 'admin', 'super_admin') [organizers can post events]
```

---

### Prompt 6: Mobile — Notification Center + Search Screen

```
You are extending the Muzgram React Native Expo mobile app at apps/mobile.
Stack: Expo SDK 53, React Native 0.77, NativeWind v4, TanStack Query v5, Zustand v5, Expo Router v3.

TASK: Build the notifications inbox screen and search screen.

FILES TO CREATE:
  apps/mobile/app/notifications/index.tsx          (route wrapper — 5 lines max)
  apps/mobile/src/screens/NotificationsScreen.tsx
  apps/mobile/src/queries/notifications.queries.ts
  apps/mobile/app/search/index.tsx
  apps/mobile/src/screens/SearchScreen.tsx
  apps/mobile/src/queries/search.queries.ts
  apps/mobile/src/components/feed/SearchResultCard.tsx

NOTIFICATIONS SCREEN:
  Header: "Notifications" (left) + "Mark all read" button (right, only shown if unread count > 0)
  
  FlashList of notification items. Each item:
    - Left: colored dot (unread) or faded (read) + category icon
    - Middle: notification body (max 2 lines, truncated) + time ago ("2h ago", "Yesterday")
    - Right: chevron if tappable (links to listing/event)
    - Background: slightly lighter (#1E1E1E) for unread items
    - Tap: navigate to linked content + mark as read
  
  Empty state: "You're all caught up" with subtle icon
  
  Pull-to-refresh
  Infinite scroll (cursor pagination)
  
  Tab badge: show unread count on tab bar icon (update Zustand notifStore.unreadCount)
  
  API calls:
    GET /v1/notifications → notifications.queries.ts useNotifications()
    POST /v1/notifications/read-all → invalidate notifications query

SEARCH SCREEN:
  SearchBar at top (autofocused on screen open, NativeWind styled)
  Below search bar: 3 "Recent searches" pills (stored in MMKV, max 10)
  Below recent: "Browse Categories" section → same 3 category cards as Explore tab
  
  As user types (debounced 300ms):
    - Hit GET /v1/search/suggest?q= for typeahead (show below input as dropdown)
    - Max 5 suggestions, each shows name + category icon
    - Tap suggestion → execute full search with that query
  
  On submit (keyboard search button OR suggestion tap):
    - Transition to results view
    - Hit GET /v1/search?q=&cityId= (from locationStore.cityId)
    - Show FlashList of SearchResultCard items
    - SearchResultCard: same as ListingCard/EventCard but compact (no image, text-only for speed)
    - Tab between "All" | "Places" | "Events" filter pills
    - Zero results state: "No results for '{query}'" + "Try something like: Shawarma, Eid events, photographers"
  
  QUERIES FILE:
    useSearchSuggestions(query: string) — enabled when query.length >= 2
    useSearch(query: string, type: string, cityId: string) — enabled when query.length >= 2
    Both use staleTime: 60_000 (suggestions can be cached)
  
  ANALYTICS:
    Track 'search_initiated' on screen open
    Track 'search_query_submitted' with { query, resultCount } on submit
    Track 'search_zero_results' when resultCount === 0
    Track 'search_result_tapped' with { resultId, resultType, position }
  
  UPDATE (tabs)/_layout.tsx:
    Add search tab or make search icon in header navigate to /search

IMPORTANT: No FlatList — use FlashList. No StyleSheet.create — NativeWind only. No AsyncStorage — MMKV for recent searches.
```

---

### Prompt 7: Mobile — Business Dashboard + Onboarding Flow

```
You are extending the Muzgram React Native Expo mobile app at apps/mobile.

TASK: Build the business owner experience — dashboard, leads inbox, and claim/onboarding flow.

FILES TO CREATE:
  apps/mobile/app/business/dashboard.tsx
  apps/mobile/app/business/leads.tsx
  apps/mobile/app/business/edit.tsx
  apps/mobile/app/business/claim.tsx
  apps/mobile/app/business/onboarding.tsx
  apps/mobile/src/screens/business/BusinessDashboardScreen.tsx
  apps/mobile/src/screens/business/LeadsScreen.tsx
  apps/mobile/src/screens/business/ClaimScreen.tsx
  apps/mobile/src/screens/business/BusinessOnboardingScreen.tsx
  apps/mobile/src/queries/business.queries.ts
  apps/mobile/src/components/business/LeadCard.tsx
  apps/mobile/src/components/business/StatsBadge.tsx

PROFILE SCREEN UPDATE (apps/mobile/app/(tabs)/profile.tsx):
  If user.role === 'business_owner': show "My Business" button that navigates to /business/dashboard
  If user has no claimed listing: show "List Your Business" button → /business/claim

CLAIM SCREEN (/business/claim):
  Step 1: Search for your business by name (uses GET /v1/search/suggest)
  Step 2: Select your business from results (shows listing card)
  Step 3: Confirm: "This is my business" + phone number input (pre-filled from auth)
  Step 4: Submit (POST /v1/onboarding/business/start)
  Step 5: Pending state: "Your claim is under review. We'll notify you within 24 hours."
  Analytics: 'business_claim_started', 'business_claim_submitted'

BUSINESS DASHBOARD (/business/dashboard):
  Header: business name + verified badge (if trust_tier >= 3)
  
  Tabs: Overview | Leads | Stats
  
  OVERVIEW TAB:
    Live preview of their listing (how users see it)
    "Edit Listing" button → /business/edit
    "Add Daily Special" button → bottom sheet with form (text + optional photo)
    "Boost" button (gold, prominent):
      - If listing is featured: "Featured until [date]" (green badge)
      - If not featured: "Feature Your Listing — $75/mo" → opens Stripe checkout WebView
      - If has event: "Boost Event — $25" → Stripe checkout
    
  LEADS TAB:
    FlashList of LeadCard items
    LeadCard: lead type icon + user display name + time + status badge + phone number
    Tap lead → expand to show full contact info + action buttons (Mark Contacted, Mark Converted, Dismiss)
    Filter: All | New | Contacted | Converted
    Empty state: "No leads yet. Boost your listing to get more visibility."
    Unread lead count shown as badge on tab
    
  STATS TAB:
    Weekly stats (last 7 days):
      Views: [number]  Saves: [number]  Call taps: [number]  WhatsApp taps: [number]
    Simple bar chart (react-native-gifted-charts or Victory Native)
    "This week vs last week" % change indicator

BUSINESS QUERIES FILE:
  useMyListing() → GET /v1/businesses/mine
  useMyLeads(filter) → GET /v1/leads?status=filter
  useLeadUpdate(leadId) → PATCH /v1/leads/:id/status mutation
  useMyStats() → GET /v1/admin/business-stats (business_owner scoped endpoint)

STRIPE CHECKOUT:
  Install: expo install expo-web-browser
  When "Feature My Listing" tapped:
    1. Call POST /v1/billing/checkout → get checkoutUrl
    2. Open with WebBrowser.openBrowserAsync(checkoutUrl)
    3. On return: refetch useMyListing to update isFeatured state
  No in-app purchase — web browser Stripe checkout avoids Apple 30% cut
```

---

### Prompt 8: apps/web Next.js Scaffold

```
You are creating the apps/web Next.js 15 App Router application from scratch within the Muzgram Turborepo monorepo.

TASK: Scaffold apps/web with working homepage, city hub page, and business detail page — enough to verify the architecture before building all page types.

REFERENCE DOCS: docs/25-seo-implementation-plan.md (full architecture, routing, caching specs)

FILES TO CREATE:
  apps/web/package.json                        ← (spec in docs/25)
  apps/web/next.config.ts                      ← image optimization, PPR, headers
  apps/web/tsconfig.json
  apps/web/tailwind.config.ts                  ← Muzgram design tokens (same as mobile)
  apps/web/postcss.config.js
  apps/web/src/app/layout.tsx                  ← Root layout (dark theme, fonts, PostHog)
  apps/web/src/app/page.tsx                    ← Homepage
  apps/web/src/app/[city]/page.tsx             ← City hub (ISR 6h)
  apps/web/src/app/[city]/places/[slug]/page.tsx ← Business detail (ISR 24h + on-demand)
  apps/web/src/app/sitemap.ts
  apps/web/src/app/robots.ts
  apps/web/src/app/api/revalidate/route.ts
  apps/web/src/lib/db.ts                       ← Read-only PG pool (react cache())
  apps/web/src/lib/cache/redis.ts
  apps/web/src/lib/schema/business.schema.ts
  apps/web/src/lib/schema/breadcrumb.schema.ts
  apps/web/src/lib/seo/titles.ts
  apps/web/src/components/layout/Header.tsx
  apps/web/src/components/layout/Footer.tsx
  apps/web/src/components/layout/AppDownloadBanner.tsx  ← Smart app banner (sticky bottom)
  apps/web/src/components/feed/ListingCard.tsx
  apps/web/src/components/feed/EventCard.tsx
  apps/web/src/components/seo/SchemaScript.tsx
  apps/web/src/components/seo/BreadcrumbNav.tsx
  apps/web/src/components/conversion/InstallCTA.tsx
  apps/web/public/.well-known/apple-app-site-association
  apps/web/public/.well-known/assetlinks.json

DATABASE CONNECTION (db.ts):
  Use pg.Pool with DATABASE_READ_URL env var
  Use React cache() to deduplicate queries within a render tree
  Max pool size: 5 (web is read-only)
  SSL required

HOMEPAGE (page.tsx):
  Static (no revalidate — fully static)
  Above fold: H1 "Find Halal Spots, Events & Services Near You", dark background
  App download CTAs for iOS and Android
  6 listing cards from Chicago (hardcoded citySlug='chicago' for MVP)
  4 upcoming event cards from Chicago
  3 category cards: Eat, Go Out, Connect → link to /chicago/eat etc
  "For Businesses" section with link to /for-businesses
  Footer with privacy/terms links

CITY HUB PAGE ([city]/page.tsx):
  generateStaticParams: query all active cities
  generateMetadata: title/description formulas from titles.ts
  export const revalidate = 21600
  Page content: full city hub structure (see docs/25 Section 4.2)
  Include: LocalBusiness JSON-LD for top 5 listings, BreadcrumbList
  Include: NeighborhoodNav component showing cluster cities

BUSINESS DETAIL PAGE ([city]/places/[slug]/page.tsx):
  generateStaticParams: top 10K listings by save_count
  generateMetadata: full OG tags, Twitter cards
  export const revalidate = 86400
  export const dynamicParams = true
  Page content: hero image, details, hours, halal badge, "Open in App" CTA
  JSON-LD: LocalBusiness schema + BreadcrumbList
  AppDownloadBanner: sticky bottom bar linking to app

APP DOWNLOAD BANNER:
  Sticky bottom on all content pages (not homepage)
  Mobile: "Open in Muzgram App — See live map + updates"
  [App Store button] [Google Play button]
  Dismiss button (stores in localStorage, hides for 7 days)
  If Universal Link supported (iOS): CTA opens app directly to content
  UTM params on all store links: ?utm_source=web&utm_medium=banner&utm_campaign=seo_page

TAILWIND CONFIG:
  Same design tokens as apps/mobile/tailwind.config.js
  background.DEFAULT: '#0D0D0D'
  brand.gold: '#D4A853'
  etc. — copy exact tokens from mobile config

IMPORTANT: All DB queries in Server Components (RSC). No 'use client' on data-fetching components. Dynamic sections (open-now, tonight) wrapped in Suspense with skeleton fallback.
```

---

### Prompt 9: DevOps — CI/CD Pipelines

```
You are setting up the CI/CD pipeline for the Muzgram Turborepo monorepo.

TASK: Create GitHub Actions workflows for automated testing, migration running, and deployment.

FILES TO CREATE:
  .github/workflows/api.yml       ← API test + migrate + deploy
  .github/workflows/mobile.yml    ← Typecheck + EAS build on release branch
  .github/workflows/web.yml       ← Web typecheck + Vercel deploy
  .github/workflows/worker.yml    ← Worker test + Railway deploy
  .github/workflows/pr-checks.yml ← Runs on every PR (fast feedback)

PR CHECKS WORKFLOW (.github/workflows/pr-checks.yml):
  Trigger: pull_request (all branches)
  Jobs (run in parallel):
    typecheck: pnpm turbo typecheck
    lint: pnpm turbo lint
    test: pnpm turbo test (unit tests only, not integration)
  Block merge if any job fails
  Target: < 3 minutes total

API WORKFLOW (.github/workflows/api.yml):
  Trigger: push to main, paths: apps/api/**, packages/**
  Jobs:
    1. test (parallel with typecheck):
       - pnpm turbo test --filter=@muzgram/api
       - Uses matrix: Node 20.x
       - Integration tests use DATABASE_URL pointing to Supabase test project
    2. migrate (needs: test):
       - Run TypeORM migration:run against STAGING database
       - If migration fails: send Slack notification (webhook), block deploy
    3. deploy-staging (needs: migrate):
       - Deploy to Railway staging environment
       - POST to Railway deploy hook (secret RAILWAY_STAGING_DEPLOY_HOOK)
       - Health check: curl https://api-staging.muzgram.com/health → must return 200 with db:connected
    4. deploy-production (needs: deploy-staging, manual approval via environment protection):
       - Deploy to Railway production
       - Health check same pattern

MOBILE WORKFLOW (.github/workflows/mobile.yml):
  Trigger: push to release/* branches OR manual dispatch
  Jobs:
    1. typecheck: pnpm turbo typecheck --filter=@muzgram/mobile
    2. eas-build (needs: typecheck):
       - Uses expo-github-action@v8
       - eas build --platform all --non-interactive --no-wait
       - Submits to TestFlight + Google Play internal track
  Secrets needed: EXPO_TOKEN, EAS_JSON (eas.json credentials)

WEB WORKFLOW (.github/workflows/web.yml):
  Trigger: push to main, paths: apps/web/**, packages/**
  Jobs:
    1. typecheck: pnpm turbo typecheck --filter=@muzgram/web
    2. deploy (needs: typecheck):
       - Uses amondnet/vercel-action
       - Deploys to Vercel production
       - After deploy: ping Google sitemap (curl "https://www.google.com/ping?sitemap=https://muzgram.com/sitemap.xml")

ENVIRONMENT PROTECTION RULES (configure in GitHub repo settings):
  Production environment:
    - Required reviewers: [atifmumtaz@gmail.com]
    - Deployment branches: main only
  Staging environment:
    - No reviewers required
    - Deployment branches: main only

SECRETS REQUIRED (add to GitHub Actions secrets):
  DATABASE_URL_STAGING, DATABASE_DIRECT_URL_STAGING
  DATABASE_URL_PRODUCTION, DATABASE_DIRECT_URL_PRODUCTION
  RAILWAY_STAGING_DEPLOY_HOOK, RAILWAY_PRODUCTION_DEPLOY_HOOK
  VERCEL_TOKEN, VERCEL_ORG_ID, VERCEL_WEB_PROJECT_ID, VERCEL_ADMIN_PROJECT_ID
  EXPO_TOKEN
  SLACK_WEBHOOK_URL (for failure alerts)
```

---

### Prompt 10: Sentry + PostHog Integration

```
You are integrating error tracking (Sentry) and product analytics (PostHog) into the Muzgram codebase.

TASK: Wire up Sentry and PostHog across all 4 apps.

FILES TO UPDATE:
  apps/api/src/main.ts                    ← Sentry NestJS init
  apps/api/src/app.module.ts              ← Sentry integration module
  apps/mobile/app/_layout.tsx             ← Sentry + PostHog init
  apps/mobile/src/lib/analytics.ts        ← NEW: PostHog wrapper + event helpers
  apps/web/src/app/layout.tsx             ← PostHog provider for web
  apps/web/src/lib/analytics.ts           ← NEW: PostHog web helpers

NEW PACKAGES:
  apps/api: pnpm add @sentry/node @sentry/nestjs
  apps/mobile: pnpm add @sentry/react-native posthog-react-native
  apps/web: pnpm add posthog-js

SENTRY - API (main.ts):
  Sentry.init({
    dsn: process.env.SENTRY_DSN,
    environment: process.env.NODE_ENV,
    integrations: [new Sentry.Integrations.Http({ tracing: true })],
    tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
    release: process.env.npm_package_version,
  });
  Capture all unhandled exceptions + HTTP 5xx responses
  Add correlationId to Sentry scope on each request (from HttpExceptionFilter)

SENTRY - MOBILE (app/_layout.tsx):
  Sentry.init({
    dsn: process.env.EXPO_PUBLIC_SENTRY_DSN,
    environment: __DEV__ ? 'development' : 'production',
    tracesSampleRate: __DEV__ ? 1.0 : 0.1,
    attachStacktrace: true,
  });
  Wrap root navigator with Sentry.wrap()
  Set user context on auth: Sentry.setUser({ id: user.id }) — NO PII (no email/phone)

POSTHOG - MOBILE (src/lib/analytics.ts):
  import PostHog from 'posthog-react-native';
  export const posthog = new PostHog(process.env.EXPO_PUBLIC_POSTHOG_KEY!, {
    host: 'https://app.posthog.com',
    disabled: __DEV__,
    captureMode: 'form',  // batch mode
    flushAt: 20,           // send after 20 events
    flushInterval: 30000,  // or every 30s
  });
  export function track(event: keyof typeof ANALYTICS_EVENTS, properties?: Record<string, unknown>) {
    posthog.capture(ANALYTICS_EVENTS[event], properties);
  }
  export function identify(userId: string, traits?: Record<string, unknown>) {
    posthog.identify(userId, traits); // NO PII — only { city, trustTier, platform }
  }
  Initialize PostHog in app/_layout.tsx with PostHogProvider
  On auth complete: identify(user.id, { city: user.citySlug, platform: Platform.OS })
  On logout: posthog.reset()

POSTHOG - WEB (app/layout.tsx):
  'use client' provider component
  PHProvider from 'posthog-js/react'
  Init in useEffect: posthog.init(key, { api_host, capture_pageview: false })
  Use next/navigation to manually track page views on route change
  Pageview properties: { page_type: 'city'|'listing'|'event', city_slug, content_id }

PRIVACY COMPLIANCE:
  PostHog: respect user analytics_opted_out setting (stored in Zustand + MMKV)
  If opted out: posthog.opt_out_capturing()
  Default: opted IN (standard for apps without GDPR obligation, but implement toggle in settings)
  Never capture: phone numbers, exact addresses, financial data
```

---

## STEP 4 — UI Completion Prompt Pack

### Prompt U1: Feed Screen Production Polish

```
Harden apps/mobile/app/(tabs)/index.tsx and related components to production quality.

CHANGES TO MAKE:

1. ListingCard (apps/mobile/src/components/feed/ListingCard.tsx):
   - Add featured ribbon: if listing.isFeatured → gold diagonal "★ Featured" ribbon (top-right corner, React Native absolute positioned)
   - Add halal badge: use HalalBadge component (already exists)
   - Add open/closed status: computed from listing.hours using isOpenNow() from @muzgram/utils
   - Add distance label: computed from user location to listing coordinates (haversineDistance)
   - Daily special banner: if listing.dailySpecial exists → "#today's special" with countdown to midnight
   - Save button: heart icon, optimistic update (already planned — implement)
   - Share button: native share sheet with pre-formatted "Check out {name} on Muzgram"
   - Image: expo-image with blurhash placeholder (listing.primaryPhotoBlurHash)
   - Tap: navigate to /listing/[id]
   - Analytics: track 'feed_item_tapped' on press with { itemType, itemId, isFeatured, position }

2. EventCard (apps/mobile/src/components/feed/EventCard.tsx):
   - Time display: "Tonight at 7pm" | "Tomorrow" | "Sat Apr 26" | "In 3 days" (not raw ISO date)
   - Free badge: if event.isFree → "Free" badge (emerald)
   - Organizer name + verified badge if organizer trust_tier >= 3
   - Cover image with blurhash

3. Feed screen (index.tsx):
   - Featured items must appear at positions 0 and 3 in the list (never adjacent)
   - Feed recomposition: on category filter change, scroll list back to top
   - Pull-to-refresh: show gold spinner (RefreshControl tintColor='#D4A853')
   - "Nothing near you" empty state: only shows if !isLoading AND allItems.length === 0
   - Analytics: track 'feed_opened' on mount, 'feed_category_filtered' on category change

4. FeedSkeleton (apps/mobile/src/components/feed/FeedSkeleton.tsx):
   - 3 skeleton cards: placeholder shimmer animation (Reanimated 2 looping opacity)
   - Skeleton proportions must match real card proportions (no layout jump when content loads)
```

### Prompt U2: Map Screen Production Polish

```
Harden apps/mobile/app/(tabs)/map.tsx to production quality with clustering.

INSTALL: pnpm add react-native-clusterer (Supercluster wrapper)

CHANGES:

1. Map clustering:
   - Import useClustering from react-native-clusterer
   - Cluster when zoom < 13 (roughly city block level)
   - Cluster pin: dark circle (#1A1A1A border gold) with count label
   - Individual pin: colored circle by category (eat=#E07B39, go_out=#9B59B6, connect=#3498DB)
   - Cluster tap: animate camera zoom to cluster center + expand
   - Never render more than 150 individual MapboxGL.PointAnnotation — use cluster layer for overflow

2. Category filter pills:
   - Horizontal scroll above map, same pills as feed (All, Eat, Go Out, Connect)
   - Filter selection updates pin colors shown (hide non-matching categories)
   - "Mosques" pill (4th option — always visible on map)

3. Bottom sheet (install @gorhom/bottom-sheet if not already):
   - Snap points: ['35%', '75%', '95%']
   - Closed state (default): shows search/radius controls
   - Pin tap → sheet rises to 35% → shows mini card
   - Mini card: photo + name + halal badge + distance + "View Details" button
   - "View Details" → navigate to /listing/[id] or /event/[id]
   - Drag to 75% → shows full card with more details
   - Multiple pins in same location → swipeable carousel of mini cards

4. "Search this area" button:
   - Appears (animated in) when user pans > 2km from initial load center
   - Tap → query geo API with current map center + zoom bounding box
   - Shows loading spinner on map while fetching
   - Dismiss: pan back to original area

5. Current location button (top-right):
   - Flying bird icon or target icon
   - Tap → animate camera to user's GPS coordinates
   - If no location permission: show bottom sheet explaining why it's needed

6. Analytics: 'map_opened', 'map_pin_tapped' with { pinType, pinId }, 'map_category_filtered'
```

### Prompt U3: Listing Detail Screen

```
Create apps/mobile/app/listing/[id].tsx and src/screens/ListingDetailScreen.tsx

DESIGN SPEC:
  Full-screen, no tab bar (stack navigation)
  Back button: translucent overlay on hero image

SECTIONS (scroll view):
  1. HERO IMAGE (full width, 280px height)
     - expo-image with blurhash
     - If multiple photos: horizontal scroll dots indicator
     - Featured ribbon overlay: if isFeatured
     - Halal badge overlay: bottom-left of image

  2. HEADER
     - Business name (H1 size, white)
     - Category + subcategory breadcrumb ("Eat · Shawarma")
     - Neighborhood + city
     - Distance from user: "0.8 km away" with small dot separator

  3. STATUS BAR
     - Open/Closed indicator: green "Open Now" | red "Closed · Opens Mon at 11am"
     - Hours today: "Mon 11am–10pm"
     - Tap "Hours" → expand accordion showing all 7 days

  4. DAILY SPECIAL BANNER (only if active special)
     - Gold background, announcement icon
     - Special text
     - "Expires tonight at midnight" countdown

  5. CTA BUTTONS (horizontal row)
     - Call: phone icon + "Call"
     - WhatsApp: WhatsApp icon + "WhatsApp"
     - Directions: map icon + "Directions" (opens Apple Maps / Google Maps)
     - Website: globe icon (if listing.website exists)
     Each button tap: analytics event + opens respective action

  6. ABOUT
     - Description text (expandable if > 3 lines)
     - Halal certification detail: certifier name + "Owner-verified" if tier 1

  7. PHOTOS (if any)
     - Horizontal scrollable photo grid (3 visible, tap → full-screen viewer)

  8. EVENTS HERE (if any upcoming events)
     - Section header "Events Here"
     - 2-3 EventCard mini versions

  9. FROM THE COMMUNITY
     - 3 recent community posts mentioning this listing
     - Each: author display name + post text snippet + time ago

  10. SIMILAR NEARBY
      - "More [Category] Near Here"
      - 4 ListingCard items (compact, no save button)

  11. REPORT / SHARE BAR (bottom fixed)
      - Left: Save button (heart) with save count
      - Right: Share button
      - Opens native share sheet with pre-formatted text + web URL

QUERIES:
  useListingDetail(id) → GET /v1/listings/:id
  useListingEvents(id) → GET /v1/events?listingId=
  useSaveToggle() → existing from saves.queries.ts

ANALYTICS:
  'listing_viewed' with { listingId, category, isFeatured, hasSpecial } on mount
  'listing_call_tapped', 'listing_whatsapp_tapped', 'listing_directions_tapped' on CTA press
```

---

## STEP 5 — DevOps + QA + Launch Prompt Pack

### Prompt D1: Production Environment Setup

```
Set up the complete production environment for Muzgram on Railway + Vercel + Supabase.

RAILWAY SETUP:
  Create project: muzgram-production
  Services:
    muzgram-api:
      Dockerfile: apps/api/Dockerfile (create if missing)
      Health check: GET /health timeout 30s
      Environment: copy from apps/api/.env.example with real prod values
      CPU/RAM: 512MB RAM (start), scale to 1GB if memory > 80% consistently
      Custom domain: api.muzgram.com → configure in Railway

    muzgram-worker:
      Dockerfile: apps/worker/Dockerfile (create if missing)
      No HTTP port (not a web service)
      Environment: subset of API env vars (DB, Redis, R2, Expo, Sendgrid)

  Both services need Dockerfiles. Create:
    apps/api/Dockerfile:
      FROM node:20-alpine
      WORKDIR /app
      COPY package.json pnpm-lock.yaml turbo.json ./
      COPY packages/ packages/
      COPY apps/api/ apps/api/
      RUN npm install -g pnpm && pnpm install --frozen-lockfile
      RUN pnpm turbo build --filter=@muzgram/api
      EXPOSE 3000
      CMD ["node", "apps/api/dist/main.js"]

    apps/worker/Dockerfile: same pattern, CMD node apps/worker/dist/main.js

SUPABASE PRODUCTION:
  Upgrade to Pro plan ($25/mo) — required for:
    - Point-in-time recovery (PITR)
    - More than 2 compute credits
    - 30-day backup retention
  
  Create read-only role:
    CREATE USER muzgram_api WITH PASSWORD '...';
    GRANT SELECT ON ALL TABLES IN SCHEMA public TO muzgram_api;
    -- API user needs INSERT/UPDATE on specific tables, not SELECT-only
    -- (adjust per actual need — this is for web layer)
  
  Enable Row Level Security on: users, listings, events, community_posts

VERCEL PRODUCTION:
  Two projects:
    muzgram-web: apps/web, custom domain muzgram.com
    muzgram-admin: apps/admin, custom domain admin.muzgram.com
  
  Environment variables for muzgram-web (minimum):
    DATABASE_READ_URL, REDIS_URL, REVALIDATE_SECRET, CF_ZONE_ID, CF_API_TOKEN
    NEXT_PUBLIC_API_URL, NEXT_PUBLIC_APP_SCHEME, NEXT_PUBLIC_POSTHOG_KEY
  
  Vercel Web Analytics: enable (free, good for SEO page tracking)
  Vercel Speed Insights: enable (Core Web Vitals tracking)

CLOUDFLARE:
  Zone: muzgram.com
  SSL: Full (strict)
  Always Use HTTPS: ON
  HSTS: ON (max-age 31536000, includeSubDomains)
  Cache rules: as specified in docs/25-seo-implementation-plan.md Section 7.2
  WAF rules:
    - Rate limit: > 60 req/min from single IP → challenge
    - Block bad bots: block known scraper user-agents
    - Allow Googlebot: always allow (important for SEO)
```

### Prompt D2: Launch Day Runbook

```
Create docs/runbooks/launch-day.md — the operational runbook for launch day.

This document must cover:

PRE-LAUNCH CHECKS (T-24 hours):
  [ ] Run full migration list against production: pnpm typeorm migration:run
  [ ] Verify all 12 migrations applied: check schema_migrations table
  [ ] Seed Chicago data: pnpm seed:production (runs seed script, idempotent)
  [ ] Smoke test API: curl https://api.muzgram.com/health → {"status":"ok","db":"connected","redis":"connected"}
  [ ] Smoke test feed: curl https://api.muzgram.com/v1/feed?lat=41.8781&lng=-87.6298 → 200 with data
  [ ] Smoke test web: curl https://muzgram.com/chicago → 200, contains structured data
  [ ] Verify push notifications: send test push to your device via admin dashboard
  [ ] Verify Stripe: run test checkout with Stripe test card → webhook fires → isFeatured=true in DB
  [ ] Verify App Store: app approved and held (manual release)
  [ ] Verify Google Play: app in production track (not internal)

LAUNCH SEQUENCE (T=0):
  T=0:00 — Release app on App Store (flip manual release button)
  T=0:00 — Release app on Google Play (flip release button)
  T=0:05 — Send email to all 20 founding members with download links
  T=0:10 — WhatsApp message to founding members personally
  T=0:30 — Monitor Sentry for first 30 minutes (any P0 crashes = hotfix immediately)
  T=1:00 — Post on Instagram/TikTok

MONITORING CHECKLIST (every 30 min, first 4 hours):
  [ ] API error rate: Railway logs → filter for 5xx → should be < 0.1%
  [ ] Sentry: new issues → triage immediately
  [ ] Supabase: connection count → should be < 15 (10 API + 5 web)
  [ ] Upstash: queue depth → notifications queue should be processing (not growing)
  [ ] PostHog: new users appearing → auth_completed events firing
  [ ] App Store Connect: installs graph updating

ROLLBACK PLAN:
  If P0 crash affects > 5% of sessions:
    1. Identify crash in Sentry (< 5 min)
    2. If fixable in < 30 min: hotfix branch → emergency deploy (skip staging)
    3. If not fixable in < 30 min: remove app from App Store (won't affect installed users) → fix → re-submit
  
  If DB migration caused data corruption:
    1. Immediately set API to maintenance mode (env var MAINTENANCE_MODE=true → 503 on all routes)
    2. Restore from Supabase PITR to pre-migration timestamp
    3. Re-apply corrected migration
    4. Remove maintenance mode
  
  Maintenance mode endpoint in main.ts:
    if (process.env.MAINTENANCE_MODE === 'true') {
      app.use((req, res, next) => res.status(503).json({ status: 503, message: 'Maintenance in progress. Back shortly.' }));
    }

POST-LAUNCH FIRST 24 HOURS:
  [ ] Clear moderation queue every 4 hours
  [ ] Respond to every App Store review personally
  [ ] Check analytics: D1 retention (users who opened app twice) > 40%
  [ ] Check feed quality: any neighborhood showing < 5 items
  [ ] Check lead delivery: any leads not delivered within 5 minutes
```

---

## STEP 6 — Post-Launch Scale Prompt Pack

### Prompt S1: Typesense Search Integration

```
Replace PostgreSQL FTS with Typesense when search volume exceeds 1K queries/day or result quality is insufficient.

TRIGGER: PostgreSQL FTS adequate up to ~50K listings. Switch when:
  - Search response time p95 > 500ms consistently
  - User search abandonment rate > 30% (zero-result queries)
  - Total listings > 100K

TASK: Integrate Typesense as the search backend while keeping PostgreSQL FTS as fallback.

INSTALL: pnpm add typesense @types/typesense in apps/api

FILES TO CREATE/UPDATE:
  apps/api/src/modules/search/typesense.service.ts
  apps/api/src/modules/search/search.service.ts (update to use Typesense with fallback)
  apps/worker/src/processors/typesense-sync.processor.ts

TYPESENSE COLLECTIONS:
  listings: { id, name, description, city_slug, category, subcategory, lat, lng, save_count, is_active, halal_status, neighborhood }
  events: { id, title, description, city_slug, category, start_at, is_free, lat, lng, is_active }

TYPESENSE SERVICE:
  async search(query, citySlug, type, filters): Promise<SearchResult[]>
  async indexListing(listing): Promise<void>  ← called after listing create/update
  async deleteListing(id): Promise<void>       ← called after listing deactivate
  Fallback: if Typesense unreachable, fallback to existing PostgreSQL FTS

SYNC PROCESSOR:
  Queue: 'typesense-sync'
  Full re-sync job (weekly): fetch all active listings/events → bulk upsert to Typesense
  Incremental: triggered by listing/event create/update/delete

SEARCH QUALITY IMPROVEMENTS (Typesense-specific):
  - Typo tolerance: distance 1 for queries < 5 chars, 2 for longer
  - Geo-ranking: listings within 5km weighted 2x
  - Popularity weight: save_count as secondary sort
  - Faceted filtering: category, subcategory, halal_status
```

### Prompt S2: City 2 Expansion Pack

```
Prepare the system for launching City 2 (Houston or NYC) with minimal engineering effort.

TASK: Create the city expansion automation script and verify all systems support multi-city.

FILES TO CREATE:
  scripts/add-city.ts      ← Interactive script to add a new city
  scripts/seed-city.ts     ← Seeds stub listings from Google Places API
  docs/runbooks/new-city.md ← Operational runbook for each new city launch

ADD CITY SCRIPT (scripts/add-city.ts):
  Prompts for: city name, slug, state, center lat/lng, bounding box, area_km2, cluster_city_id
  Inserts into cities table with launch_status='pre_launch'
  Creates city-specific guide page record (is_published=false initially)
  Prints checklist of remaining steps
  Run: pnpm ts-node scripts/add-city.ts

SEED CITY SCRIPT (scripts/seed-city.ts):
  Input: city slug (from cities table)
  Fetches businesses from Google Places API:
    - type: restaurant, halal (keyword)
    - type: mosque
    - type: catering (keyword: halal)
  Geocodes each address (already have Mapbox token)
  Inserts as listings with: is_active=false, needs_review=true (admin reviews before activating)
  Uploads placeholder photo or uses Google Places photo URL
  Run: CITY_SLUG=houston pnpm ts-node scripts/seed-city.ts

MULTI-CITY VERIFICATION CHECKLIST (run before launching any new city):
  [ ] City record in DB with correct bounding box (verify with PostGIS ST_Contains query)
  [ ] Feed query for city center returns > 20 results
  [ ] Map pins render correctly at city center coordinates
  [ ] Near-me middleware has city mapped (CITY_SLUG_MAP in middleware.ts)
  [ ] generateStaticParams picks up new city (run next build, verify new routes generated)
  [ ] Sitemap includes new city URLs (check sitemap.xml after web deploy)
  [ ] Push notification radius configured for new city center
```

---

*This document is the complete production completion plan for Muzgram. Execute phases in order. Use the prompts in Step 3 for code generation. Every prompt is grounded in the existing codebase — extend, do not restart.*
