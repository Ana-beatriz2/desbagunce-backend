import {
  Entity,
  Column,
  ManyToOne,
  OneToMany,
  JoinColumn,
  Index,
} from 'typeorm';
import { AbstractEntity } from '../../common/entities/abstract.entity';
import { House } from '../house/house.entity';
import { Invite } from '../invite/invite.entity';

@Entity('users')
export class User extends AbstractEntity {
  @Column()
  name: string;

  @Index({ unique: true })
  @Column()
  email: string;

  @Index({ unique: true })
  @Column({ name: 'firebase_uid' })
  firebaseUid: string;

  @Column({ name: 'is_admin', default: false })
  isAdmin: boolean;

  @Column({ name: 'house_id' })
  houseId: string;

  @ManyToOne(() => House, (house) => house.users, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'house_id' })
  house: House;

  @OneToMany(() => Invite, (invite) => invite.invitedBy)
  sentInvites: Invite[];
}
