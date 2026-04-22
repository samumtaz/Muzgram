import { MigrationInterface, QueryRunner } from 'typeorm';

export class BillingTables1710000000005 implements MigrationInterface {
  name = 'BillingTables1710000000005';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TYPE "billing_product_enum" AS ENUM (
        'founding_member',
        'featured_placement',
        'event_boost',
        'lead_package'
      )
    `);

    await queryRunner.query(`
      CREATE TYPE "billing_interval_enum" AS ENUM ('week', 'month', 'quarter', 'year', 'one_time')
    `);

    await queryRunner.query(`
      CREATE TYPE "subscription_status_enum" AS ENUM (
        'active',
        'past_due',
        'canceled',
        'unpaid',
        'trialing',
        'paused'
      )
    `);

    await queryRunner.query(`
      CREATE TYPE "payment_status_enum" AS ENUM ('pending', 'succeeded', 'failed', 'refunded')
    `);

    // ─── Subscriptions ───────────────────────────────────────────────────────
    await queryRunner.query(`
      CREATE TABLE "subscriptions" (
        "id"                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        "listing_id"          UUID NOT NULL REFERENCES "listings"("id") ON DELETE CASCADE,
        "stripe_customer_id"  VARCHAR(255),
        "stripe_subscription_id" VARCHAR(255) UNIQUE,
        "stripe_price_id"     VARCHAR(255),
        "product"             "billing_product_enum" NOT NULL,
        "interval"            "billing_interval_enum" NOT NULL DEFAULT 'month',
        "status"              "subscription_status_enum" NOT NULL DEFAULT 'active',
        "amount_cents"        INTEGER NOT NULL,
        "currency"            VARCHAR(3) NOT NULL DEFAULT 'usd',
        "current_period_start" TIMESTAMPTZ,
        "current_period_end"   TIMESTAMPTZ,
        "cancel_at_period_end" BOOLEAN NOT NULL DEFAULT FALSE,
        "canceled_at"          TIMESTAMPTZ,
        "trial_end"            TIMESTAMPTZ,
        "metadata"             JSONB DEFAULT '{}',
        "created_by_user_id"   UUID REFERENCES "users"("id") ON DELETE SET NULL,
        "notes"                TEXT,
        "created_at"           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        "updated_at"           TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);

    await queryRunner.query(`CREATE INDEX "idx_subscriptions_listing" ON "subscriptions"("listing_id")`);
    await queryRunner.query(`CREATE INDEX "idx_subscriptions_status" ON "subscriptions"("status")`);
    await queryRunner.query(`CREATE INDEX "idx_subscriptions_period_end" ON "subscriptions"("current_period_end") WHERE "status" = 'active'`);

    // ─── Payments ────────────────────────────────────────────────────────────
    await queryRunner.query(`
      CREATE TABLE "payments" (
        "id"                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        "listing_id"          UUID NOT NULL REFERENCES "listings"("id") ON DELETE CASCADE,
        "subscription_id"     UUID REFERENCES "subscriptions"("id") ON DELETE SET NULL,
        "stripe_payment_intent_id" VARCHAR(255) UNIQUE,
        "stripe_invoice_id"   VARCHAR(255) UNIQUE,
        "stripe_checkout_session_id" VARCHAR(255) UNIQUE,
        "product"             "billing_product_enum" NOT NULL,
        "status"              "payment_status_enum" NOT NULL DEFAULT 'pending',
        "amount_cents"        INTEGER NOT NULL,
        "currency"            VARCHAR(3) NOT NULL DEFAULT 'usd',
        "description"         VARCHAR(500),
        "receipt_url"         TEXT,
        "refunded_at"         TIMESTAMPTZ,
        "refund_reason"       VARCHAR(255),
        "metadata"            JSONB DEFAULT '{}',
        "created_by_user_id"  UUID REFERENCES "users"("id") ON DELETE SET NULL,
        "created_at"          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        "updated_at"          TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);

    await queryRunner.query(`CREATE INDEX "idx_payments_listing" ON "payments"("listing_id")`);
    await queryRunner.query(`CREATE INDEX "idx_payments_status" ON "payments"("status")`);
    await queryRunner.query(`CREATE INDEX "idx_payments_created" ON "payments"("created_at" DESC)`);

    // ─── Auto-update updated_at ───────────────────────────────────────────────
    await queryRunner.query(`
      CREATE OR REPLACE FUNCTION update_updated_at_column()
      RETURNS TRIGGER AS $$
      BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
      $$ LANGUAGE plpgsql
    `);

    for (const table of ['subscriptions', 'payments']) {
      await queryRunner.query(`
        CREATE TRIGGER "trg_${table}_updated_at"
        BEFORE UPDATE ON "${table}"
        FOR EACH ROW EXECUTE FUNCTION update_updated_at_column()
      `);
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "payments" CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS "subscriptions" CASCADE`);
    await queryRunner.query(`DROP TYPE IF EXISTS "payment_status_enum"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "subscription_status_enum"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "billing_interval_enum"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "billing_product_enum"`);
  }
}
