# Muzgram — PostgreSQL Database Schema

> Last updated: 2026-04-21
> PostgreSQL 15+ | PostGIS | pg_trgm | uuid-ossp
> 44 tables total across 17 groups

---

## ERD Overview

```
GEOGRAPHIC HIERARCHY
  countries → cities → neighborhoods → locations (reusable geo point)

USERS
  users → user_profiles (1:1)
        → push_tokens (1:many)
        → user_sessions (1:many)

CONTENT (all content ties to city + neighborhood + location + PostGIS point)
  businesses
    → restaurant_details (1:1, food only)
    → service_provider_details (1:1, service only)
    → business_hours (1:many, per-day)
    → business_claims (1:many)
    → business_verifications (1:many)
    → daily_specials (1:many)
  venues (reusable event spaces — mosques, halls, parks)
  events
    → event_attendees (many:many with users)
  community_posts
  notice_board_posts

ENGAGEMENT (polymorphic on target_type + target_id)
  saves     → (user, save_target_type, target_id)
  likes     → (user, like_target_type, target_id)
  comments  → (user, comment_target_type, target_id)
  reports   → (user, report_target_type, target_id)

MEDIA
  media_assets → (owner_type, owner_id) — polymorphic

LEADS
  leads → businesses (service type) → users (sender)

MONETIZATION
  promotion_plans → promoted_listings
  subscriptions → invoices → payments

NOTIFICATIONS
  notifications → users
  notification_preferences → users (1:1)

BONUS MODULES
  mosques → jummah_times
  ramadan_seasons → ramadan_specials → businesses
  ramadan_seasons → iftar_events → events
  prayer_time_cache (city + date cache)
  campaigns → campaign_participants
  notice_board_posts
  halal_radar_sessions (analytics)

ADMIN
  moderation_actions (append-only)
  admin_notes
  activity_logs (partitioned by month)
  search_logs
```

---

## Key Design Decisions

| Decision | Choice | Why |
|---|---|---|
| Geo columns | `GEOGRAPHY(POINT, 4326)` + denormalized lat/lng | PostGIS for spatial queries; lat/lng for fast reads |
| Primary keys | `UUID DEFAULT gen_random_uuid()` | No sequential ID leakage, distributed-safe |
| Soft delete | `deleted_at TIMESTAMPTZ` | All queries filter `WHERE deleted_at IS NULL` |
| Money | `INTEGER` cents | Never FLOAT for money |
| Flexible fields | `JSONB` for hours, metadata, settings | Absorbs future fields without migrations |
| Text search | `GENERATED ALWAYS AS tsvector STORED` + GIN index | Zero-config FTS, no Elasticsearch in MVP |
| Audit trail | `activity_logs` partitioned by month | No painful repartitioning later |
| Polymorphic | `target_type + target_id` on saves/likes/comments/reports | FK integrity at app layer |
| Auto-timestamps | Shared `trigger_set_updated_at()` trigger | Consistent, never forgotten |

---

## Table Inventory

| Group | Tables |
|---|---|
| Geographic | countries, cities, neighborhoods, locations |
| Users | users, user_profiles, user_sessions, push_tokens |
| Media | media_assets |
| Venues | venues |
| Businesses | businesses, restaurant_details, service_provider_details, business_hours, business_claims, business_verifications, daily_specials |
| Events | events, event_attendees |
| Posts | community_posts |
| Engagement | saves, likes, comments, reports |
| Leads | leads |
| Monetization | promotion_plans, promoted_listings, subscriptions, invoices, payments |
| Notifications | notifications, notification_preferences |
| Notice Board | notice_board_posts |
| Friday Finder | mosques, jummah_times |
| Ramadan | ramadan_seasons, ramadan_specials, iftar_events, prayer_time_cache |
| Campaigns | campaigns, campaign_participants |
| Analytics | halal_radar_sessions, search_logs |
| Admin | moderation_actions, admin_notes, activity_logs |
| **Total** | **44 tables** |

---

## Core Enums

