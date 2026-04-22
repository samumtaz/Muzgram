import { MigrationInterface, QueryRunner } from 'typeorm';

export class SuperAdminRole1710000000010 implements MigrationInterface {
  name = 'SuperAdminRole1710000000010';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TYPE "user_role_enum" ADD VALUE IF NOT EXISTS 'super_admin'
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // PostgreSQL does not support removing enum values — intentional no-op
  }
}
