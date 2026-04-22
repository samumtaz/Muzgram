import { MigrationInterface, QueryRunner } from 'typeorm';

export class ModerationActions1710000000008 implements MigrationInterface {
  name = 'ModerationActions1710000000008';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Append-only audit log — never update or delete (docs/07)
    await queryRunner.query(`
      CREATE TABLE "moderation_actions" (
        "id"          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        "actor_id"    UUID REFERENCES "users"("id") ON DELETE SET NULL,
        "action"      VARCHAR(100) NOT NULL,
        "target_id"   UUID,
        "target_type" VARCHAR(50),
        "metadata"    JSONB DEFAULT '{}',
        "ip_address"  VARCHAR(45),
        "created_at"  TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);

    // No UPDATE trigger — this table is append-only by design
    await queryRunner.query(`CREATE INDEX "idx_moderation_actions_actor" ON "moderation_actions"("actor_id", "created_at" DESC)`);
    await queryRunner.query(`CREATE INDEX "idx_moderation_actions_target" ON "moderation_actions"("target_id")`);
    await queryRunner.query(`CREATE INDEX "idx_moderation_actions_action" ON "moderation_actions"("action", "created_at" DESC)`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "moderation_actions"`);
  }
}
