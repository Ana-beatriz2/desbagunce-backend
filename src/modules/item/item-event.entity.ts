import { Entity, Column, ManyToOne, JoinColumn, Index } from 'typeorm';
import { AbstractEntity } from '../../common/entities/abstract.entity';
import { numericTransformer } from '../../common/transformers/numeric.transformer';
import { House } from '../house/house.entity';
import { User } from '../user/user.entity';
import { Item } from './item.entity';
import { ItemEventType } from './item.enums';

@Entity('item_events')
@Index('IDX_item_events_item_id_created_at', ['itemId', 'createdAt'])
export class ItemEvent extends AbstractEntity {
  @Column({ type: 'enum', enum: ItemEventType })
  type: ItemEventType;

  @Column({
    name: 'quantity_change',
    type: 'numeric',
    precision: 10,
    scale: 3,
    nullable: true,
    transformer: numericTransformer,
  })
  quantityChange: number | null;

  @Column({
    name: 'quantity_after',
    type: 'numeric',
    precision: 10,
    scale: 3,
    nullable: true,
    transformer: numericTransformer,
  })
  quantityAfter: number | null;

  @Column({ type: 'jsonb', nullable: true })
  details: Record<string, unknown> | null;

  @Column({ name: 'item_id' })
  itemId: string;

  @ManyToOne(() => Item, (item) => item.events, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'item_id' })
  item: Item;

  @Column({ name: 'house_id' })
  houseId: string;

  @ManyToOne(() => House, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'house_id' })
  house: House;

  @Column({ name: 'user_id', type: 'uuid', nullable: true })
  userId: string | null;

  @ManyToOne(() => User, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'user_id' })
  user: User | null;
}
