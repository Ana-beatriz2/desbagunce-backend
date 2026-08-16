import { Entity, Column, ManyToOne, JoinColumn, OneToMany } from 'typeorm';
import { AbstractEntity } from '../../common/entities/abstract.entity';
import { House } from '../house/house.entity';
import { ItemTag } from '../item/item-tag.entity';

@Entity('tags')
export class Tag extends AbstractEntity {
  @Column()
  name: string;

  @Column({ type: 'text', nullable: true })
  notes: string | null;

  @Column({ name: 'house_id' })
  houseId: string;

  @ManyToOne(() => House, (house) => house.tags, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'house_id' })
  house: House;

  @OneToMany(() => ItemTag, (itemTag) => itemTag.tag)
  itemTags: ItemTag[];
}