```sql
user_role:           user | business_owner | moderator | admin | super_admin
user_status:         active | suspended | banned | pending_verification | deleted
business_type:       restaurant | cafe | bakery | grocery | butcher | catering |
                     food_truck | dessert | service_provider | retail | mosque | school | other
halal_status:        ifanca_certified | isna_certified | zabiha_certified |
                     self_declared | muslim_owned | unknown | not_halal
content_status:      draft | pending | approved | rejected | suspended | expired | deleted
event_category:      community | religious | educational | fundraiser | family |
                     youth | women | sports | cultural | business_networking |
                     ramadan | eid | other
service_category:    real_estate | mortgage | financial_planning | tax_prep | insurance |
                     immigration_law | family_law | estate_planning | business_law |
                     healthcare | dental | mental_health | nutrition |
                     quran_tutoring | academic_tutoring | islamic_school | daycare |
                     catering | photography | videography | event_planning |
                     wedding_planning | halal_catering |
                     construction | cleaning | handyman | landscaping | auto |
                     web_design | app_development | it_support |
                     driving_school | transportation | other
promotion_placement: feed_featured | explore_featured | map_featured_pin |
                     category_banner | search_top | campaign_spotlight
```

---

## Critical Query Patterns & Their Indexes

### Now Feed Query
```sql
-- All live content near user, scored by recency + proximity
SELECT b.*, ST_Distance(l.geo, ST_MakePoint($lng, $lat)::geography) AS dist
FROM businesses b
JOIN locations l ON l.id = b.location_id
WHERE b.city_id = $city_id
  AND b.status = 'approved'
  AND b.deleted_at IS NULL
  AND b.is_temporarily_closed = FALSE
  AND ST_DWithin(l.geo, ST_MakePoint($lng, $lat)::geography, $radius_meters)
ORDER BY dist ASC, b.updated_at DESC
LIMIT 20;
-- Uses: idx_businesses_city_status + idx_locations_geo (GIST)
```

### Upcoming Events Near Me
```sql
SELECT e.*, ST_Distance(l.geo, ST_MakePoint($lng, $lat)::geography) AS dist
FROM events e
JOIN locations l ON l.id = e.location_id
WHERE e.city_id = $city_id
  AND e.status = 'approved'
  AND e.starts_at BETWEEN NOW() AND NOW() + INTERVAL '7 days'
  AND e.is_cancelled = FALSE
  AND e.deleted_at IS NULL
  AND ST_DWithin(l.geo, ST_MakePoint($lng, $lat)::geography, $radius_meters)
ORDER BY e.starts_at ASC, dist ASC
LIMIT 20;
-- Uses: idx_events_upcoming + idx_locations_geo
```

### Map Bounding Box Query
```sql
-- All pins within map viewport
SELECT b.id, b.name, b.business_type, l.lat, l.lng,
       b.is_featured, b.halal_status
FROM businesses b
JOIN locations l ON l.id = b.location_id
WHERE b.city_id = $city_id
  AND b.status = 'approved'
  AND b.deleted_at IS NULL
  AND l.geo && ST_MakeEnvelope($west, $south, $east, $north, 4326)::geography
LIMIT 200;
-- Uses: idx_locations_geo (GIST &&-operator fast path)
```

### Full-Text Business Search
```sql
SELECT *, ts_rank(search_vector, query) AS rank
FROM businesses,
     plainto_tsquery('english', $search_term) query
WHERE search_vector @@ query
  AND city_id = $city_id
  AND status = 'approved'
  AND deleted_at IS NULL
ORDER BY rank DESC
LIMIT 20;
-- Uses: idx_businesses_fts (GIN)
```

### Open Now Filter
```sql
-- Filter to currently open businesses (app-side calculation preferred for MVP)
-- Server-side for search/filter:
SELECT b.*
FROM businesses b
JOIN restaurant_details rd ON rd.business_id = b.id
WHERE b.city_id = $city_id
  AND b.status = 'approved'
  AND b.is_temporarily_closed = FALSE
  AND b.deleted_at IS NULL
  -- JSON hours check (simplified — full logic in app layer)
  AND (b.operating_hours->>'always_open')::boolean = true
     OR (
       (b.operating_hours -> to_char(NOW() AT TIME ZONE b.timezone, 'Day') ->> 'open') IS NOT NULL
       AND NOT (b.operating_hours -> to_char(NOW() AT TIME ZONE b.timezone, 'Day') ->> 'closed')::boolean
     );
```

---

## Indexing Strategy Summary

### Geospatial (GIST)
- `locations.geo` — core of all nearby queries
- `users.home_geo` — user location
- `halal_radar_sessions.search_geo` — radar analytics

