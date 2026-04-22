# Muzgram — 12-Week Execution Roadmap
## Zero → Live MVP (Chicago Metro)

> **Reading this doc:** Each week is a sprint. The "Gate" at the bottom of each week is a hard stop — you do not move to the next week until it passes. Risks are real and ranked by likelihood × impact. This roadmap assumes a solo founder with occasional contractor help (design, QA, DevOps).

---

## Overview

| Phase | Weeks | Theme |
|-------|-------|-------|
| **I — Foundation** | 1–3 | Infrastructure, auth, database live |
| **II — Core Product** | 4–6 | Feed, listings, events, map working end-to-end |
| **III — Complete App** | 7–8 | All 5 screens, upload, admin dashboard |
| **IV — Content & Beta** | 9–10 | Seed data, mosque partnerships, beta group |
| **V — Launch Prep** | 11–12 | App Store, founding members, public launch |

**Target launch date:** End of Week 12
**MVP gate (move to MMP):** D7 ≥ 35%, 500+ MAU, 20+ paying businesses

---

## Phase I — Foundation (Weeks 1–3)

---

### Week 1 — Infrastructure & Local Dev

**Theme:** Every developer tool works. The database is live. The first API request returns real data.

#### Product
- Finalize Chicago metro geographic scope: confirm all 8 cluster areas (Devon Ave, Bridgeview, Schaumburg, Bolingbrook, Naperville, Skokie, DuPage corridor, Hyde Park/South Side)
- Write the 20 founding member business targets list (name, category, contact, estimated $)
- Lock the MVP scope doc — no new features allowed after this week

#### Backend
- Run `pnpm install` across monorepo — resolve all dependency conflicts
- Apply migration `001-initial-schema.ts` against Supabase direct URL — verify all 15 tables created with correct PostGIS columns
- Apply migration `002-spatial-indexes.ts` — verify GIST indexes, Chicago city seed record
- Stand up Docker Compose locally (PostGIS, Redis, MinIO) for offline dev
- Confirm `apps/api` starts with `pnpm dev` and `/health` returns 200
- Write the 3 remaining environment variables in `.env`: Clerk keys from dashboard, R2 bucket created

#### Mobile
- Run `pnpm dev` in `apps/mobile` — Expo Go loads on device/simulator
- NativeWind rendering confirmed — `bg-background` shows `#0D0D0D` on a test screen
- `babel.config.js` and `metro.config.js` wired correctly (no NativeWind transform errors)
- Mapbox token set in `app.json` — blank map renders in simulator

#### Admin Dashboard
- `pnpm dev` in `apps/admin` runs on `localhost:4000`
- Admin layout renders with sidebar nav
- All 6 routes return empty state (no crash)

#### QA
- Test Supabase connection from two machines (verify pooler URL works)
- Confirm `DATABASE_DIRECT_URL` connects from TypeORM CLI for migrations
- Lint and typecheck passes across all packages: `pnpm turbo typecheck`

#### Launch Prep
- Set up GitHub repo with branch protection on `main`
- Set up CI (GitHub Actions): `lint → typecheck → test` on every PR
- Register `muzgram.com` domain if not already done; point to placeholder

#### Monetization
- Research Zelle vs Venmo vs bank transfer for founding member collection
- Create simple Google Form for "Founding Member Interest" (name, business, phone)

**Weekly Milestone:** `pnpm dev` works across all 4 apps simultaneously. Supabase schema is live. A `GET /health` from the API returns `{ status: "ok", db: "connected" }`.

**Biggest Risk:** Supabase pooler connection failing with TypeORM due to PgBouncer's statement-mode incompatibility with prepared statements. Fix: ensure `?pgbouncer=true` is in pooler URL and TypeORM's `extra.prepareThreshold` is set to 0.

**Gate before Week 2:** Database schema applied ✓, all 4 dev servers start without error ✓, CI pipeline green ✓.

---

### Week 2 — Auth End-to-End

**Theme:** A real phone number receives an OTP, creates an account, and the API returns a protected resource. Auth is the most foundational thing. Do not shortcut it.

#### Product
- Write user onboarding copy for 3 screens: phone entry, OTP, welcome/neighborhood select
- Decide: does MVP ask for display name on signup or derive from phone? (Recommendation: ask — it improves feed personalization from Day 1)

