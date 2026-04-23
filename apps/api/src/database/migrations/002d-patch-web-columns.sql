-- =============================================================================
-- Migration 002d: Safe patch — add/rename columns needed by web app
-- Run in Supabase SQL Editor. Uses IF NOT EXISTS and exception blocks.
-- Safe to re-run multiple times.
-- =============================================================================

-- ─── CITIES: rename camelCase → snake_case ───────────────────────────────────

DO $$ BEGIN
  ALTER TABLE cities RENAME COLUMN "centerLat" TO center_lat;
EXCEPTION WHEN undefined_column OR duplicate_column THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE cities RENAME COLUMN "centerLng" TO center_lng;
EXCEPTION WHEN undefined_column OR duplicate_column THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE cities RENAME COLUMN "isActive" TO is_active;
EXCEPTION WHEN undefined_column OR duplicate_column THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE cities RENAME COLUMN "listingsCount" TO listing_count;
EXCEPTION WHEN undefined_column OR duplicate_column THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE cities RENAME COLUMN "createdAt" TO created_at;
EXCEPTION WHEN undefined_column OR duplicate_column THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE cities RENAME COLUMN "updatedAt" TO updated_at;
EXCEPTION WHEN undefined_column OR duplicate_column THEN NULL; END $$;

-- ─── CITIES: add missing columns ─────────────────────────────────────────────

ALTER TABLE cities
  ADD COLUMN IF NOT EXISTS launch_status    VARCHAR(20)  NOT NULL DEFAULT 'inactive',
  ADD COLUMN IF NOT EXISTS event_count      INTEGER      NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS meta_title       TEXT,
  ADD COLUMN IF NOT EXISTS meta_description TEXT,
  ADD COLUMN IF NOT EXISTS seo_description  TEXT;

-- Set launch_status from is_active
UPDATE cities SET launch_status = 'active' WHERE is_active = true;

-- ─── LISTINGS: rename camelCase → snake_case ─────────────────────────────────

DO $$ BEGIN ALTER TABLE listings RENAME COLUMN "mainCategory"       TO main_category;       EXCEPTION WHEN undefined_column OR duplicate_column THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE listings RENAME COLUMN "categoryId"         TO category_id;         EXCEPTION WHEN undefined_column OR duplicate_column THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE listings RENAME COLUMN "cityId"             TO city_id;             EXCEPTION WHEN undefined_column OR duplicate_column THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE listings RENAME COLUMN "instagramHandle"    TO instagram_handle;    EXCEPTION WHEN undefined_column OR duplicate_column THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE listings RENAME COLUMN "halalCertification" TO halal_certification; EXCEPTION WHEN undefined_column OR duplicate_column THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE listings RENAME COLUMN "certificationBody"  TO certification_body;  EXCEPTION WHEN undefined_column OR duplicate_column THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE listings RENAME COLUMN "isHalalVerified"    TO is_halal_verified;   EXCEPTION WHEN undefined_column OR duplicate_column THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE listings RENAME COLUMN "isClaimed"          TO is_claimed;          EXCEPTION WHEN undefined_column OR duplicate_column THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE listings RENAME COLUMN "claimedByUserId"    TO claimed_by_user_id;  EXCEPTION WHEN undefined_column OR duplicate_column THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE listings RENAME COLUMN "claimedAt"          TO claimed_at;          EXCEPTION WHEN undefined_column OR duplicate_column THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE listings RENAME COLUMN "isFeatured"         TO is_featured;         EXCEPTION WHEN undefined_column OR duplicate_column THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE listings RENAME COLUMN "featuredUntil"      TO featured_until;      EXCEPTION WHEN undefined_column OR duplicate_column THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE listings RENAME COLUMN "isFoundingMember"   TO is_founding_member;  EXCEPTION WHEN undefined_column OR duplicate_column THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE listings RENAME COLUMN "trustScore"         TO trust_score;         EXCEPTION WHEN undefined_column OR duplicate_column THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE listings RENAME COLUMN "mediaUrls"          TO media_urls;          EXCEPTION WHEN undefined_column OR duplicate_column THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE listings RENAME COLUMN "thumbnailUrl"       TO primary_photo_url;   EXCEPTION WHEN undefined_column OR duplicate_column THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE listings RENAME COLUMN "savesCount"         TO save_count;          EXCEPTION WHEN undefined_column OR duplicate_column THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE listings RENAME COLUMN "viewsCount"         TO view_count;          EXCEPTION WHEN undefined_column OR duplicate_column THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE listings RENAME COLUMN "sharesCount"        TO share_count;         EXCEPTION WHEN undefined_column OR duplicate_column THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE listings RENAME COLUMN "importedFrom"       TO imported_from;       EXCEPTION WHEN undefined_column OR duplicate_column THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE listings RENAME COLUMN "createdAt"          TO created_at;          EXCEPTION WHEN undefined_column OR duplicate_column THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE listings RENAME COLUMN "updatedAt"          TO updated_at;          EXCEPTION WHEN undefined_column OR duplicate_column THEN NULL; END $$;

