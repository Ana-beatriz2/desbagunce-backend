import {
  MigrationInterface,
  QueryRunner,
  Table,
  TableColumn,
  TableForeignKey,
  TableIndex,
} from 'typeorm';

export class UpdateItemsAndAddItemEvents1786295354849 implements MigrationInterface {
  name = 'UpdateItemsAndAddItemEvents1786295354849';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropColumn('items', 'purchase_quantity');
    await queryRunner.dropColumn('items', 'weeks_until_depleted');

    // Decimal so items tracked in kg can hold e.g. 2.5
    await queryRunner.query(
      `ALTER TABLE "items" ALTER COLUMN "current_quantity" TYPE numeric(10,3)`,
    );

    await queryRunner.addColumns('items', [
      new TableColumn({
        name: 'unit',
        type: 'enum',
        enum: ['unit', 'kg'],
        default: `'unit'`,
      }),
      new TableColumn({
        name: 'status',
        type: 'enum',
        enum: ['in_stock', 'running_low', 'probably_out', 'out_of_stock'],
        default: `'in_stock'`,
      }),
      new TableColumn({
        name: 'daily_consumption',
        type: 'numeric',
        precision: 12,
        scale: 4,
        isNullable: true,
      }),
      new TableColumn({
        name: 'estimated_depletion_date',
        type: 'date',
        isNullable: true,
      }),
    ]);

    await queryRunner.createTable(
      new Table({
        name: 'item_events',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            generationStrategy: 'uuid',
            default: 'gen_random_uuid()',
          },
          {
            name: 'type',
            type: 'enum',
            enum: [
              'created',
              'purchased',
              'quantity_updated',
              'depleted',
              'confirmed_still_has',
              'edited',
            ],
          },
          {
            name: 'quantity_change',
            type: 'numeric',
            precision: 10,
            scale: 3,
            isNullable: true,
          },
          {
            name: 'quantity_after',
            type: 'numeric',
            precision: 10,
            scale: 3,
            isNullable: true,
          },
          {
            name: 'details',
            type: 'jsonb',
            isNullable: true,
          },
          {
            name: 'item_id',
            type: 'uuid',
          },
          {
            name: 'house_id',
            type: 'uuid',
          },
          {
            name: 'user_id',
            type: 'uuid',
            isNullable: true,
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
      'item_events',
      new TableIndex({
        name: 'IDX_item_events_item_id_created_at',
        columnNames: ['item_id', 'created_at'],
      }),
    );

    await queryRunner.createForeignKey(
      'item_events',
      new TableForeignKey({
        name: 'FK_item_events_item_id',
        columnNames: ['item_id'],
        referencedTableName: 'items',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
      }),
    );

    await queryRunner.createForeignKey(
      'item_events',
      new TableForeignKey({
        name: 'FK_item_events_house_id',
        columnNames: ['house_id'],
        referencedTableName: 'houses',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
      }),
    );

    await queryRunner.createForeignKey(
      'item_events',
      new TableForeignKey({
        name: 'FK_item_events_user_id',
        columnNames: ['user_id'],
        referencedTableName: 'users',
        referencedColumnNames: ['id'],
        onDelete: 'SET NULL',
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('item_events', true);

    await queryRunner.dropColumn('items', 'estimated_depletion_date');
    await queryRunner.dropColumn('items', 'daily_consumption');
    await queryRunner.dropColumn('items', 'status');
    await queryRunner.dropColumn('items', 'unit');

    await queryRunner.query(
      `DROP TYPE IF EXISTS "item_events_type_enum", "items_status_enum", "items_unit_enum"`,
    );

    await queryRunner.query(
      `ALTER TABLE "items" ALTER COLUMN "current_quantity" TYPE int USING ROUND("current_quantity")`,
    );

    await queryRunner.addColumns('items', [
      new TableColumn({
        name: 'purchase_quantity',
        type: 'int',
        default: 0,
      }),
      new TableColumn({
        name: 'weeks_until_depleted',
        type: 'int',
        isNullable: true,
      }),
    ]);
  }
}
