import { MigrationInterface, QueryRunner } from 'typeorm';

export class SupportTables1745000000011 implements MigrationInterface {
  name = 'SupportTables1745000000011';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS support_tickets (
        id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        user_phone      VARCHAR(20),
        subject         VARCHAR(120) NOT NULL,
        status          VARCHAR(20) NOT NULL DEFAULT 'open'
                          CHECK (status IN ('open', 'in_progress', 'resolved')),
        created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        last_message_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS support_messages (
        id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        ticket_id   UUID NOT NULL REFERENCES support_tickets(id) ON DELETE CASCADE,
        sender_id   UUID NOT NULL REFERENCES users(id),
        sender_role VARCHAR(10) NOT NULL CHECK (sender_role IN ('user', 'admin')),
        body        TEXT NOT NULL,
        created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);

    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_support_tickets_user ON support_tickets(user_id)`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_support_tickets_status ON support_tickets(status)`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_support_messages_ticket ON support_messages(ticket_id)`);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS support_messages`);
    await queryRunner.query(`DROP TABLE IF EXISTS support_tickets`);
  }
}
