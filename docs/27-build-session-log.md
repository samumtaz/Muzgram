# Build Session Log

Running log of what was built, fixed, and decided across all Claude Code sessions. Most recent first.

---

## Session 3 — April 23, 2026

### Android Emulator Setup
- Installed Android Studio on Windows 11
- Created Pixel 9 virtual device (API 36.1)
- Set `ANDROID_HOME` and PATH env vars for `platform-tools`, `emulator`, `tools`
- Goal: preview the app while waiting for Apple Developer account approval

### Events Cron Job — Auto-Archive
- Installed `@nestjs/schedule`
- Created `apps/api/src/modules/events/events.cron.ts`
  - Runs daily at 2am
  - Finds `active` events where `end_at < NOW() - 30 days`
  - Sets `status = 'completed'` (keeps them in DB for history, removes from active feed)
- Registered `EventsCronService` in `EventsModule`
- Registered `ScheduleModule.forRoot()` in `AppModule`

### Chicago Seed — Real Events Added
- Replaced all relative `d(days)` event dates with absolute dates anchored to Islamic calendar:
  - Eid al-Fitr 1447: ~March 30, 2026
  - Eid al-Adha 1447: ~June 6, 2026
- Total: **27 events** seeded across all city clusters
- Event categories:
  - Past (history): CIOGC Ramadan Iftar, Eid al-Fitr prayer, Desi Night Out
  - Mosque/community: open houses, bazaars, lectures, cookouts, basketball tournaments
  - Eid events: prayer + community feast at multiple mosques
  - Desi/cultural: Bhangra nights, Arabic live music, Devon Ave Mela
  - Real confirmed events from Eventbrite/Sulekha:
    - Mumbai to Chicago: Bollywood Party (Fame Nightclub, Apr 25)
    - DJ Chetas Live (TAO Chicago, Apr 30)
    - Anuv Jain: Dastakhat US Tour (Park West, May 1)
    - Imam Siraj Wahhaj: Khutbah & Family Night (May 1, free)
    - Open Mosque Day — Downtown Islamic Center (May 3, free)
    - Indo-House: Spring Social 2.0 (Azul, May 16)
    - Haricharan Live Concert (Alhambra Palace, May 24)
    - Chicago's Ultimate Bollywood Boat Party (May 30)
- Key decision: **party events are address-based, no listingSlug** — venues rotate for desi parties
- Consistent venue listings added: Alhambra Palace, Downtown Islamic Center

### Chicago Seed — New Suburbs
- 10 new inactive cities added:
  - Elgin, Hanover Park, Glendale Heights, Addison, Des Plaines
  - Downers Grove, Arlington Heights, Palatine, Waukegan, Joliet/Plainfield
- Confirmed businesses seeded per suburb:
  - **Schaumburg**: Masjid Al Huda
  - **Elgin**: ICC Elgin (mosque)
  - **Hanover Park**: Islamic Center of Hanover Park
  - **Glendale Heights**: Fahrenheit Halal
  - **Addison**: Masjid Al Jameel
  - **Des Plaines**: Aladdin Kitchen and Market
  - **Downers Grove**: Anjir Uzbek Halal Cuisine
  - **Arlington Heights**: Uyghur Lagman House
  - **Palatine**: Makki Grill
  - **Waukegan**: Shalimar Grocery
  - **Joliet/Plainfield**: Islamic Center of Romeoville
- Total seed: **29 cities**, **~65 businesses**, **27 events**

### Migration 013
- Added `saves_count` and `shares_count` columns to `events` table
- File: `apps/api/src/database/migrations/013-events-missing-columns.ts`

---

## Session 2 — April 2026

### Admin Dashboard
- Fixed admin API client — all calls now prepend `/v1` (fixes prefix mismatch across all 15 admin pages)
- Expanded admin controller with new endpoints:
  - Revenue analytics
  - City management
  - Business verifications
  - App settings
  - Notification log
  - Audit log
  - Support tickets

### Mobile — My Posts Screen
- Added `/my-posts/index` screen (profile tab links to it)
- Registered `my-posts/index` and `search/index` in the root Stack layout (`_layout.tsx`)

### Chicago Seed — Phase 1
- Initial seed script created: `apps/api/src/database/seeds/chicago-seed.ts`
- 4 active launch clusters:
  - `chicago-devon` — Devon Ave / Rogers Park (anchor cluster)
  - `chicago-bridgeview` — Bridgeview / SW Suburbs
  - `chicago-skokie` — Skokie / North Shore
  - `chicago-schaumburg` — Schaumburg / NW Suburbs
- 15 inactive cities added for future activation
- 16 listing categories seeded
- 40+ Devon Ave businesses seeded (restaurants, groceries, mosques, services)
- Bridgeview, Skokie, Schaumburg businesses seeded
- Yemeni coffee category added (`mainCategory: go_out`)
- Yemeni coffee spots: The Qahwa (Bridgeview), Qahwah House (Skokie + Lombard), Qamaria (Albany Park)
- Hookah/upscale: Samah Hookah Lounge (Devon), Masada (Logan Square/chicago-city), Fattoush (Worth)
- Added `chicago-city` catch-all for businesses not in a specific suburb cluster
- All INSERT statements use `ON CONFLICT (slug) DO UPDATE` — fully idempotent

### Key Technical Decisions
- DB columns are snake_case (TypeORM SnakeNamingStrategy) — seed uses raw SQL matching this
- `toHalalEnum()` maps: `'certified'→'ifanca'`, `'self_declared'→'self_certified'`, `'unknown'→'none'`
- Events INSERT excludes `saves_count`/`shares_count` until migration 013 runs
- `isActive: false` cities exist in DB but don't surface in app until manually activated

---

## Session 1 — Earlier April 2026

### Project Bootstrap
- Monorepo: `apps/api` (NestJS), `apps/mobile` (Expo React Native), `apps/web`, `apps/admin`
- Database: PostgreSQL + PostGIS on Supabase
- Auth: Clerk
- Mobile stack: Expo SDK 54, expo-router, NativeWind, TanStack Query, Zustand
- Packages: `@muzgram/types`, `@muzgram/constants`, `@muzgram/utils`

### Onboarding Flow
- Auth guard in `_layout.tsx` routes users through `/(onboarding)/welcome` on first sign-in
- `hasCompletedOnboarding` persisted via `useAuthStore` (Zustand + SecureStore)

---

## Pending / Next Up
- [ ] Finish Android emulator setup — run `pnpm --filter=@muzgram/mobile android`
- [ ] Apple Developer account approval (under review)
- [ ] Once approved: `eas build --profile development --platform ios`
- [ ] Run typecheck across all apps: `pnpm --filter=@muzgram/api typecheck` + mobile
- [ ] Activate Chicago launch clusters in admin dashboard
- [ ] MMP sprint 1: Stripe self-serve, business verification flow
