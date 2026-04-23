import { MigrationInterface, QueryRunner } from 'typeorm';

export class GooglePlacesColumns1714000000012 implements MigrationInterface {
  name = 'GooglePlacesColumns1714000000012';

  async up(queryRunner: QueryRunner): Promise<void> {
    // external_id: stores Google Place ID for deduplication on re-runs
    await queryRunner.query(`
      ALTER TABLE listings
        ADD COLUMN IF NOT EXISTS external_id VARCHAR(255) NULL,
        ADD COLUMN IF NOT EXISTS source VARCHAR(50) NULL DEFAULT 'manual',
        ADD COLUMN IF NOT EXISTS rating DECIMAL(3,1) NULL,
        ADD COLUMN IF NOT EXISTS rating_count INTEGER NULL
    `);

    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS idx_listings_external_id
      ON listings (external_id)
      WHERE external_id IS NOT NULL
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS idx_listings_external_id`);
    await queryRunner.query(`
      ALTER TABLE listings
        DROP COLUMN IF EXISTS external_id,
        DROP COLUMN IF EXISTS source,
        DROP COLUMN IF EXISTS rating,
        DROP COLUMN IF EXISTS rating_count
    `);
  }
}