ALTER TABLE listings
  ADD COLUMN IF NOT EXISTS is_active      BOOLEAN     NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS price_range    VARCHAR(10),
  ADD COLUMN IF NOT EXISTS hours_json     JSONB,
  ADD COLUMN IF NOT EXISTS latitude       DECIMAL(10,7),
  ADD COLUMN IF NOT EXISTS longitude      DECIMAL(10,7),
  ADD COLUMN IF NOT EXISTS subcategory_id UUID;

-- ─── EVENTS: rename camelCase → snake_case ───────────────────────────────────

DO $$ BEGIN ALTER TABLE events RENAME COLUMN "categoryId"     TO category_id;     EXCEPTION WHEN undefined_column OR duplicate_column THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE events RENAME COLUMN "organizerId"    TO organizer_id;    EXCEPTION WHEN undefined_column OR duplicate_column THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE events RENAME COLUMN "listingId"      TO listing_id;      EXCEPTION WHEN undefined_column OR duplicate_column THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE events RENAME COLUMN "cityId"         TO city_id;         EXCEPTION WHEN undefined_column OR duplicate_column THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE events RENAME COLUMN "startAt"        TO start_time;      EXCEPTION WHEN undefined_column OR duplicate_column THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE events RENAME COLUMN "endAt"          TO end_time;        EXCEPTION WHEN undefined_column OR duplicate_column THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE events RENAME COLUMN "isRecurring"    TO is_recurring;    EXCEPTION WHEN undefined_column OR duplicate_column THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE events RENAME COLUMN "recurrenceRule" TO recurrence_rule; EXCEPTION WHEN undefined_column OR duplicate_column THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE events RENAME COLUMN "isOnline"       TO is_online;       EXCEPTION WHEN undefined_column OR duplicate_column THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE events RENAME COLUMN "onlineUrl"      TO online_url;      EXCEPTION WHEN undefined_column OR duplicate_column THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE events RENAME COLUMN "isFree"         TO is_free;         EXCEPTION WHEN undefined_column OR duplicate_column THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE events RENAME COLUMN "ticketUrl"      TO ticket_url;      EXCEPTION WHEN undefined_column OR duplicate_column THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE events RENAME COLUMN "isFeatured"     TO is_featured;     EXCEPTION WHEN undefined_column OR duplicate_column THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE events RENAME COLUMN "featuredUntil"  TO featured_until;  EXCEPTION WHEN undefined_column OR duplicate_column THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE events RENAME COLUMN "mediaUrls"      TO media_urls;      EXCEPTION WHEN undefined_column OR duplicate_column THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE events RENAME COLUMN "thumbnailUrl"   TO cover_image_url; EXCEPTION WHEN undefined_column OR duplicate_column THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE events RENAME COLUMN "savesCount"     TO save_count;      EXCEPTION WHEN undefined_column OR duplicate_column THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE events RENAME COLUMN "sharesCount"    TO share_count;     EXCEPTION WHEN undefined_column OR duplicate_column THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE events RENAME COLUMN "createdAt"      TO created_at;      EXCEPTION WHEN undefined_column OR duplicate_column THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE events RENAME COLUMN "updatedAt"      TO updated_at;      EXCEPTION WHEN undefined_column OR duplicate_column THEN NULL; END $$;