### Feed performance (partial indexes — WHERE clause reduces index size)
- `businesses(city_id, status) WHERE deleted_at IS NULL` — Now feed
- `events(city_id, starts_at) WHERE starts_at > NOW() AND status = 'approved'` — upcoming events
- `community_posts(city_id, expires_at) WHERE status = 'approved' AND expires_at > NOW()` — live posts

### Featured slots (hit on every feed render)
- `promoted_listings(city_id, placement, status, ends_at) WHERE status = 'active'`
- `businesses(city_id, is_featured, featured_until) WHERE is_featured = TRUE`

### Full-text search (GIN)
- `businesses.search_vector`
- `events.search_vector`
- `community_posts.search_vector`

### Admin queue (partial — only pending)
- `businesses(status, created_at) WHERE status = 'pending'`
- `events(status, created_at) WHERE status = 'pending'`
- `reports(status, created_at) WHERE status = 'pending'`

### Notification delivery
- `notifications(recipient_id, is_read, created_at DESC)`
- `notifications(recipient_id) WHERE is_read = FALSE` — unread count badge
- `notifications(idempotency_key)` — prevent duplicates

---

## Soft Delete Pattern

```sql
-- Every query on user-generated content includes:
WHERE deleted_at IS NULL

-- Deletion:
UPDATE businesses SET deleted_at = NOW() WHERE id = $id;

-- Recovery window (admin can restore within 24h):
UPDATE businesses SET deleted_at = NULL WHERE id = $id AND deleted_at > NOW() - INTERVAL '24 hours';

-- Hard delete (after 30 days, run via cron):
DELETE FROM businesses WHERE deleted_at < NOW() - INTERVAL '30 days';
```

---

## Activity Log Partitioning

```sql
-- activity_logs is PARTITION BY RANGE (created_at)
-- Add new partition quarterly via cron or pg_partman:

CREATE TABLE activity_logs_2026_q3
  PARTITION OF activity_logs
  FOR VALUES FROM ('2026-07-01') TO ('2026-10-01');

-- Detach old partitions for cold storage after 90 days:
ALTER TABLE activity_logs DETACH PARTITION activity_logs_2025_q2;
-- Then pg_dump the detached table to S3
```

---

## Promotion Plans (Seeded Data)

| Plan Name | Placement | Price | Duration |
|---|---|---|---|
| Feed Featured — Weekly | feed_featured | $75 | 7 days |
| Feed Featured — Monthly | feed_featured | $250 | 30 days |
| Explore Featured — Weekly | explore_featured | $50 | 7 days |
| Map Gold Pin — Weekly | map_featured_pin | $50 | 7 days |
| Boosted Event | feed_featured | $25 | 7 days |
| Category Banner — Weekly | category_banner | $100 | 7 days |
| Campaign Spotlight | campaign_spotlight | $150 | 7 days |

---

## Future-Proofing Rules

1. **New city = one INSERT.** Zero schema changes. All content tables have `city_id`.
2. **New content type = new table** with same base columns (city_id, neighborhood_id, location_id, status, timestamps). Add to enum types.
3. **JSONB → real column** when a field gets queried enough: `ALTER TABLE businesses ADD COLUMN X BOOLEAN GENERATED ALWAYS AS ((meta->>'x')::boolean) STORED;`
4. **Stripe columns are nullable** — present in schema, populated when Stripe is integrated in MMP.
5. **Search stays in Postgres** until >500K rows per content type, then sync to Typesense/Meilisearch with zero schema changes.
6. **Activity logs partition quarterly** via pg_partman — no painful repartitioning later.
7. **Polymorphic saves/likes/comments** — convert to typed tables in MMP with dual-write migration (no downtime).

---

## Tables to Separate at Scale

| Table | Separate When | Move To |
|---|---|---|
| activity_logs | >5M rows (~6 months) | TimescaleDB or Redshift |
| notifications | >1M rows | Dedicated notification service DB |
| search_logs | Analytics dashboard needed | ClickHouse or BigQuery |
| halal_radar_sessions | Analytics team needs it | BigQuery / Redshift |
| push_tokens | Dedicated notification service | Notification service DB |
| media_assets | Media pipeline gets complex | Separate media service |
| prayer_time_cache | Multi-country expansion | Shared microservice |
