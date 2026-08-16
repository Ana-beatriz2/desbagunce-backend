import { Entity, Column, ManyToOne, JoinColumn, Unique } from 'typeorm';
import { AbstractEntity } from '../../common/entities/abstract.entity';
import { Item } from './item.entity';
import { Tag } from '../tag/tag.entity';

@Entity('item_tags')
@Unique('UQ_item_tags_item_id_tag_id', ['itemId', 'tagId'])
export class ItemTag extends AbstractEntity {
  @Column({ name: 'item_id' })
  itemId: string;

  @Column({ name: 'tag_id' })
  tagId: string;

  @ManyToOne(() => Item, (item) => item.itemTags, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'item_id' })
  item: Item;

  @ManyToOne(() => Tag, (tag) => tag.itemTags, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'tag_id' })
  tag: Tag;
}
