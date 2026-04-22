-- Run this to complete the migration (notifications table only)
-- Everything before leads already ran successfully

ALTER TABLE notifications RENAME COLUMN "recipientId" TO recipient_id;
ALTER TABLE notifications RENAME COLUMN "actionUrl"   TO action_url;
ALTER TABLE notifications RENAME COLUMN "isRead"      TO is_read;
ALTER TABLE notifications RENAME COLUMN "readAt"      TO read_at;
ALTER TABLE notifications RENAME COLUMN "deliveredAt" TO delivered_at;
ALTER TABLE notifications RENAME COLUMN "createdAt"   TO created_at;
