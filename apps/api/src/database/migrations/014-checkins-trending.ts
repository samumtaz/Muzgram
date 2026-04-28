import { MigrationInterface, QueryRunner } from 'typeorm';

export class CheckinsTrending1714000000014 implements MigrationInterface {
  name = 'CheckinsTrending1714000000014';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Check-ins table
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS check_ins (
        id           UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
        user_id      UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        listing_id   UUID REFERENCES listings(id) ON DELETE CASCADE,
        event_id     UUID REFERENCES events(id) ON DELETE CASCADE,
        lat          DECIMAL(10,7),
        lng          DECIMAL(10,7),
        created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
        CONSTRAINT check_ins_target CHECK (
          (listing_id IS NOT NULL AND event_id IS NULL) OR
          (listing_id IS NULL AND event_id IS NOT NULL)
        )
      )
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_check_ins_listing ON check_ins(listing_id, created_at DESC);
      CREATE INDEX IF NOT EXISTS idx_check_ins_event ON check_ins(event_id, created_at DESC);
      CREATE INDEX IF NOT EXISTS idx_check_ins_user ON check_ins(user_id, created_at DESC);
    `);

    // Dedup (one check-in per user per listing per day) is enforced in application code

    // Add weekly_saves_count to listings for trending score
    await queryRunner.query(`
      ALTER TABLE listings
        ADD COLUMN IF NOT EXISTS checkins_count INTEGER NOT NULL DEFAULT 0,
        ADD COLUMN IF NOT EXISTS weekly_saves  INTEGER NOT NULL DEFAULT 0,
        ADD COLUMN IF NOT EXISTS trending_score DECIMAL(10,4) NOT NULL DEFAULT 0;
    `);

    await queryRunner.query(`
      ALTER TABLE events
        ADD COLUMN IF NOT EXISTS checkins_count INTEGER NOT NULL DEFAULT 0,
        ADD COLUMN IF NOT EXISTS trending_score DECIMAL(10,4) NOT NULL DEFAULT 0;
    `);

    // View: weekly trending scores (refreshed by a cron job)
    // trending_score = saves_last_7d * 2 + checkins_last_7d * 3 + saves_count * 0.1
    await queryRunner.query(`
      CREATE OR REPLACE FUNCTION refresh_trending_scores() RETURNS void AS $$
      BEGIN
        -- Listings
        UPDATE listings l
        SET trending_score = (
          COALESCE((
            SELECT COUNT(*) FROM saves s
            WHERE s.content_id = l.id
              AND s.created_at > now() - INTERVAL '7 days'
          ), 0) * 2
          + COALESCE((
            SELECT COUNT(*) FROM check_ins c
            WHERE c.listing_id = l.id
              AND c.created_at > now() - INTERVAL '7 days'
          ), 0) * 3
          + l.saves_count * 0.1
        );

        -- Events
        UPDATE events e
        SET trending_score = (
          COALESCE((
            SELECT COUNT(*) FROM saves s
            WHERE s.content_id = e.id
              AND s.created_at > now() - INTERVAL '7 days'
          ), 0) * 2
          + COALESCE((
            SELECT COUNT(*) FROM check_ins c
            WHERE c.event_id = e.id
              AND c.created_at > now() - INTERVAL '7 days'
          ), 0) * 3
          + e.saves_count * 0.1
        );
      END;
      $$ LANGUAGE plpgsql;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS check_ins`);
    await queryRunner.query(`DROP FUNCTION IF EXISTS refresh_trending_scores`);
    await queryRunner.query(`
      ALTER TABLE listings
        DROP COLUMN IF EXISTS checkins_count,
        DROP COLUMN IF EXISTS weekly_saves,
        DROP COLUMN IF EXISTS trending_score;
    `);
    await queryRunner.query(`
      ALTER TABLE events
        DROP COLUMN IF EXISTS checkins_count,
        DROP COLUMN IF EXISTS trending_score;
    `);
  }
}
