import { MigrationInterface, QueryRunner } from 'typeorm';

export class SearchVectors1710000000006 implements MigrationInterface {
  name = 'SearchVectors1710000000006';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // ─── Listings FTS ─────────────────────────────────────────────────────────
    await queryRunner.query(`
      ALTER TABLE "listings"
      ADD COLUMN "search_vector" TSVECTOR
        GENERATED ALWAYS AS (
          setweight(to_tsvector('english', coalesce(name, '')), 'A') ||
          setweight(to_tsvector('english', coalesce(description, '')), 'B') ||
          setweight(to_tsvector('english', coalesce(address, '')), 'C') ||
          setweight(to_tsvector('english', coalesce(neighborhood, '')), 'C')
        ) STORED
    `);

    await queryRunner.query(`
      CREATE INDEX "idx_listings_fts" ON "listings" USING GIN ("search_vector")
    `);

    // ─── Events FTS ───────────────────────────────────────────────────────────
    await queryRunner.query(`
      ALTER TABLE "events"
      ADD COLUMN "search_vector" TSVECTOR
        GENERATED ALWAYS AS (
          setweight(to_tsvector('english', coalesce(title, '')), 'A') ||
          setweight(to_tsvector('english', coalesce(description, '')), 'B') ||
          setweight(to_tsvector('english', coalesce(address, '')), 'C')
        ) STORED
    `);

    await queryRunner.query(`
      CREATE INDEX "idx_events_fts" ON "events" USING GIN ("search_vector")
    `);

    // ─── Community Posts FTS ──────────────────────────────────────────────────
    await queryRunner.query(`
      ALTER TABLE "community_posts"
      ADD COLUMN "search_vector" TSVECTOR
        GENERATED ALWAYS AS (
          setweight(to_tsvector('english', coalesce(body, '')), 'A')
        ) STORED
    `);

    await queryRunner.query(`
      CREATE INDEX "idx_community_posts_fts" ON "community_posts" USING GIN ("search_vector")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "listings" DROP COLUMN IF EXISTS "search_vector"`);
    await queryRunner.query(`ALTER TABLE "events" DROP COLUMN IF EXISTS "search_vector"`);
    await queryRunner.query(`ALTER TABLE "community_posts" DROP COLUMN IF EXISTS "search_vector"`);
  }
}
