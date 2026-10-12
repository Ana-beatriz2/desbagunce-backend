import { Entity, Column, ManyToOne, JoinColumn, OneToMany } from 'typeorm';
import { AbstractEntity } from '../../common/entities/abstract.entity';
import { numericTransformer } from '../../common/transformers/numeric.transformer';
import { House } from '../house/house.entity';
import { ItemTag } from './item-tag.entity';
import { ItemEvent } from './item-event.entity';
import { ItemStatus, ItemUnit } from './item.enums';

@Entity('items')
export class Item extends AbstractEntity {
  @Column()
  name: string;

  @Column({ type: 'text', nullable: true })
  notes: string | null;

  @Column({ type: 'enum', enum: ItemUnit, default: ItemUnit.UNIT })
  unit: ItemUnit;

  @Column({ type: 'enum', enum: ItemStatus, default: ItemStatus.IN_STOCK })
  status: ItemStatus;

  @Column({
    name: 'current_quantity',
    type: 'numeric',
    precision: 10,
    scale: 3,
    default: 0,
    transformer: numericTransformer,
  })
  currentQuantity: number;

  // How much of `unit` the house uses per day, learned from item_events
  @Column({
    name: 'daily_consumption',
    type: 'numeric',
    precision: 12,
    scale: 4,
    nullable: true,
    transformer: numericTransformer,
  })
  dailyConsumption: number | null;

  // Returned by the pg driver as a 'YYYY-MM-DD' string
  @Column({ name: 'estimated_depletion_date', type: 'date', nullable: true })
  estimatedDepletionDate: string | null;

  @Column({ name: 'photo_path', type: 'text', nullable: true })
  photoPath: string | null;

  @Column({ name: 'house_id' })
  houseId: string;

  @ManyToOne(() => House, (house) => house.items, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'house_id' })
  house: House;

  @OneToMany(() => ItemTag, (itemTag) => itemTag.item)
  itemTags: ItemTag[];

  @OneToMany(() => ItemEvent, (event) => event.item)
  events: ItemEvent[];
}
