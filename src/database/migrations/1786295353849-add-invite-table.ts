import {
  MigrationInterface,
  QueryRunner,
  Table,
  TableForeignKey,
  TableIndex,
} from 'typeorm';

export class AddInviteTable1786295353849 implements MigrationInterface {
  name = 'AddInviteTable1786295353849';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'invites',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            generationStrategy: 'uuid',
            default: 'gen_random_uuid()',
          },
          {
            name: 'email',
            type: 'varchar',
          },
          {
            name: 'code',
            type: 'varchar',
          },
          {
            name: 'status',
            type: 'enum',
            enum: ['pending', 'accepted', 'expired', 'canceled'],
            default: `'pending'`,
          },
          {
            name: 'expires_at',
            type: 'timestamptz',
          },
          {
            name: 'accepted_at',
            type: 'timestamptz',
            isNullable: true,
          },
          {
            name: 'house_id',
            type: 'uuid',
          },
          {
            name: 'invited_by_id',
            type: 'uuid',
          },
          {
            name: 'created_at',
            type: 'timestamptz',
            default: 'now()',
          },
          {
            name: 'updated_at',
            type: 'timestamptz',
            default: 'now()',
          },
          {
            name: 'deleted_at',
            type: 'timestamptz',
            isNullable: true,
          },
        ],
      }),
      true,
    );

    await queryRunner.createIndex(
      'invites',
      new TableIndex({ name: 'IDX_invites_email', columnNames: ['email'] }),
    );

    await queryRunner.createIndex(
      'invites',
      new TableIndex({
        name: 'IDX_invites_code',
        columnNames: ['code'],
        isUnique: true,
      }),
    );

    await queryRunner.createForeignKey(
      'invites',
      new TableForeignKey({
        name: 'FK_invites_house_id',
        columnNames: ['house_id'],
        referencedTableName: 'houses',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
      }),
    );

    await queryRunner.createForeignKey(
      'invites',
      new TableForeignKey({
        name: 'FK_invites_invited_by_id',
        columnNames: ['invited_by_id'],
        referencedTableName: 'users',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('invites', true);
  }
}
