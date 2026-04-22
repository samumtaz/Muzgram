-- =============================================================================
-- Migration 002: Rename camelCase columns to snake_case + add missing columns
-- Run this ONCE in Supabase SQL Editor (Project > SQL Editor > New Query)
-- =============================================================================

-- ─── CITIES ──────────────────────────────────────────────────────────────────

ALTER TABLE cities RENAME COLUMN "centerLat"     TO center_lat;
ALTER TABLE cities RENAME COLUMN "centerLng"     TO center_lng;
ALTER TABLE cities RENAME COLUMN "isActive"      TO is_active;
ALTER TABLE cities RENAME COLUMN "listingsCount" TO listing_count;
ALTER TABLE cities RENAME COLUMN "createdAt"     TO created_at;
ALTER TABLE cities RENAME COLUMN "updatedAt"     TO updated_at;

ALTER TABLE cities
  ADD COLUMN IF NOT EXISTS launch_status    VARCHAR(20)  NOT NULL DEFAULT 'inactive',
  ADD COLUMN IF NOT EXISTS event_count      INTEGER      NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS meta_title       TEXT,
  ADD COLUMN IF NOT EXISTS meta_description TEXT,
  ADD COLUMN IF NOT EXISTS seo_description  TEXT,
  ADD COLUMN IF NOT EXISTS cluster_city_id  UUID REFERENCES cities(id);

UPDATE cities SET launch_status = CASE WHEN is_active THEN 'active' ELSE 'inactive' END;

-- ─── LISTING_CATEGORIES ───────────────────────────────────────────────────────

ALTER TABLE listing_categories RENAME COLUMN "mainCategory" TO main_category;
ALTER TABLE listing_categories RENAME COLUMN "parentId"     TO parent_id;
ALTER TABLE listing_categories RENAME COLUMN "iconName"     TO icon_name;
ALTER TABLE listing_categories RENAME COLUMN "sortOrder"    TO sort_order;
ALTER TABLE listing_categories RENAME COLUMN "createdAt"    TO created_at;
ALTER TABLE listing_categories RENAME COLUMN "updatedAt"    TO updated_at;

-- ─── LISTING_SUBCATEGORIES (new table for sub-categories) ────────────────────

