import { MigrationInterface, QueryRunner } from 'typeorm';

export class EventSyncColumns1714000000015 implements MigrationInterface {
  name = 'EventSyncColumns1714000000015';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE events
        ADD COLUMN IF NOT EXISTS external_id   VARCHAR(255) UNIQUE,
        ADD COLUMN IF NOT EXISTS source        VARCHAR(50)  NOT NULL DEFAULT 'manual',
        ADD COLUMN IF NOT EXISTS organizer_name VARCHAR(255);
    `);

    // Allow organizer_id to be null — external events have no user organizer
    await queryRunner.query(`
      ALTER TABLE events ALTER COLUMN organizer_id DROP NOT NULL;
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_events_external_id ON events(external_id)
        WHERE external_id IS NOT NULL;
      CREATE INDEX IF NOT EXISTS idx_events_source ON events(source);
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS idx_events_external_id`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_events_source`);
    await queryRunner.query(`
      ALTER TABLE events
        DROP COLUMN IF EXISTS external_id,
        DROP COLUMN IF EXISTS source,
        DROP COLUMN IF EXISTS organizer_name;
    `);
    await queryRunner.query(`
      ALTER TABLE events ALTER COLUMN organizer_id SET NOT NULL;
    `);
  }
}
