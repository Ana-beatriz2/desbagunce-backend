import { Entity, Column, OneToMany } from 'typeorm';
import { AbstractEntity } from '../../common/entities/abstract.entity';
import { User } from '../user/user.entity';
import { Item } from '../item/item.entity';
import { Tag } from '../tag/tag.entity';
import { Invite } from '../invite/invite.entity';

@Entity('houses')
export class House extends AbstractEntity {
  @Column()
  name: string;

  @Column({ name: 'image_path', type: 'text', nullable: true })
  imagePath: string | null;

  @OneToMany(() => User, (user) => user.house)
  users: User[];

  @OneToMany(() => Item, (item) => item.house)
  items: Item[];

  @OneToMany(() => Tag, (tag) => tag.house)
  tags: Tag[];

  @OneToMany(() => Invite, (invite) => invite.house)
  invites: Invite[];
}
