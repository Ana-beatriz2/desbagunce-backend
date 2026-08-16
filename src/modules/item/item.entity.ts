import { Entity, Column, ManyToOne, JoinColumn, OneToMany } from 'typeorm';
import { AbstractEntity } from '../../common/entities/abstract.entity';
import { House } from '../house/house.entity';
import { ItemTag } from './item-tag.entity';

@Entity('items')
export class Item extends AbstractEntity {
  @Column()
  name: string;

  @Column({ type: 'text', nullable: true })
  notes: string | null;

  @Column({ name: 'current_quantity', type: 'int', default: 0 })
  currentQuantity: number;

  @Column({ name: 'purchase_quantity', type: 'int', default: 0 })
  purchaseQuantity: number;

  @Column({ name: 'weeks_until_depleted', type: 'int', nullable: true })
  weeksUntilDepleted: number | null;

  @Column({ name: 'photo_path', type: 'text', nullable: true })
  photoPath: string | null;

  @Column({ name: 'house_id' })
  houseId: string;

  @ManyToOne(() => House, (house) => house.items, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'house_id' })
  house: House;

  @OneToMany(() => ItemTag, (itemTag) => itemTag.item)
  itemTags: ItemTag[];
}
