import { MigrationInterface, QueryRunner } from 'typeorm';

export class EventsMissingColumns1714000000013 implements MigrationInterface {
  name = 'EventsMissingColumns1714000000013';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE events
        ADD COLUMN IF NOT EXISTS saves_count INTEGER NOT NULL DEFAULT 0,
        ADD COLUMN IF NOT EXISTS shares_count INTEGER NOT NULL DEFAULT 0
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE events
        DROP COLUMN IF EXISTS saves_count,
        DROP COLUMN IF EXISTS shares_count
    `);
  }
}