ALTER TABLE events
  ADD COLUMN IF NOT EXISTS is_active      BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS price_cents    INTEGER,
  ADD COLUMN IF NOT EXISTS organizer_name VARCHAR(200),
  ADD COLUMN IF NOT EXISTS venue_name     VARCHAR(200),
  ADD COLUMN IF NOT EXISTS address        TEXT;

-- ─── USERS: rename camelCase → snake_case ────────────────────────────────────

DO $$ BEGIN ALTER TABLE users RENAME COLUMN "clerkUserId"            TO clerk_user_id;            EXCEPTION WHEN undefined_column OR duplicate_column THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE users RENAME COLUMN "displayName"            TO display_name;             EXCEPTION WHEN undefined_column OR duplicate_column THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE users RENAME COLUMN "avatarUrl"              TO avatar_url;               EXCEPTION WHEN undefined_column OR duplicate_column THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE users RENAME COLUMN "trustTier"              TO trust_tier;               EXCEPTION WHEN undefined_column OR duplicate_column THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE users RENAME COLUMN "citySlug"               TO city_slug;                EXCEPTION WHEN undefined_column OR duplicate_column THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE users RENAME COLUMN "lastKnownLat"           TO last_known_lat;           EXCEPTION WHEN undefined_column OR duplicate_column THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE users RENAME COLUMN "lastKnownLng"           TO last_known_lng;           EXCEPTION WHEN undefined_column OR duplicate_column THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE users RENAME COLUMN "lastKnownAt"            TO last_known_at;            EXCEPTION WHEN undefined_column OR duplicate_column THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE users RENAME COLUMN "expoPushToken"          TO expo_push_token;          EXCEPTION WHEN undefined_column OR duplicate_column THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE users RENAME COLUMN "notificationPrefs"      TO notification_prefs;       EXCEPTION WHEN undefined_column OR duplicate_column THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE users RENAME COLUMN "isActive"               TO is_active;                EXCEPTION WHEN undefined_column OR duplicate_column THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE users RENAME COLUMN "notificationsSentToday" TO notifications_sent_today; EXCEPTION WHEN undefined_column OR duplicate_column THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE users RENAME COLUMN "notificationsResetAt"   TO notifications_reset_at;   EXCEPTION WHEN undefined_column OR duplicate_column THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE users RENAME COLUMN "reportsSubmittedCount"  TO reports_submitted_count;  EXCEPTION WHEN undefined_column OR duplicate_column THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE users RENAME COLUMN "reportsReceivedCount"   TO reports_received_count;   EXCEPTION WHEN undefined_column OR duplicate_column THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE users RENAME COLUMN "createdAt"              TO created_at;               EXCEPTION WHEN undefined_column OR duplicate_column THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE users RENAME COLUMN "updatedAt"              TO updated_at;               EXCEPTION WHEN undefined_column OR duplicate_column THEN NULL; END $$;

-- ─── LISTING_SUBCATEGORIES (new table) ───────────────────────────────────────

CREATE TABLE IF NOT EXISTS listing_subcategories (
  id            UUID         DEFAULT uuid_generate_v4() PRIMARY KEY,
  name          VARCHAR(100) NOT NULL,
  main_category VARCHAR(50)  NOT NULL,
  slug          VARCHAR(100) NOT NULL UNIQUE,
  sort_order    INTEGER      NOT NULL DEFAULT 0,
  created_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- ─── INSERT Chicago city row (skip if already exists) ────────────────────────

INSERT INTO cities (slug, name, state, country, is_active, launch_status, center_lat, center_lng)
VALUES ('chicago', 'Chicago', 'IL', 'US', true, 'active', 41.8781, -87.6298)
ON CONFLICT (slug) DO UPDATE SET is_active = true, launch_status = 'active';