CREATE TABLE IF NOT EXISTS listing_subcategories (
  id           UUID         DEFAULT uuid_generate_v4() PRIMARY KEY,
  name         VARCHAR(100) NOT NULL,
  main_category VARCHAR(50) NOT NULL,
  slug         VARCHAR(100) NOT NULL UNIQUE,
  sort_order   INTEGER      NOT NULL DEFAULT 0,
  created_at   TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- ─── LISTINGS ────────────────────────────────────────────────────────────────

ALTER TABLE listings RENAME COLUMN "mainCategory"       TO main_category;
ALTER TABLE listings RENAME COLUMN "categoryId"         TO category_id;
ALTER TABLE listings RENAME COLUMN "cityId"             TO city_id;
ALTER TABLE listings RENAME COLUMN "instagramHandle"    TO instagram_handle;
ALTER TABLE listings RENAME COLUMN "halalCertification" TO halal_certification;
ALTER TABLE listings RENAME COLUMN "certificationBody"  TO certification_body;
ALTER TABLE listings RENAME COLUMN "isHalalVerified"    TO is_halal_verified;
ALTER TABLE listings RENAME COLUMN "isClaimed"          TO is_claimed;
ALTER TABLE listings RENAME COLUMN "claimedByUserId"    TO claimed_by_user_id;
ALTER TABLE listings RENAME COLUMN "claimedAt"          TO claimed_at;
ALTER TABLE listings RENAME COLUMN "isFeatured"         TO is_featured;
ALTER TABLE listings RENAME COLUMN "featuredUntil"      TO featured_until;
ALTER TABLE listings RENAME COLUMN "isFoundingMember"   TO is_founding_member;
ALTER TABLE listings RENAME COLUMN "trustScore"         TO trust_score;
ALTER TABLE listings RENAME COLUMN "mediaUrls"          TO media_urls;
ALTER TABLE listings RENAME COLUMN "thumbnailUrl"       TO primary_photo_url;
ALTER TABLE listings RENAME COLUMN "savesCount"         TO save_count;
ALTER TABLE listings RENAME COLUMN "viewsCount"         TO view_count;
ALTER TABLE listings RENAME COLUMN "sharesCount"        TO share_count;
ALTER TABLE listings RENAME COLUMN "importedFrom"       TO imported_from;
ALTER TABLE listings RENAME COLUMN "createdAt"          TO created_at;
ALTER TABLE listings RENAME COLUMN "updatedAt"          TO updated_at;

ALTER TABLE listings
  ADD COLUMN IF NOT EXISTS is_active     BOOLEAN      NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS price_range   VARCHAR(10),
  ADD COLUMN IF NOT EXISTS hours_json    JSONB,
  ADD COLUMN IF NOT EXISTS latitude      DECIMAL(10, 7),
  ADD COLUMN IF NOT EXISTS longitude     DECIMAL(10, 7),
  ADD COLUMN IF NOT EXISTS subcategory_id UUID REFERENCES listing_subcategories(id);

UPDATE listings SET
  is_active  = (status = 'active'),
  hours_json = hours,
  latitude   = lat,
  longitude  = lng;

-- ─── DAILY_SPECIALS ──────────────────────────────────────────────────────────

ALTER TABLE daily_specials RENAME COLUMN "listingId" TO listing_id;
ALTER TABLE daily_specials RENAME COLUMN "expiresAt" TO expires_at;
ALTER TABLE daily_specials RENAME COLUMN "createdAt" TO created_at;

-- ─── EVENTS ──────────────────────────────────────────────────────────────────

ALTER TABLE events RENAME COLUMN "categoryId"     TO category_id;
ALTER TABLE events RENAME COLUMN "organizerId"    TO organizer_id;
ALTER TABLE events RENAME COLUMN "listingId"      TO listing_id;
ALTER TABLE events RENAME COLUMN "cityId"         TO city_id;
ALTER TABLE events RENAME COLUMN "startAt"        TO start_at;
ALTER TABLE events RENAME COLUMN "endAt"          TO end_at;
ALTER TABLE events RENAME COLUMN "isRecurring"    TO is_recurring;
ALTER TABLE events RENAME COLUMN "recurrenceRule" TO recurrence_rule;
ALTER TABLE events RENAME COLUMN "isOnline"       TO is_online;
ALTER TABLE events RENAME COLUMN "onlineUrl"      TO online_url;
ALTER TABLE events RENAME COLUMN "isFree"         TO is_free;
ALTER TABLE events RENAME COLUMN "ticketUrl"      TO ticket_url;
ALTER TABLE events RENAME COLUMN "isFeatured"     TO is_featured;
ALTER TABLE events RENAME COLUMN "featuredUntil"  TO featured_until;
ALTER TABLE events RENAME COLUMN "mediaUrls"      TO media_urls;
ALTER TABLE events RENAME COLUMN "thumbnailUrl"   TO cover_photo_url;
ALTER TABLE events RENAME COLUMN "savesCount"     TO save_count;
ALTER TABLE events RENAME COLUMN "sharesCount"    TO share_count;
ALTER TABLE events RENAME COLUMN "createdAt"      TO created_at;
ALTER TABLE events RENAME COLUMN "updatedAt"      TO updated_at;

ALTER TABLE events
  ADD COLUMN IF NOT EXISTS is_active   BOOLEAN  NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS price_cents INTEGER;

UPDATE events SET is_active = (status = 'active');

-- ─── USERS ───────────────────────────────────────────────────────────────────

ALTER TABLE users RENAME COLUMN "clerkUserId"            TO clerk_user_id;
ALTER TABLE users RENAME COLUMN "displayName"            TO display_name;
ALTER TABLE users RENAME COLUMN "avatarUrl"              TO avatar_url;
ALTER TABLE users RENAME COLUMN "trustTier"              TO trust_tier;
ALTER TABLE users RENAME COLUMN "citySlug"               TO city_slug;
ALTER TABLE users RENAME COLUMN "lastKnownLat"           TO last_known_lat;
ALTER TABLE users RENAME COLUMN "lastKnownLng"           TO last_known_lng;
ALTER TABLE users RENAME COLUMN "lastKnownAt"            TO last_known_at;
ALTER TABLE users RENAME COLUMN "expoPushToken"          TO expo_push_token;
ALTER TABLE users RENAME COLUMN "notificationPrefs"      TO notification_prefs;
ALTER TABLE users RENAME COLUMN "isActive"               TO is_active;
ALTER TABLE users RENAME COLUMN "notificationsSentToday" TO notifications_sent_today;
ALTER TABLE users RENAME COLUMN "notificationsResetAt"   TO notifications_reset_at;
ALTER TABLE users RENAME COLUMN "reportsSubmittedCount"  TO reports_submitted_count;
ALTER TABLE users RENAME COLUMN "reportsReceivedCount"   TO reports_received_count;
ALTER TABLE users RENAME COLUMN "createdAt"              TO created_at;
ALTER TABLE users RENAME COLUMN "updatedAt"              TO updated_at;

-- ─── OTHER TABLES ─────────────────────────────────────────────────────────────

-- saves
ALTER TABLE saves RENAME COLUMN "userId"    TO user_id;
ALTER TABLE saves RENAME COLUMN "listingId" TO listing_id;
ALTER TABLE saves RENAME COLUMN "eventId"   TO event_id;
ALTER TABLE saves RENAME COLUMN "createdAt" TO created_at;

-- reports
ALTER TABLE reports RENAME COLUMN "reporterId"   TO reporter_id;
ALTER TABLE reports RENAME COLUMN "contentType"  TO content_type;
ALTER TABLE reports RENAME COLUMN "contentId"    TO content_id;
ALTER TABLE reports RENAME COLUMN "targetUserId" TO target_user_id;
ALTER TABLE reports RENAME COLUMN "reviewedBy"   TO reviewed_by;
ALTER TABLE reports RENAME COLUMN "reviewedAt"   TO reviewed_at;
ALTER TABLE reports RENAME COLUMN "createdAt"    TO created_at;
ALTER TABLE reports RENAME COLUMN "updatedAt"    TO updated_at;

-- media_assets
ALTER TABLE media_assets RENAME COLUMN "uploadedBy"  TO uploaded_by;
ALTER TABLE media_assets RENAME COLUMN "contentType" TO content_type;
ALTER TABLE media_assets RENAME COLUMN "contentId"   TO content_id;
ALTER TABLE media_assets RENAME COLUMN "mediaType"   TO media_type;
ALTER TABLE media_assets RENAME COLUMN "storageKey"  TO storage_key;
ALTER TABLE media_assets RENAME COLUMN "publicUrl"   TO public_url;
ALTER TABLE media_assets RENAME COLUMN "mimeType"    TO mime_type;
ALTER TABLE media_assets RENAME COLUMN "fileSizeBytes" TO file_size_bytes;
ALTER TABLE media_assets RENAME COLUMN "createdAt"   TO created_at;

-- notification_logs
ALTER TABLE notification_logs RENAME COLUMN "userId"        TO user_id;
ALTER TABLE notification_logs RENAME COLUMN "notifType"     TO notif_type;
ALTER TABLE notification_logs RENAME COLUMN "pushToken"     TO push_token;
ALTER TABLE notification_logs RENAME COLUMN "sentAt"        TO sent_at;
ALTER TABLE notification_logs RENAME COLUMN "deliveredAt"   TO delivered_at;
ALTER TABLE notification_logs RENAME COLUMN "errorMessage"  TO error_message;

-- audit_logs
ALTER TABLE audit_logs RENAME COLUMN "actorId"     TO actor_id;
ALTER TABLE audit_logs RENAME COLUMN "targetType"  TO target_type;
ALTER TABLE audit_logs RENAME COLUMN "targetId"    TO target_id;
ALTER TABLE audit_logs RENAME COLUMN "createdAt"   TO created_at;

-- community_posts
ALTER TABLE community_posts RENAME COLUMN "authorId"    TO author_id;
ALTER TABLE community_posts RENAME COLUMN "cityId"      TO city_id;
ALTER TABLE community_posts RENAME COLUMN "mediaUrls"   TO media_urls;
ALTER TABLE community_posts RENAME COLUMN "savesCount"  TO save_count;
ALTER TABLE community_posts RENAME COLUMN "sharesCount" TO share_count;
ALTER TABLE community_posts RENAME COLUMN "createdAt"   TO created_at;
ALTER TABLE community_posts RENAME COLUMN "updatedAt"   TO updated_at;

-- leads
ALTER TABLE leads RENAME COLUMN "listingId"    TO listing_id;
ALTER TABLE leads RENAME COLUMN "fromUserId"   TO from_user_id;
ALTER TABLE leads RENAME COLUMN "leadType"     TO lead_type;
ALTER TABLE leads RENAME COLUMN "createdAt"    TO created_at;
