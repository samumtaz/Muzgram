import { MigrationInterface, QueryRunner } from 'typeorm';

export class UserRoles1710000000003 implements MigrationInterface {
  name = 'UserRoles1710000000003';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TYPE "user_role_enum" AS ENUM ('user', 'business_owner', 'moderator', 'admin')
    `);

    await queryRunner.query(`
      ALTER TABLE "users"
      ADD COLUMN "role" "user_role_enum" NOT NULL DEFAULT 'user'
    `);

    await queryRunner.query(`CREATE INDEX "idx_users_role" ON "users"("role")`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "role"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "user_role_enum"`);
  }
}
