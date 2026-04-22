import { MigrationInterface, QueryRunner } from 'typeorm';

export class AuditLogs1710000000009 implements MigrationInterface {
  name = 'AuditLogs1710000000009';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "audit_logs" (
        "id"           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        "actorId"      VARCHAR(100) NOT NULL,
        "actorRole"    VARCHAR(30) NOT NULL,
        "action"       VARCHAR(100) NOT NULL,
        "targetType"   VARCHAR(50) NOT NULL,
        "targetId"     VARCHAR(100),
        "beforeState"  JSONB,
        "afterState"   JSONB,
        "ipAddress"    VARCHAR(45),
        "userAgent"    VARCHAR(300),
        "createdAt"    TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);

    await queryRunner.query(`
      CREATE INDEX "idx_audit_logs_actor" ON "audit_logs"("actorId", "createdAt" DESC)
    `);
    await queryRunner.query(`
      CREATE INDEX "idx_audit_logs_target" ON "audit_logs"("targetType", "targetId", "createdAt" DESC)
    `);
    await queryRunner.query(`
      CREATE INDEX "idx_audit_logs_action" ON "audit_logs"("action", "createdAt" DESC)
    `);

    // Revoke UPDATE and DELETE on audit_logs to enforce append-only
    await queryRunner.query(`
      REVOKE UPDATE, DELETE ON "audit_logs" FROM PUBLIC
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "audit_logs"`);
  }
}
