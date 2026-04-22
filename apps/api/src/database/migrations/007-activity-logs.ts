import { MigrationInterface, QueryRunner } from 'typeorm';

export class ActivityLogs1710000000007 implements MigrationInterface {
  name = 'ActivityLogs1710000000007';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Partitioned by month for easy archival — see docs/05
    await queryRunner.query(`
      CREATE TABLE "activity_logs" (
        "id"           UUID NOT NULL DEFAULT uuid_generate_v4(),
        "user_id"      UUID REFERENCES "users"("id") ON DELETE SET NULL,
        "event_name"   VARCHAR(100) NOT NULL,
        "properties"   JSONB DEFAULT '{}',
        "occurred_at"  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        PRIMARY KEY ("id", "occurred_at")
      ) PARTITION BY RANGE ("occurred_at")
    `);

    // Create initial partitions for current and next 3 months
    const now = new Date();
    for (let i = 0; i < 4; i++) {
      const start = new Date(now.getFullYear(), now.getMonth() + i, 1);
      const end = new Date(now.getFullYear(), now.getMonth() + i + 1, 1);
      const name = `activity_logs_${start.getFullYear()}_${String(start.getMonth() + 1).padStart(2, '0')}`;
      await queryRunner.query(`
        CREATE TABLE "${name}"
        PARTITION OF "activity_logs"
        FOR VALUES FROM ('${start.toISOString()}') TO ('${end.toISOString()}')
      `);
    }

    await queryRunner.query(`
      CREATE INDEX "idx_activity_logs_user" ON "activity_logs"("user_id", "occurred_at" DESC)
    `);
    await queryRunner.query(`
      CREATE INDEX "idx_activity_logs_event" ON "activity_logs"("event_name", "occurred_at" DESC)
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "activity_logs" CASCADE`);
  }
}
