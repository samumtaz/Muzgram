import { MigrationInterface, QueryRunner } from 'typeorm';

export class SpatialIndexes1710000000001 implements MigrationInterface {
  name = 'SpatialIndexes1710000000001';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // GIST spatial indexes for PostGIS ST_DWithin queries
    await queryRunner.query(`
      CREATE INDEX "idx_listings_location" ON "listings" USING GIST ("location")
    `);
    await queryRunner.query(`
      CREATE INDEX "idx_events_location" ON "events" USING GIST ("location")
    `);
    await queryRunner.query(`
      CREATE INDEX "idx_posts_location" ON "community_posts" USING GIST ("location")
    `);
    await queryRunner.query(`
      CREATE INDEX "idx_cities_center" ON "cities" USING GIST ("center")
    `);

    // Composite indexes for common feed query patterns
    await queryRunner.query(`
      CREATE INDEX "idx_listings_feed" ON "listings" ("cityId", "status", "isFeatured", "updatedAt" DESC)
    `);
    await queryRunner.query(`
      CREATE INDEX "idx_events_upcoming" ON "events" ("cityId", "status", "startAt" ASC)
      WHERE "startAt" > now() AND "status" = 'active'
    `);
    await queryRunner.query(`
      CREATE INDEX "idx_posts_active" ON "community_posts" ("cityId", "status", "createdAt" DESC)
      WHERE "status" = 'active' AND "expiresAt" > now()
    `);
    await queryRunner.query(`
      CREATE INDEX "idx_daily_specials_active" ON "daily_specials" ("listingId", "expiresAt")
      WHERE "expiresAt" > now()
    `);

    // Index for notification delivery queries
    await queryRunner.query(`
      CREATE INDEX "idx_notifications_unread" ON "notifications" ("recipientId", "createdAt" DESC)
      WHERE "isRead" = false
    `);

    // Index for saves lookup (check if user has saved an item)
    await queryRunner.query(`
      CREATE INDEX "idx_saves_lookup" ON "saves" ("userId", "contentType", "contentId")
    `);

    // Seed Chicago metro city record
    await queryRunner.query(`
      INSERT INTO "cities" ("id", "slug", "name", "state", "country", "centerLat", "centerLng", "isActive")
      VALUES (
        uuid_generate_v4(),
        'chicago',
        'Chicago',
        'IL',
        'US',
        41.8781,
        -87.6298,
        true
      )
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_saves_lookup"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_notifications_unread"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_daily_specials_active"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_posts_active"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_events_upcoming"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_listings_feed"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_cities_center"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_posts_location"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_events_location"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_listings_location"`);
  }
}
