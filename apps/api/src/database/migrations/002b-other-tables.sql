-- =============================================================================
-- Migration 002b: Rename remaining tables (run AFTER 002-snake-case-schema.sql)
-- The first migration already handled: cities, listing_categories, listings,
-- daily_specials, events, users. This covers all other tables.
-- =============================================================================

-- ─── SAVES ───────────────────────────────────────────────────────────────────

ALTER TABLE saves RENAME COLUMN "userId"      TO user_id;
ALTER TABLE saves RENAME COLUMN "contentType" TO content_type;
ALTER TABLE saves RENAME COLUMN "contentId"   TO content_id;
ALTER TABLE saves RENAME COLUMN "listingId"   TO listing_id;
ALTER TABLE saves RENAME COLUMN "eventId"     TO event_id;
ALTER TABLE saves RENAME COLUMN "postId"      TO post_id;
ALTER TABLE saves RENAME COLUMN "createdAt"   TO created_at;

-- ─── REPORTS ─────────────────────────────────────────────────────────────────

ALTER TABLE reports RENAME COLUMN "reporterId"  TO reporter_id;
ALTER TABLE reports RENAME COLUMN "contentType" TO content_type;
ALTER TABLE reports RENAME COLUMN "contentId"   TO content_id;
ALTER TABLE reports RENAME COLUMN "resolvedAt"  TO resolved_at;
ALTER TABLE reports RENAME COLUMN "resolvedBy"  TO resolved_by;
ALTER TABLE reports RENAME COLUMN "createdAt"   TO created_at;

-- ─── MEDIA_ASSETS ────────────────────────────────────────────────────────────

ALTER TABLE media_assets RENAME COLUMN "uploaderId"       TO uploader_id;
ALTER TABLE media_assets RENAME COLUMN "ownerId"          TO owner_id;
ALTER TABLE media_assets RENAME COLUMN "contentType"      TO content_type;
ALTER TABLE media_assets RENAME COLUMN "mediaType"        TO media_type;
ALTER TABLE media_assets RENAME COLUMN "r2Key"            TO r2_key;
ALTER TABLE media_assets RENAME COLUMN "publicUrl"        TO public_url;
ALTER TABLE media_assets RENAME COLUMN "mimeType"         TO mime_type;
ALTER TABLE media_assets RENAME COLUMN "fileSizeBytes"    TO file_size_bytes;
ALTER TABLE media_assets RENAME COLUMN "isModerated"      TO is_moderated;
ALTER TABLE media_assets RENAME COLUMN "moderationResult" TO moderation_result;
ALTER TABLE media_assets RENAME COLUMN "isPublic"         TO is_public;
ALTER TABLE media_assets RENAME COLUMN "createdAt"        TO created_at;

-- ─── NOTIFICATION_LOGS ───────────────────────────────────────────────────────

ALTER TABLE notification_logs RENAME COLUMN "userId"          TO user_id;
ALTER TABLE notification_logs RENAME COLUMN "idempotencyKey"  TO idempotency_key;
ALTER TABLE notification_logs RENAME COLUMN "expoTicketId"    TO expo_ticket_id;
ALTER TABLE notification_logs RENAME COLUMN "deliveryStatus"  TO delivery_status;
ALTER TABLE notification_logs RENAME COLUMN "createdAt"       TO created_at;

-- ─── AUDIT_LOGS ──────────────────────────────────────────────────────────────

ALTER TABLE audit_logs RENAME COLUMN "actorId"     TO actor_id;
ALTER TABLE audit_logs RENAME COLUMN "actorRole"   TO actor_role;
ALTER TABLE audit_logs RENAME COLUMN "targetType"  TO target_type;
ALTER TABLE audit_logs RENAME COLUMN "targetId"    TO target_id;
ALTER TABLE audit_logs RENAME COLUMN "beforeState" TO before_state;
ALTER TABLE audit_logs RENAME COLUMN "afterState"  TO after_state;
ALTER TABLE audit_logs RENAME COLUMN "ipAddress"   TO ip_address;
ALTER TABLE audit_logs RENAME COLUMN "userAgent"   TO user_agent;
ALTER TABLE audit_logs RENAME COLUMN "createdAt"   TO created_at;

-- ─── COMMUNITY_POSTS ─────────────────────────────────────────────────────────

ALTER TABLE community_posts RENAME COLUMN "authorId"        TO author_id;
ALTER TABLE community_posts RENAME COLUMN "mediaUrls"       TO media_urls;
ALTER TABLE community_posts RENAME COLUMN "linkedListingId" TO linked_listing_id;
ALTER TABLE community_posts RENAME COLUMN "linkedEventId"   TO linked_event_id;
ALTER TABLE community_posts RENAME COLUMN "cityId"          TO city_id;
ALTER TABLE community_posts RENAME COLUMN "reportWeight"    TO report_weight;
ALTER TABLE community_posts RENAME COLUMN "savesCount"      TO save_count;
ALTER TABLE community_posts RENAME COLUMN "sharesCount"     TO share_count;
ALTER TABLE community_posts RENAME COLUMN "expiresAt"       TO expires_at;
ALTER TABLE community_posts RENAME COLUMN "createdAt"       TO created_at;
ALTER TABLE community_posts RENAME COLUMN "updatedAt"       TO updated_at;

-- ─── LEADS ───────────────────────────────────────────────────────────────────

ALTER TABLE leads RENAME COLUMN "listingId"   TO listing_id;
ALTER TABLE leads RENAME COLUMN "senderId"    TO sender_id;
ALTER TABLE leads RENAME COLUMN "senderPhone" TO sender_phone;
ALTER TABLE leads RENAME COLUMN "viewedAt"    TO viewed_at;
ALTER TABLE leads RENAME COLUMN "respondedAt" TO responded_at;
ALTER TABLE leads RENAME COLUMN "createdAt"   TO created_at;
ALTER TABLE leads RENAME COLUMN "updatedAt"   TO updated_at;

-- ─── NOTIFICATIONS ───────────────────────────────────────────────────────────

ALTER TABLE notifications RENAME COLUMN "recipientId" TO recipient_id;
ALTER TABLE notifications RENAME COLUMN "actionUrl"   TO action_url;
ALTER TABLE notifications RENAME COLUMN "isRead"      TO is_read;
ALTER TABLE notifications RENAME COLUMN "readAt"      TO read_at;
ALTER TABLE notifications RENAME COLUMN "deliveredAt" TO delivered_at;
ALTER TABLE notifications RENAME COLUMN "createdAt"   TO created_at;
