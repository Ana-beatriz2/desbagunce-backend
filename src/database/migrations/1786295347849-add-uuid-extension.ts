import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddUuidExtension1786295347849 implements MigrationInterface {
  name = 'AddUuidExtension1786295347849';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS "pgcrypto"`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP EXTENSION IF EXISTS "pgcrypto"`);
  }
}