#### Backend
- `ClerkAuthGuard` integrated and tested on a protected route
- `POST /webhooks/clerk` endpoint: handles `user.created`, `user.updated`, `user.deleted`
- Svix webhook signature verification confirmed (test with Clerk dashboard's "Test webhook" button)
- `UserEntity` record auto-created on `user.created` webhook — verified in Supabase dashboard
- `GET /users/me` returns the authed user's profile
- `PATCH /users/me` updates `displayName` and `expoPushToken`
- Redis user session cache working (5min TTL, invalidated on update)
- Rate limiter active — `POST /webhooks/*` has separate higher limit

#### Mobile
- Phone entry screen (`app/(auth)/index.tsx`): validates `+1XXXXXXXXXX` format before submit
- OTP screen (`app/(auth)/verify.tsx`): auto-submits on 6th digit, handles both signIn + signUp paths
- Auth redirect logic in `app/_layout.tsx`: unauthenticated → `/(auth)`, authenticated → `/(tabs)`
- `useAuth` Zustand store persists session via `expo-secure-store`
- First launch: welcome screen appears, asks for display name and neighborhood (optional)
- Push notification permission requested after auth (not at signup — too early)

#### Admin Dashboard
- Add `Authorization: Bearer` header to `adminApi` — hardcode a Clerk admin token in `.env` for now
- Dashboard page shows real stats from a `GET /admin/stats` stub (even if zeros)

#### QA
- End-to-end auth test: new phone → OTP → lands on Feed tab
- Test invalid OTP code: error message appears, input clears, user can retry
- Test expired OTP: error message is clear ("Code expired, tap resend")
- Test webhook replay: Clerk sends `user.created` twice — DB record created only once (idempotency)

#### Launch Prep
- Set up Clerk production instance (separate from dev)
- Configure phone OTP SMS sender ID to "Muzgram" in Clerk settings

#### Monetization
- N/A this week

**Weekly Milestone:** Real phone number → OTP → authenticated session → `GET /users/me` returns the user. Full auth loop tested on a physical iPhone.

**Biggest Risk:** Clerk Expo SDK and `expo-secure-store` token cache setup is under-documented. If the token isn't persisting across app restarts, users will get logged out. Fix: verify `createTokenCache` implementation in `app/_layout.tsx` is using `SecureStore.getItemAsync` correctly.

**Gate before Week 3:** Auth works on physical iOS + Android device (not just simulator) ✓. Clerk webhook creates DB user ✓. Logout → login retains same user record ✓.

---

### Week 3 — Feed API + Seed Data Foundation

**Theme:** The feed endpoint returns real, scored, geo-filtered content. You can seed stub listings and see them appear in the correct neighborhood.

#### Product
- Source the first 50 stub business listings for Chicago metro:
  - 20 restaurants (Devon Ave, Bridgeview, Naperville)
  - 15 service providers (Islamic finance, halal butcher, Muslim therapist)
  - 10 event spaces
  - 5 mosques (Bridgeview ISC, Devon Ave ISNA, Naperville IC, Skokie, Schaumburg)
- Use Google Places API + ISNA directory + manual research — save as JSON seed file

#### Backend
- `GET /feed` endpoint complete: geo filter (ST_DWithin), feed scoring, cursor pagination
- Feed scoring service: recency + proximity + type boost + featured boost + trust boost
- Feed cache: 60s TTL in Redis, keyed by `city_id + roundedLat + roundedLng + category`
- `GET /listings/:id` — listing detail
- `GET /listings` — paginated list with geo filter, category filter
- `GET /events` — upcoming events, geo filter, cursor pagination
- `GET /community-posts` — geo filter, 7-day TTL filter, cursor pagination
- Seed script: `pnpm seed` imports the 50 stub listings from JSON into DB with PostGIS coordinates
- Verify: `GET /feed?lat=41.8781&lng=-87.6298` returns mixed listing + event results, sorted by score

#### Mobile
- `GET /feed` wired to the Feed screen via `useFeed` query
- `FlashList` renders `ListingCard`, `EventCard`, `CommunityPostCard` from real API data
- Category filter pills filter the feed in real-time
- Pull-to-refresh working
- Infinite scroll: `onEndReached` triggers next page fetch
- `FeedSkeleton` shows while loading (never a spinner)
- Empty state: "Nothing near you yet" with correct copy

#### Admin Dashboard
- `GET /admin/stats` shows: total listings, events, posts, users, pending moderation items

#### QA
- Feed returns content within correct radius (test with coordinates that should return results vs. coordinates in the middle of Lake Michigan — should return 0)
- Pagination: page 1 → page 2 returns different items, no duplicates
- Featured item appears in top 2 positions (manually set `isFeatured = true` on one listing, verify)
- Feed cache: two identical requests within 60s → second request is served from Redis (check API logs)

#### Launch Prep
- Set up Upstash Redis (free tier sufficient for dev/staging)
- Set up Cloudflare R2 bucket `muzgram-media` (free tier: 10GB storage, 1M Class A ops/month)

#### Monetization
- Price the founding member package: $149 one-time, 20 slots max, includes 6 months of featured placement worth ~$1,800
- Draft the 2-paragraph founding member pitch (reference `docs/23-mvp-launch-plan.md`)

**Weekly Milestone:** `GET /feed?lat=41.8336&lng=-87.9784` (Bridgeview coordinates) returns 10+ real business listings in the correct neighborhood sorted by proximity + recency.

**Biggest Risk:** PostGIS ST_DWithin returns 0 results because seed data coordinates are wrong (copy-paste error, lat/lng swapped, or outside Chicago). Fix: verify each seed record in Supabase's table editor before running the feed query. Use a PostGIS viewer or `SELECT ST_AsText(location)` to sanity-check.

**Gate before Week 4:** Feed API returns real geo-filtered, scored results ✓. 50+ seed listings in DB ✓. Redis feed cache confirmed working ✓.

---

## Phase II — Core Product (Weeks 4–6)

---

### Week 4 — Listings, Events, Posts Modules

**Theme:** All three content types are fully CRUD-able through the API. A business owner can claim a listing. An organizer can create an event. A user can create a post.

#### Product
- Write the listing claim flow copy: what does the business owner experience? What are the verification steps for MVP? (Recommendation: phone-based — business owner calls or texts you directly for MVP. Automate in MMP.)
- Write the community post guidelines (2 short rules): what's allowed, what gets hidden

#### Backend
- `POST /listings` — create listing (admin or business owner)
- `PATCH /listings/:id` — update listing
- `POST /listings/:id/claim` — claim flow: marks `claimedByUserId`, triggers admin review
- `POST /listings/:id/specials` — create daily special with midnight expiry
- `POST /events` — create event, supports `isRecurring + recurrenceRule` (iCal RRULE format)
- `PATCH /events/:id` — update event
- `POST /community-posts` — create post with optional location, optional media
- `DELETE /community-posts/:id` — soft delete by author
- `POST /saves/toggle` — toggle save on any content type (transaction-wrapped)
- `GET /saves` — user's saved items, paginated
- `POST /reports` — report content, triggers `moderation.queue` worker
- Worker: `moderation.processor.ts` auto-hides posts at `reportWeight ≥ 3.0`

#### Mobile
- `ListingCard` → taps to detail screen `app/listing/[id].tsx`
- Listing detail: hours, phone, address, halal badge, save button, WhatsApp share
- `EventCard` → taps to detail screen `app/event/[id].tsx`
- Event detail: date/time, location, organizer, save button, share
- Save button: optimistic update (flips immediately), rollback on error
- Report sheet: long-press on any card → bottom sheet with report reasons

#### Admin Dashboard
- Listings page: approve / reject pending claimed listings
- Moderation queue: shows reported posts with content + weighted report score

#### QA
- Create a listing via API, seed it, claim it via API — verify `claimedByUserId` is set
- Create a recurring event (every Friday, iCal RRULE) — verify it appears in upcoming events
- Create a community post, report it 3x from different users — verify it's auto-hidden
- Save toggle: tap save → unsave → save — verify `savesCount` increments/decrements correctly in DB

#### Launch Prep
- Draft listing submission form (Google Form) for businesses to submit their info before you onboard them
- Set up admin Clerk account with `admin` role for yourself

#### Monetization
- Set up a simple landing page for the founding member offer — even a Notion page with a Calendly link is fine at this stage

**Weekly Milestone:** End-to-end: create a listing via API, it appears in the feed, tap it, view detail, save it, report it, admin approves it. All 3 content types working.

**Biggest Risk:** The save toggle race condition — two rapid taps could double-increment `savesCount`. Fix: confirm the DataSource transaction + unique index on `(userId, contentType, contentId)` prevents this. Test with rapid-fire API calls.

**Gate before Week 5:** All 3 content types CRUD via API ✓. Save toggle correct under concurrent calls ✓. Reports auto-hide at threshold ✓.

---

### Week 5 — Map + Media Upload

**Theme:** The map screen works with real pins. A user can upload a photo to a listing or post. These are the two highest-complexity features in the mobile app.

#### Product
- Map UX decision: on tap of a pin, does the full detail sheet open, or a mini card first? (Recommendation: mini card → tap → full detail. Matches Yelp/Foursquare mental model.)
- Write the media upload error states: file too large, wrong format, moderation rejected

#### Backend
- `POST /media/presign` — returns presigned R2 PUT URL + `assetId`
- `POST /media/confirm` — marks `MediaAsset.isPublic = true` after upload
- Worker: `moderation.processor.ts` Google Vision SafeSearch on confirmed media (auto-approve if no credentials in dev)
- `GET /geo/map-pins` — returns GeoJSON FeatureCollection for current map viewport (ST_MakeEnvelope bounding box query)
- Map pins cached 120s in Redis keyed by bounding box (rounded to 2 decimal places)
- Media cleanup job: daily, removes unconfirmed MediaAssets older than 1 hour

#### Mobile
- Map screen: Mapbox MapView loads with custom dark style
- `useMapPins` query: fetches from `/geo/map-pins?bbox=...` on region change (debounced 300ms)
- `ShapeSource` + `CircleLayer` renders color-coded pins by category (eat=orange, go_out=purple, connect=blue)
- Pin tap: `@gorhom/bottom-sheet` rises to 35% snap point with mini card
- Mini card → "View" button → full detail screen
- Radius toggle: 5km / 10km / 20km pills recalculate visible area
- Photo upload in post creation: `expo-image-picker` → resize to max 1200px → presign → PUT → confirm
- Upload progress indicator (0–100%)
- Error handling: file > 10MB shows "Image too large" inline error

#### Admin Dashboard
- Media moderation: flagged images appear in moderation queue alongside posts

#### QA
- Upload a test image: verify it appears in R2 bucket, `isPublic` flips to true after confirm
- Upload a 15MB image: verify 400 error returned before presign (client-side check)
- Map pins: move the viewport — verify new pins load. Return to original viewport — verify cache hit (no new API call)
- Map + feed: save a listing from map mini card — verify it's also saved in the feed card

#### Launch Prep
- Design the Muzgram map pin marker (small custom SVG, not default Mapbox pin)
- Set up R2 custom domain: `media.muzgram.com` → R2 public bucket

#### Monetization
- Create founding member payment instructions: "Bank transfer to [account], memo: FOUNDING + your business name"
- First direct outreach: message 5 target businesses with the founding member pitch

**Weekly Milestone:** Open map → see real pins in Chicago metro → tap a pin → see mini card → tap to full detail. Upload a photo from camera roll → appears in the feed.

**Biggest Risk:** Mapbox token scope. Using a public token in `app.json` exposes it. Fix: set token restrictions in Mapbox dashboard (allowed URLs/bundle IDs). The public token for iOS/Android SDK is fine to embed if restricted to your app's bundle ID.

**Gate before Week 6:** Map renders real geo pins in Chicago ✓. Photo upload completes end-to-end including R2 storage and moderation queue ✓.

---

### Week 6 — Explore + Search + Notifications

**Theme:** Users can discover content intentionally (not just the feed). Push notifications work. The first real notification is sent to a real user.

#### Product
- Explore screen information architecture: top-level = 3 categories (Eat, Go Out, Connect). Secondary = subcategories. No search bar in MVP — browse only. Search in text box deferred to MMP Typesense integration.
- Notification opt-in copy: "Get notified about events and specials near you" — not "Enable notifications"

#### Backend
- `GET /listings?category=eat&cityId=...` — paginated listing browse with category filter
- `GET /listings?category=go_out` — events / nightlife / entertainment
- `GET /listings?category=connect` — services, mosques, classes
- `GET /listings/search?q=...` — PostgreSQL full-text search (tsvector on name + description), good enough for MVP
- `POST /notifications/subscribe` — save Expo push token to user record
- Worker: `push-notification.processor.ts` — Expo SDK chunked push, handles `DeviceNotRegistered`
- `NotificationsService.sendToUser()` enforces: 1 push/day cap, quiet hours 9pm–7am, 8km radius requirement
- Manual trigger: `POST /admin/notifications/test` — send a test push to yourself
- Welcome notification: fires 4 hours after signup ("5 places near you to check out this week")

#### Mobile
- Explore screen: 3 category cards with custom icons and category colors
- Category → subcategory grid (e.g., Eat → Restaurants, Halal Butchers, Bakeries, Grocery)
- Subcategory → filtered listing list with FlashList
- Push notification permission request: shown after user saves their first item (earned context, not at signup)
- Foreground notification: in-app toast at top of screen (swipeable dismiss)
- Background tap: routes to correct deep link via Expo Router
- `useLocationPermission` hook: shows system permission dialog if not granted, gracefully falls back to Chicago center

#### Admin Dashboard
- Notification log: shows recent pushes sent, delivery status, open rate (stub for now)

#### QA
- Send a test push notification to your own device — verify it arrives
- Send push during quiet hours (9pm) — verify it's queued and sent next morning
- Send push to a user who has revoked device notification permission — verify `DeviceNotRegistered` error is handled and token is cleared
- Explore: tap Eat → Restaurants → scroll to bottom → infinite scroll loads more listings

#### Launch Prep
- Register for Apple Developer Program ($99/yr) — required for TestFlight
- Register for Google Play Developer account ($25 one-time)
- Create app icons: 1024×1024 PNG (iOS), adaptive icon (Android). Muzgram gold `✦` on dark background.

#### Monetization
- First founding member payment: close the first 3–5 businesses from your outreach
- Goal this week: $447–$745 in founding member payments received

**Weekly Milestone:** Explore screen fully navigable from category → listing detail. Push notification sent to a real device via the admin test endpoint.

**Biggest Risk:** Expo push notifications require a built binary (not Expo Go) to fully test on iOS. Development builds via `expo build` or EAS Build are needed before TestFlight. Don't discover this in Week 10.

**Gate before Week 7:** Category browse returns real listings ✓. Push notification received on a physical device (not Expo Go) via EAS development build ✓.

---

## Phase III — Complete App (Weeks 7–8)

---

### Week 7 — Post Creation + Profile + Community Posts

**Theme:** Users can contribute to the app. The social contract is live: give (post) to receive (better feed). Profile shows your activity.

#### Product
- Post creation UX: maximum 300 characters + optional photo + optional location tag. One screen, no drafts, no stories.
- Profile screen: what does a user see about themselves? (Recommendation: their posts, their saves, their neighborhood. No follower count — not a social network.)
- Community post display name: shown as "Mohammed from Naperville" or "A neighbor from Bridgeview" (user's choice at post time)

#### Backend
- Community posts are fully wired from Week 4 — this week is mobile + UX only
- `GET /users/:id/posts` — user's own posts
- `GET /users/:id/saves` — user's saved items
- `PATCH /users/me` — update display name, neighborhood preference, notification settings
- `DELETE /users/me` — soft delete with 30-second undo window (sets `deletedAt`, queues hard delete)
- `GET /users/me/notification-preferences` + `PATCH` — granular push notification settings

#### Mobile
- Post creation screen (`app/(tabs)/post.tsx`): character counter, photo optional, location optional, submit
- Character counter: turns red at 280/300
- Post submitted → optimistic insert at top of feed → real confirmation from API
- Profile screen (`app/(tabs)/profile.tsx`): display name, neighborhood, saved items count, posts list
- Settings sheet (from profile): notification preferences (event alerts, specials, weekly digest), neighborhood radius
- Edit profile: change display name, profile photo upload
- Sign out button (with confirm dialog)
- Account deletion: requires typing "DELETE" to confirm

#### Admin Dashboard
- Users page: search by phone, view trust tier, adjust tier via dropdown (completed last session)
- Posts page: list with hide/restore/delete actions (completed last session)

#### QA
- Create a post with photo → appears in community feed for users in that neighborhood
- Create a post, report it with 3 different accounts at tier 1+ → verify auto-hide at 3.0 weighted score
- Delete account → 30s undo window → undo → account restored
- Edit display name → feed cards reflect new name without cache stale (cache busted correctly)

#### Launch Prep
- EAS Build: create first TestFlight build for internal testing (you + 3 trusted beta users)
- Write the 5 App Store screenshots with captions
- Draft App Store description (170 characters for subtitle, 4,000 for full description)

#### Monetization
- Target: 10 founding members confirmed ($1,490 received or committed)
- Begin scheduling in-person visits to top 5 target businesses for formal onboarding

**Weekly Milestone:** A user can complete the full loop: auth → explore → save → post → view profile. App runs on a real device via TestFlight.

**Biggest Risk:** React Hook Form + Zod validation on the post creation screen has subtle UX issues on mobile keyboards (form jumps when keyboard opens, submit button hidden). Fix: use `KeyboardAvoidingView` with `behavior="padding"` on iOS and `behavior="height"` on Android, with `KeyboardAwareScrollView` as fallback.

**Gate before Week 8:** Full user journey works on TestFlight (real device, real data) ✓. Post creation → appears in feed without refresh ✓.

---

### Week 8 — Polish, Edge Cases, Performance

**Theme:** The app feels fast and intentional. Every edge case has been handled. No blank screens, no crashes, no confusing states.

#### Product
- Walk every screen as a new user and write down every friction point
- Write the 10 most likely support questions and their answers (for your own FAQ doc)
- Decide: what happens when a user opens the app and is not in Chicago? (Show Chicago content with "You're exploring Chicago" banner)

#### Backend
- All API endpoints have proper error responses (RFC 9457 format verified)
- All endpoints tested with invalid input: missing fields, wrong types, over-length strings
- Rate limiter tuned: feed endpoint allows 60 req/min, post creation 5/min, report 10/min
- Database connection pool tuned: Supabase pooler handles burst (configure `max: 20` in TypeORM)
- `GET /health` returns db connection status, redis status, and queue depths
- Logging: all errors log with correlation ID, userId, route, and execution time
- API response time P95 < 300ms on feed endpoint (measured with k6 or Artillery — even a simple test)

#### Mobile
- Offline banner: when network lost, `OfflineBanner` appears at top of screen
- All images use `expo-image` with `blurhash` placeholder (no blank image flicker)
- All list screens have correct empty states — no blank white space
- Deep link test: `muzgram://listing/[id]` opens the correct listing detail
- App backgrounding: TanStack Query marks data stale on foreground resume — feed refreshes on return
- Analytics queue: user taps flush every 30s and on backgrounding
- Performance: FlashList `estimatedItemSize` tuned to actual card heights
- Accessibility: all interactive elements have `accessibilityLabel`

#### Admin Dashboard
- Dashboard shows real counts from API
- Moderation queue auto-refreshes every 30s
- All 6 pages work without crash on real data
- Admin app deployable to Vercel (add `vercel.json` for SPA routing)

#### QA
- Full regression pass on all 5 screens with real data
- Crash testing: kill the app mid-upload, mid-post creation, during auth — verify no corrupted state
- Memory: scroll through 100+ items without memory leak (use Xcode Instruments)
- Slow network (3G simulation): verify skeletons appear immediately, no layout jump when content loads
- Dark mode: all screens look correct (app is dark-only so this means verifying no system light-mode bleed-through)

#### Launch Prep
- Submit iOS app for App Store review (first submission often takes 1–3 days)
- Submit Android app to Google Play internal testing track
- Set up Sentry (free tier) for crash reporting: `expo install sentry-expo`
- Set up Vercel for admin dashboard deployment

#### Monetization
- Target: 15 founding members ($2,235 received or committed)
- In-person business visits: onboard first 3 businesses, photograph their storefronts

**Weekly Milestone:** App passes internal QA with zero P0 bugs (crashes, blank screens, data loss). iOS submission sent to App Store review.

**Biggest Risk:** App Store review rejection. Common reasons: (1) requesting location without clear use case explanation — fix: ensure iOS `infoPlist` descriptions are specific and natural-sounding, not legalese. (2) Clerk's auth flow looks like a custom phone number collector — fix: ensure you have a privacy policy URL in the App Store listing.

**Gate before Week 9:** Zero P0 bugs in regression ✓. iOS build submitted to App Store ✓. Admin dashboard live on Vercel ✓.

---

## Phase IV — Content & Beta (Weeks 9–10)

---

### Week 9 — Content Seeding & Beta Group

**Theme:** The app has enough content that a new user opening it for the first time sees a full, useful feed — not a ghost town. 150+ listings across all 8 Chicago cluster areas.

#### Product
- Content seeding target by cluster:
  - Devon Ave: 20 restaurants, 5 services, 3 events (Jummah, halaqa, community dinner)
  - Bridgeview: 15 restaurants, 5 services, ISC Mosque recurring events
  - Naperville: 12 restaurants, 8 services, 2 event spaces
  - Schaumburg: 8 restaurants, 4 services
  - Skokie: 6 restaurants, 3 services
  - Bolingbrook: 6 restaurants, 3 services
  - DuPage corridor: 8 mixed
  - Hyde Park/South Side: 10 mixed
- Each listing must have: correct coordinates, hours, at least 1 photo, halal certification status

#### Backend
- Import pipeline: `pnpm seed:chicago` script reads from `data/chicago-listings.json`, geocodes addresses via Mapbox Geocoding API, inserts with PostGIS coordinates
- Verify: all 150+ listings return in feed queries for their respective neighborhoods
- Set up recurring events for the 5 mosques: Jummah (every Friday 1pm), any known halaqas or community events
- Run the PostGIS indexes check: `EXPLAIN ANALYZE` on feed query — confirm `city_id` partial index is hit first
- Deploy API to Railway or Render (free tier sufficient for beta) — or Fly.io for more control
- Set up environment variables in production deployment platform

#### Mobile
- Beta group: invite 20–30 people via TestFlight (iOS) and Google Play internal testing (Android)
- Target profile: Muslim, Chicago metro area, 22–35, uses Instagram or is socially active in community
- Best sources: your personal contacts, mosque young adult groups, university MSA alumni
- Brief beta users: 3-sentence message, focus on "tell me what's broken" not "do you like it"

#### Admin Dashboard
- Deploy to Vercel production URL (e.g., `admin.muzgram.com`)
- Verify admin can approve/reject content from a phone browser (critical for solo ops)

#### QA
- Beta feedback collection: set up a simple Tally or Typeform for structured feedback
- Monitor Sentry: any crashes from beta users → fix within 24 hours
- Monitor API logs: any 500 errors from real users → fix same day
- Verify all 150+ listings render correctly in the feed with real GPS coordinates

#### Launch Prep
- Finalize App Store listing:
  - App name: "Muzgram"
  - Subtitle: "Muslim Chicago — Find, Explore, Connect"
  - 5 screenshots with real in-app content (not mockups)
  - Privacy policy URL (use a free Termly or Iubenda policy)
- Set up `muzgram.com` landing page: above the fold includes "Download on App Store" + "Get it on Google Play" — even if those links aren't live yet

#### Monetization
- Target: 20 founding members confirmed ($2,980 received — the $2,682 target from launch plan)
- Begin collecting actual bank transfers or Zelle payments this week
- Create founding member tracking spreadsheet: name, business, payment status, featured slot assignment

**Weekly Milestone:** App has 150+ real listings across Chicago metro. 20-person beta group is active. Zero P0 crashes in Sentry for 48+ hours.

**Biggest Risk:** Seed data quality — photos not loading (wrong R2 keys), hours not parsing correctly, listing appearing in the wrong neighborhood. Fix: manual QA pass on every listing's detail screen in the app before inviting beta users.

**Gate before Week 10:** 150+ listings live with real photos ✓. 20+ beta users active ✓. App Store listing materials submitted ✓.

---

### Week 10 — Beta Feedback + Mosque Partnerships

**Theme:** Fix everything beta users found. Secure 3 mosque partnerships. The app is ready for public launch next week if App Store approves.

#### Product
- Categorize all beta feedback into: P0 (crashes/data loss), P1 (confusing UX), P2 (missing feature), P3 (nice to have)
- Fix all P0 and P1 issues this week — ruthlessly defer P2/P3 to post-launch
- Review 5 most common beta user paths from analytics: what are they actually doing?

#### Backend
- Fix all P0/P1 bugs from beta
- Performance: if any feed endpoint is > 500ms P95, investigate and fix (add index, tune query)
- Stress test: use k6 to simulate 100 concurrent users — verify API stays under 500ms
- Ensure the worker processes are running (notifications, moderation, content expiry) — set up health check alert if a queue worker dies
- Production database backup confirmed: Supabase auto-backups enabled, also set up a manual weekly export script

#### Mobile
- P0/P1 bug fixes from beta
- App icon finalized and correct in production build
- App version `1.0.0` set, build number `1` in `app.json`
- Submit updated build to App Store (if any bugs required code changes)
- TestFlight external testing group: expand to 100+ testers if possible

#### Admin Dashboard
- Add simple metrics to dashboard: daily active users (DAU), new users today, posts today, saves today
- These can be simple COUNT queries — no analytics platform needed yet

#### QA
- Re-test all P0/P1 issues from beta: confirm fixed
- Regression: confirm fixes didn't break other flows
- Test on oldest supported devices: iPhone 12 (iOS 17), Samsung Galaxy A-series (Android 13)
- Location accuracy: test feed with precise GPS vs. approximate location (permission denied fallback)

#### Launch Prep
- **Mosque partnership outreach:** Schedule in-person meetings with:
  - Islamic Society of Bridgeview (ISC) — largest Chicago suburban mosque
  - ISNA Chicago (Devon Ave area)
  - Islamic Center of Naperville
  - Goal: they announce Muzgram to their congregation via WhatsApp group/email newsletter on launch day
- Prepare a 1-page "Mosque Partnership Deck" (not a PDF — a clean printed sheet):
  - What Muzgram is (2 sentences, no jargon)
  - What you're asking (1 WhatsApp announcement on launch day)
  - What they get (their events listed for free, first 3 months featured at no cost)
- Prepare launch day social posts (Instagram, TikTok, WhatsApp Status) — film a 60s walkthrough video of the app

#### Monetization
- Founding members: all 20 slots closed. Send welcome emails with their login info and featured placement timeline.
- Set up the "Boost Your Event" manual process: business WhatsApps you → you mark event as `isFeatured = true` in admin → collect $25 via Zelle

**Weekly Milestone:** All P0/P1 bugs fixed. At least 2 mosque partnerships confirmed for launch day announcement. App is waiting in App Store review (or approved).

**Biggest Risk:** App Store taking longer than expected. Apple's review can be 1–5 business days. If your Week 8 submission bounced (rejection), you're now on your second attempt. If still pending, plan a soft launch via TestFlight (iOS) + Google Play (Android) while waiting — don't delay the launch.

**Gate before Week 11:** App approved on App Store OR TestFlight plan in place for launch ✓. 2+ mosque partnerships confirmed ✓. All P0/P1 bugs fixed and verified ✓.

---

## Phase V — Launch Prep (Weeks 11–12)

---

### Week 11 — Launch Countdown

**Theme:** Everything is done. This week is preparation, rehearsal, and anxiety management. You don't build new features this week — you get ready to ship the ones you already built.

#### Product
- Final walkthrough of every screen with fresh eyes (or have someone who hasn't seen it do it)
- Verify all onboarding copy is correct and natural
- Set up in-app "What's New" notification for first-time users: `sendWelcomeNotification()` — fires 4 hours after signup with "5 spots near you to check out"
- Write your founder post for launch day: personal, specific, why you built this, not a marketing announcement

#### Backend
- Production environment fully configured (all `.env` variables set in production):
  - Supabase production DB: confirm connection pooler working
  - Upstash Redis: production instance configured
  - R2: production bucket with correct CORS policy
  - Clerk: production instance (not dev)
  - All worker queues running and health-checked
- Load test production: 200 concurrent users, feed endpoint P95 < 500ms
- Set up monitoring alerts (free tier options):
  - Sentry: alert on > 5 errors/hour
  - Upstash: alert on Redis memory > 80%
  - Supabase: alert on DB connections > 80% of limit
  - Railway/Render/Fly.io: alert on API container restart

#### Mobile
- Final production build submitted: iOS `1.0.0 (1)`, Android version code `1`
- Verify deep links work in production build: `muzgram://listing/[id]`, `muzgram://event/[id]`
- Verify push notifications work in production (different certificates than dev)
- App Store page live (even if not yet publicly searchable — set release to "Manually release")

#### Admin Dashboard
- Create admin accounts for any trusted moderators (even if just yourself for now)
- Bookmark the moderation queue — you'll check it 3x/day on launch week
- Test the "feature listing" flow: set `isFeatured = true` on a business → verify it appears in top 2 feed positions within 60s (cache TTL)

#### QA
- Launch simulation: factory reset a test device, install the production app (not TestFlight), complete full onboarding, see real feed data
- Verify App Store screenshots match actual current app
- Smoke test all paid flows: "Feature my listing" → manual process → appears featured. "Boost event" → manual → appears boosted. Confirm you can execute these manually in < 5 minutes.

#### Launch Prep
- **Coordinate mosque announcements** for launch day:
  - Provide each mosque contact with the exact WhatsApp message to send (pre-written, they just forward)
  - Schedule for launch morning
- **Coordinate founding member emails:** all 20 founding members receive a personal "You're in!" email the night before launch
- **Prepare DevAway/DND plan:** on launch day, you'll be monitoring. Block your calendar, don't schedule meetings.
- Set up a simple "launch day dashboard" bookmark: Supabase table viewer (user count), Sentry (errors), admin dashboard (content)

#### Monetization
- Founding members: all 20 confirmed, payments received, their listings set to `isFeatured = true` with `featuredUntil` = 6 months from launch
- Prepare "Event Boost" invoice template: $25, 7-day boost, manually set in admin
- Prepare "Weekly Featured" invoice template: $75/week, top feed placement, manually set in admin

**Weekly Milestone:** Production environment passes load test. App approved and manually held for launch day release. Mosque announcements scheduled. Founding member emails drafted.

**Biggest Risk:** Production differs from staging in a way you haven't tested (different Clerk instance, different R2 bucket, different Redis). Fix: run the "launch simulation" (factory reset + production app install) as the official acceptance test. If this passes, you're launch-ready.

**Gate before Week 12:** Production load test passed ✓. App approved and manually held ✓. All founding member payments received ✓. Mosque announcements scheduled ✓.

---

### Week 12 — Launch Week

**Theme:** Ship it. Watch it. Fix fast. Celebrate.

#### Day-by-Day Launch Week Schedule

**Monday — Soft launch (founding members only)**
- Release app on App Store and Google Play
- Email all 20 founding members: "You're the first. The app is live."
- Personal WhatsApp message to each — include direct App Store link
- Monitor Sentry for the first 2 hours: any crashes → hotfix immediately
- Expected: 50–80 downloads, mostly founding members and their staff

**Tuesday — Beta user announcement**
- Message all 100 beta users: "It's live. Thank you for helping build this."
- Ask for 5-star reviews directly (you can ask, not incentivize): "If you love it, a review means the world."
- Monitor: feed functioning, push notifications delivering, no 500 errors
- Expected: 150–200 total downloads

**Wednesday — Mosque announcements go out**
- 3 mosque WhatsApp groups (combined reach: 3,000–8,000 members) receive announcement
- Your founder post goes live on Instagram/TikTok/LinkedIn
- Coordinate timing: all announcements within the same 2-hour window
- Expected: 400–600 downloads by end of day

**Thursday — Organic growth day**
- WhatsApp viral engine: founding members share with their customers (pre-written message)
- Monitor: if any neighborhood has no content, seed 2–3 more listings for it immediately
- Check for the first organic reviews on App Store / Google Play
- Expected: 600–900 total downloads

**Friday — Jummah day (highest-impact day of the week)**
- Mosque announcements may get repeated in Friday khutbah announcements or bulletin boards
- Post the Jummah-themed social content: "Find your nearest Jummah + halal lunch spot"
- First week-one Jummah reminder push notification sent to opted-in users (if any)
- Expected: 900–1,400 total downloads by end of day

**Weekend — Consolidate and assess**
- Check D7 retention proxy: of users who downloaded Monday, how many opened the app again?
- Check content quality: any low-quality posts to moderate?
- Thank 3 businesses personally who drove the most referrals
- Write a brief internal retrospective: what surprised you, what worked, what to fix Week 1 post-launch

#### Backend — Launch Week
- Monitor queue depths: if `notifications` queue backs up, scale worker replicas
- Monitor Supabase connection count: if approaching limit (20 on free plan), upgrade to pro ($25/mo) immediately
- Daily backup verification: confirm Supabase automated backups ran
- API error rate: target < 0.1% 5xx responses

#### Mobile — Post-Launch Patch
- Have a hotfix build ready but not submitted: only submit if P0 crash hits > 1% of sessions
- App Store reviews: respond to every review in the first week personally

#### Admin Dashboard — Launch Week
- Check moderation queue 3x/day: morning, afternoon, evening
- Approve any new business listing submissions within 24 hours
- Process any event boost or featured listing requests same-day

#### QA — Launch Week
- Monitor Sentry daily: triage every new issue
- Check feed quality: are the right listings appearing in each neighborhood?
- Verify push notifications are delivering (check Expo notification receipts)

#### Launch Prep (this week IS launch prep)
- Week 12 is the launch. There is no "next week" to prepare for — execute.

#### Monetization — Launch Week
- Soft-pitch the 5 most engaged non-founding-member businesses: "Would you like to be featured next month? $75/week."
- Target: 2–3 new business revenue conversations started
- Track founding member satisfaction: are their listings visible? Correct info? Photos loading?
- MRR at end of Week 12 target: $1,500+ (founding members + first ad-hoc boosts)

**Weekly Milestone:** 500+ app downloads by end of launch week. Feed functioning correctly across all 8 Chicago cluster areas. Zero P0 crashes. First paying non-founding-member business secured.

**Biggest Risk:** Content sparsity in secondary clusters (Schaumburg, Skokie, Bolingbrook) — user opens app, sees 2 listings, closes it forever. Fix: before Wednesday's mosque announcement, verify that every cluster has at least 10 listings in the feed. If any cluster is sparse, personally call 3 businesses in that area and offer free featured placement for 30 days in exchange for claiming their listing.

---

## Post-Launch: Week 13+ (MMP Gate)

The MVP is live. Now you watch the numbers and wait for the gate to pass before starting MMP.

### Daily 8 Metrics Dashboard (check every morning)

| Metric | MVP Target | Action if Missing |
|--------|-----------|-------------------|
| New installs today | 20+ in first 30 days | Increase outreach, WhatsApp campaign |
| DAU / MAU ratio | > 35% | Check which screens users are dropping from |
| Feed opens per user | > 3/week | Feed quality issue — check content freshness |
| Save rate | > 15% of feed views | Cards not compelling enough — check photos |
| Post creation rate | > 2% of DAU | Post flow friction — check UX |
| Moderation queue | < 5 pending | Clear queue every morning |
| API error rate | < 0.1% | Check Sentry immediately if elevated |
| Founding member engagement | All 20 active | Personal check-in if any have gone quiet |

### MMP Gate Criteria (do not start MMP until all 3 pass)
- D7 retention ≥ 35%
- 500+ MAU
- 20+ paying businesses, $3K+ MRR

### What to Do If Engagement is Weak
1. **< 10 installs/day by end of Week 2 post-launch:** Your distribution channel assumptions were wrong. Go in-person to 5 mosques and demo the app after Jummah prayers. This is the highest-conversion channel.
2. **D7 retention < 20%:** Content freshness is the problem. Set up a WhatsApp group for the 20 founding members and push them to add daily specials every morning. Fresh content = daily return reason.
3. **Feed opens but no saves or posts:** Trust issue. Users don't trust the content is real. Fix: get 5 verified business owners to claim their listings publicly and update their own info. Authenticity signal.
4. **Strong iOS, weak Android:** Check Sentry for Android-specific crashes. Android device fragmentation causes issues that simulator testing misses.

---

## Summary Budget (12 Weeks)

| Item | Cost |
|------|------|
| Supabase Pro (if needed after 20 connections) | $25/mo × 3 = $75 |
| Railway/Render API hosting | $0–$20/mo × 3 = $60 |
| Upstash Redis | $0 (free tier sufficient for MVP) |
| Cloudflare R2 | $0 (free tier: 10GB) |
| Mapbox | $0 (50K map loads/mo free) |
| Clerk | $0 (10K MAU free) |
| Expo EAS Build | $0 (free tier: 25 builds/month) |
| Apple Developer Program | $99/yr |
| Google Play Developer | $25 one-time |
| Sentry | $0 (free tier) |
| Vercel (admin dashboard) | $0 (free tier) |
| Domain + SSL | $15/yr |
| **Total infrastructure cost** | **~$330** |
| **Founding member revenue** | **+$2,980** |
| **Net cost of launch** | **-$2,650 (you're cash positive)** |

---

## Risk Register

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| App Store rejection | Medium | High | Submit early (Week 8), have appeal ready, TestFlight fallback |
| PostGIS query performance | Low | High | EXPLAIN ANALYZE in Week 3, add indexes before launch |
| Supabase pooler incompatibility with TypeORM | Medium | High | Set `prepareThreshold: 0` in TypeORM config, test Week 1 |
| Content sparsity at launch | High | Critical | 150+ listings seeded before Week 10 beta |
| Expo push notifications not working in production | Medium | High | Test with EAS production build in Week 6, not Week 11 |
| Founding members not engaging post-launch | Low | Medium | Personal weekly check-in for first 30 days |
| Mosque partnerships fall through | Medium | Medium | Have 2 backups per mosque, personal relationships matter most |
| Solo burnout in Weeks 7–9 | Medium | High | Scope is fixed — resist scope creep, ship what's specced |

---

*Last updated: April 2026. Next review: at MMP gate.*
