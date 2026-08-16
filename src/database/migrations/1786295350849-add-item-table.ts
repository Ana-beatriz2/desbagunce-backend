import {
  MigrationInterface,
  QueryRunner,
  Table,
  TableForeignKey,
} from 'typeorm';

export class AddItemTable1786295350849 implements MigrationInterface {
  name = 'AddItemTable1786295350849';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'items',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            generationStrategy: 'uuid',
            default: 'gen_random_uuid()',
          },
          {
            name: 'name',
            type: 'varchar',
          },
          {
            name: 'notes',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'current_quantity',
            type: 'int',
            default: 0,
          },
          {
            name: 'purchase_quantity',
            type: 'int',
            default: 0,
          },
          {
            name: 'weeks_until_depleted',
            type: 'int',
            isNullable: true,
          },
          {
            name: 'photo_path',
            type: 'varchar',
            isNullable: true,
          },
          {
            name: 'house_id',
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

    await queryRunner.createForeignKey(
      'items',
      new TableForeignKey({
        name: 'FK_items_house_id',
        columnNames: ['house_id'],
        referencedTableName: 'houses',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('items', true);
  }
}
