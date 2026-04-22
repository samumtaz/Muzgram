import { MigrationInterface, QueryRunner } from 'typeorm';

export class LeadsTable1710000000004 implements MigrationInterface {
  name = 'LeadsTable1710000000004';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TYPE "lead_status_enum" AS ENUM ('new', 'viewed', 'responded', 'closed', 'spam')
    `);

    await queryRunner.query(`
      CREATE TABLE "leads" (
        "id"            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        "listing_id"    UUID NOT NULL REFERENCES "listings"("id") ON DELETE CASCADE,
        "sender_id"     UUID NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
        "sender_phone"  VARCHAR(20) NOT NULL,
        "message"       VARCHAR(500),
        "status"        "lead_status_enum" NOT NULL DEFAULT 'new',
        "viewed_at"     TIMESTAMPTZ,
        "responded_at"  TIMESTAMPTZ,
        "notes"         TEXT,
        "created_at"    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        "updated_at"    TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);

    await queryRunner.query(`CREATE INDEX "idx_leads_listing" ON "leads"("listing_id", "created_at" DESC)`);
    await queryRunner.query(`CREATE INDEX "idx_leads_sender" ON "leads"("sender_id")`);
    await queryRunner.query(`CREATE INDEX "idx_leads_status" ON "leads"("status")`);
    await queryRunner.query(`
      CREATE UNIQUE INDEX "idx_leads_dedup"
      ON "leads"("listing_id", "sender_id", DATE_TRUNC('day', "created_at"))
    `);

    await queryRunner.query(`
      CREATE TRIGGER "trg_leads_updated_at"
      BEFORE UPDATE ON "leads"
      FOR EACH ROW EXECUTE FUNCTION update_updated_at_column()
    `);

    // Add leads count to listings for quick display
    await queryRunner.query(`ALTER TABLE "listings" ADD COLUMN IF NOT EXISTS "leads_count" INTEGER NOT NULL DEFAULT 0`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "listings" DROP COLUMN IF EXISTS "leads_count"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "leads" CASCADE`);
    await queryRunner.query(`DROP TYPE IF EXISTS "lead_status_enum"`);
  }
}
