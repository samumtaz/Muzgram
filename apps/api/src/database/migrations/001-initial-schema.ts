import { MigrationInterface, QueryRunner } from 'typeorm';

export class InitialSchema1710000000000 implements MigrationInterface {
  name = 'InitialSchema1710000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Enable PostGIS extension
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS "postgis"`);
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS "uuid-ossp"`);

    // ─── Enum Types ──────────────────────────────────────────────────────────

    await queryRunner.query(`
      CREATE TYPE "listing_main_category_enum" AS ENUM ('eat', 'go_out', 'connect')
    `);
    await queryRunner.query(`
      CREATE TYPE "listing_status_enum" AS ENUM ('pending', 'active', 'inactive', 'rejected')
    `);
    await queryRunner.query(`
      CREATE TYPE "event_status_enum" AS ENUM ('draft', 'pending', 'active', 'cancelled', 'completed')
    `);
    await queryRunner.query(`
      CREATE TYPE "post_status_enum" AS ENUM ('pending', 'active', 'hidden', 'removed')
    `);
    await queryRunner.query(`
      CREATE TYPE "content_type_enum" AS ENUM ('listing', 'event', 'post')
    `);
    await queryRunner.query(`
      CREATE TYPE "halal_certification_enum" AS ENUM ('ifanca', 'hca', 'iswa', 'self_certified', 'none')
    `);
    await queryRunner.query(`
      CREATE TYPE "media_type_enum" AS ENUM ('image', 'video')
    `);
    await queryRunner.query(`
      CREATE TYPE "report_reason_enum" AS ENUM ('spam', 'inappropriate', 'misinformation', 'not_halal', 'duplicate', 'other')
    `);
    await queryRunner.query(`
      CREATE TYPE "notification_type_enum" AS ENUM (
        'new_event_nearby', 'listing_special', 'event_reminder',
        'post_save', 'jummah_reminder', 'system'
      )
    `);

    // ─── Cities ──────────────────────────────────────────────────────────────

    await queryRunner.query(`
      CREATE TABLE "cities" (
        "id"          UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
        "slug"        VARCHAR(100) NOT NULL UNIQUE,
        "name"        VARCHAR(100) NOT NULL,
        "state"       CHAR(2) NOT NULL,
        "country"     CHAR(2) NOT NULL DEFAULT 'US',
        "center"      GEOMETRY(POINT, 4326),
        "centerLat"   DECIMAL(10, 7) NOT NULL DEFAULT 0,
        "centerLng"   DECIMAL(10, 7) NOT NULL DEFAULT 0,
        "isActive"    BOOLEAN NOT NULL DEFAULT false,
        "listingsCount" INTEGER NOT NULL DEFAULT 0,
        "createdAt"   TIMESTAMPTZ NOT NULL DEFAULT now(),
        "updatedAt"   TIMESTAMPTZ NOT NULL DEFAULT now()
      )
    `);

    // ─── Users ───────────────────────────────────────────────────────────────

    await queryRunner.query(`
      CREATE TABLE "users" (
        "id"                     UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
        "clerkUserId"            VARCHAR(255) NOT NULL UNIQUE,
        "phone"                  VARCHAR(20) NOT NULL UNIQUE,
        "displayName"            VARCHAR(100),
        "avatarUrl"              TEXT,
        "trustTier"              SMALLINT NOT NULL DEFAULT 0,
        "neighborhood"           VARCHAR(100),
        "citySlug"               VARCHAR(100),
        "lastKnownLat"           DECIMAL(10, 7),
        "lastKnownLng"           DECIMAL(10, 7),
        "lastKnownAt"            TIMESTAMPTZ,
        "expoPushToken"          TEXT,
        "notificationPrefs"      JSONB NOT NULL DEFAULT '{}',
        "isActive"               BOOLEAN NOT NULL DEFAULT true,
        "notificationsSentToday" INTEGER NOT NULL DEFAULT 0,
        "notificationsResetAt"   TIMESTAMPTZ,
        "reportsSubmittedCount"  INTEGER NOT NULL DEFAULT 0,
        "reportsReceivedCount"   INTEGER NOT NULL DEFAULT 0,
        "createdAt"              TIMESTAMPTZ NOT NULL DEFAULT now(),
        "updatedAt"              TIMESTAMPTZ NOT NULL DEFAULT now()
      )
    `);

    // ─── Listing Categories ───────────────────────────────────────────────────

    await queryRunner.query(`
      CREATE TABLE "listing_categories" (
        "id"           UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
        "slug"         VARCHAR(100) NOT NULL UNIQUE,
        "name"         VARCHAR(100) NOT NULL,
        "mainCategory" "listing_main_category_enum" NOT NULL,
        "parentId"     UUID REFERENCES "listing_categories"("id") ON DELETE SET NULL,
        "iconName"     VARCHAR(50) NOT NULL DEFAULT 'circle',
        "sortOrder"    INTEGER NOT NULL DEFAULT 0,
        "createdAt"    TIMESTAMPTZ NOT NULL DEFAULT now(),
        "updatedAt"    TIMESTAMPTZ NOT NULL DEFAULT now()
      )
    `);

    // ─── Listings ─────────────────────────────────────────────────────────────

    await queryRunner.query(`
      CREATE TABLE "listings" (
        "id"                  UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
        "slug"                VARCHAR(255) NOT NULL UNIQUE,
        "name"                VARCHAR(255) NOT NULL,
        "description"         TEXT,
        "mainCategory"        "listing_main_category_enum" NOT NULL,
        "categoryId"          UUID NOT NULL REFERENCES "listing_categories"("id"),
        "cityId"              UUID NOT NULL REFERENCES "cities"("id"),
        "address"             VARCHAR(500) NOT NULL,
        "neighborhood"        VARCHAR(100),
        "location"            GEOMETRY(POINT, 4326) NOT NULL,
        "lat"                 DECIMAL(10, 7) NOT NULL,
        "lng"                 DECIMAL(10, 7) NOT NULL,
        "phone"               VARCHAR(20),
        "website"             TEXT,
        "instagramHandle"     VARCHAR(50),
        "halalCertification"  "halal_certification_enum" NOT NULL DEFAULT 'none',
        "certificationBody"   VARCHAR(100),
        "isHalalVerified"     BOOLEAN NOT NULL DEFAULT false,
        "hours"               JSONB,
        "status"              "listing_status_enum" NOT NULL DEFAULT 'pending',
        "isClaimed"           BOOLEAN NOT NULL DEFAULT false,
        "claimedByUserId"     UUID REFERENCES "users"("id"),
        "claimedAt"           TIMESTAMPTZ,
        "isFeatured"          BOOLEAN NOT NULL DEFAULT false,
        "featuredUntil"       TIMESTAMPTZ,
        "isFoundingMember"    BOOLEAN NOT NULL DEFAULT false,
        "trustScore"          DECIMAL(5, 2) NOT NULL DEFAULT 0,
        "mediaUrls"           TEXT[] NOT NULL DEFAULT '{}',
        "thumbnailUrl"        TEXT,
        "savesCount"          INTEGER NOT NULL DEFAULT 0,
        "viewsCount"          INTEGER NOT NULL DEFAULT 0,
        "sharesCount"         INTEGER NOT NULL DEFAULT 0,
        "importedFrom"        VARCHAR(100),
        "createdAt"           TIMESTAMPTZ NOT NULL DEFAULT now(),
        "updatedAt"           TIMESTAMPTZ NOT NULL DEFAULT now()
      )
    `);

    // ─── Daily Specials ───────────────────────────────────────────────────────

    await queryRunner.query(`
      CREATE TABLE "daily_specials" (
        "id"          UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
        "listingId"   UUID NOT NULL REFERENCES "listings"("id") ON DELETE CASCADE,
        "title"       VARCHAR(255) NOT NULL,
        "description" TEXT,
        "price"       DECIMAL(8, 2),
        "expiresAt"   TIMESTAMPTZ NOT NULL,
        "createdAt"   TIMESTAMPTZ NOT NULL DEFAULT now()
      )
    `);

    // ─── Events ──────────────────────────────────────────────────────────────

    await queryRunner.query(`
      CREATE TABLE "events" (
        "id"              UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
        "slug"            VARCHAR(255) NOT NULL UNIQUE,
        "title"           VARCHAR(255) NOT NULL,
        "description"     TEXT NOT NULL,
        "categoryId"      UUID NOT NULL REFERENCES "listing_categories"("id"),
        "organizerId"     UUID NOT NULL REFERENCES "users"("id"),
        "listingId"       UUID REFERENCES "listings"("id"),
        "cityId"          UUID NOT NULL REFERENCES "cities"("id"),
        "address"         VARCHAR(500) NOT NULL,
        "location"        GEOMETRY(POINT, 4326) NOT NULL,
        "lat"             DECIMAL(10, 7) NOT NULL,
        "lng"             DECIMAL(10, 7) NOT NULL,
        "startAt"         TIMESTAMPTZ NOT NULL,
        "endAt"           TIMESTAMPTZ,
        "isRecurring"     BOOLEAN NOT NULL DEFAULT false,
        "recurrenceRule"  VARCHAR(500),
        "isOnline"        BOOLEAN NOT NULL DEFAULT false,
        "onlineUrl"       TEXT,
        "isFree"          BOOLEAN NOT NULL DEFAULT true,
        "ticketUrl"       TEXT,
        "status"          "event_status_enum" NOT NULL DEFAULT 'pending',
        "isFeatured"      BOOLEAN NOT NULL DEFAULT false,
        "featuredUntil"   TIMESTAMPTZ,
        "mediaUrls"       TEXT[] NOT NULL DEFAULT '{}',
        "thumbnailUrl"    TEXT,
        "tags"            TEXT[] NOT NULL DEFAULT '{}',
        "savesCount"      INTEGER NOT NULL DEFAULT 0,
        "sharesCount"     INTEGER NOT NULL DEFAULT 0,
        "createdAt"       TIMESTAMPTZ NOT NULL DEFAULT now(),
        "updatedAt"       TIMESTAMPTZ NOT NULL DEFAULT now()
      )
    `);

    // ─── Community Posts ──────────────────────────────────────────────────────

    await queryRunner.query(`
      CREATE TABLE "community_posts" (
        "id"              UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
        "authorId"        UUID NOT NULL REFERENCES "users"("id"),
        "body"            TEXT NOT NULL,
        "mediaUrls"       TEXT[] NOT NULL DEFAULT '{}',
        "linkedListingId" UUID REFERENCES "listings"("id"),
        "linkedEventId"   UUID REFERENCES "events"("id"),
        "cityId"          VARCHAR(100) NOT NULL,
        "location"        GEOMETRY(POINT, 4326),
        "lat"             DECIMAL(10, 7),
        "lng"             DECIMAL(10, 7),
        "neighborhood"    VARCHAR(100),
        "status"          "post_status_enum" NOT NULL DEFAULT 'pending',
        "reportWeight"    DECIMAL(5, 2) NOT NULL DEFAULT 0,
        "savesCount"      INTEGER NOT NULL DEFAULT 0,
        "sharesCount"     INTEGER NOT NULL DEFAULT 0,
        "expiresAt"       TIMESTAMPTZ NOT NULL,
        "createdAt"       TIMESTAMPTZ NOT NULL DEFAULT now(),
        "updatedAt"       TIMESTAMPTZ NOT NULL DEFAULT now()
      )
    `);

    // ─── Saves ────────────────────────────────────────────────────────────────

    await queryRunner.query(`
      CREATE TABLE "saves" (
        "id"          UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
        "userId"      UUID NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
        "contentType" "content_type_enum" NOT NULL,
        "contentId"   UUID NOT NULL,
        "listingId"   UUID REFERENCES "listings"("id") ON DELETE CASCADE,
        "eventId"     UUID REFERENCES "events"("id") ON DELETE CASCADE,
        "postId"      UUID REFERENCES "community_posts"("id") ON DELETE CASCADE,
        "createdAt"   TIMESTAMPTZ NOT NULL DEFAULT now(),
        UNIQUE("userId", "contentType", "contentId")
      )
    `);

    // ─── Notifications ───────────────────────────────────────────────────────

    await queryRunner.query(`
      CREATE TABLE "notifications" (
        "id"          UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
        "recipientId" UUID NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
        "type"        VARCHAR(50) NOT NULL,
        "title"       VARCHAR(255) NOT NULL,
        "body"        VARCHAR(150) NOT NULL,
        "actionUrl"   TEXT,
        "data"        JSONB NOT NULL DEFAULT '{}',
        "isRead"      BOOLEAN NOT NULL DEFAULT false,
        "readAt"      TIMESTAMPTZ,
        "deliveredAt" TIMESTAMPTZ,
        "createdAt"   TIMESTAMPTZ NOT NULL DEFAULT now()
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "notification_logs" (
        "id"              UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
        "userId"          UUID NOT NULL,
        "idempotencyKey"  VARCHAR(255) NOT NULL,
        "expoTicketId"    TEXT,
        "deliveryStatus"  VARCHAR(50),
        "createdAt"       TIMESTAMPTZ NOT NULL DEFAULT now(),
        UNIQUE("userId", "idempotencyKey")
      )
    `);

    // ─── Reports ──────────────────────────────────────────────────────────────

    await queryRunner.query(`
      CREATE TABLE "reports" (
        "id"          UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
        "reporterId"  UUID NOT NULL REFERENCES "users"("id"),
        "contentType" "content_type_enum" NOT NULL,
        "contentId"   UUID NOT NULL,
        "reason"      "report_reason_enum" NOT NULL,
        "notes"       TEXT,
        "weight"      DECIMAL(3, 1) NOT NULL,
        "resolvedAt"  TIMESTAMPTZ,
        "resolvedBy"  UUID,
        "resolution"  TEXT,
        "createdAt"   TIMESTAMPTZ NOT NULL DEFAULT now(),
        UNIQUE("reporterId", "contentType", "contentId")
      )
    `);

    // ─── Media Assets ─────────────────────────────────────────────────────────

    await queryRunner.query(`
      CREATE TABLE "media_assets" (
        "id"               UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
        "uploaderId"       UUID NOT NULL,
        "ownerId"          UUID NOT NULL,
        "contentType"      "content_type_enum" NOT NULL,
        "mediaType"        "media_type_enum" NOT NULL,
        "r2Key"            VARCHAR(500) NOT NULL UNIQUE,
        "publicUrl"        VARCHAR(500) NOT NULL,
        "mimeType"         VARCHAR(50) NOT NULL,
        "fileSizeBytes"    INTEGER NOT NULL DEFAULT 0,
        "isModerated"      BOOLEAN NOT NULL DEFAULT false,
        "moderationResult" VARCHAR(50),
        "isPublic"         BOOLEAN NOT NULL DEFAULT true,
        "createdAt"        TIMESTAMPTZ NOT NULL DEFAULT now()
      )
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "media_assets" CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS "reports" CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS "notification_logs" CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS "notifications" CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS "saves" CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS "community_posts" CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS "events" CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS "daily_specials" CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS "listings" CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS "listing_categories" CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS "users" CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS "cities" CASCADE`);
    await queryRunner.query(`DROP TYPE IF EXISTS "notification_type_enum"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "report_reason_enum"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "media_type_enum"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "halal_certification_enum"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "content_type_enum"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "post_status_enum"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "event_status_enum"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "listing_status_enum"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "listing_main_category_enum"`);
  }
}
