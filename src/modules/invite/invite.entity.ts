import { Entity, Column, ManyToOne, JoinColumn, Index } from 'typeorm';
import { AbstractEntity } from '../../common/entities/abstract.entity';
import { House } from '../house/house.entity';
import { User } from '../user/user.entity';
import { InviteStatus } from './invite-status.enum';

@Entity('invites')
export class Invite extends AbstractEntity {
  @Index()
  @Column()
  email: string;

  @Index({ unique: true })
  @Column()
  code: string;

  @Column({ type: 'enum', enum: InviteStatus, default: InviteStatus.PENDING })
  status: InviteStatus;

  @Column({ name: 'expires_at', type: 'timestamptz' })
  expiresAt: Date;

  @Column({ name: 'accepted_at', type: 'timestamptz', nullable: true })
  acceptedAt: Date | null;

  @Column({ name: 'house_id' })
  houseId: string;

  @ManyToOne(() => House, (house) => house.invites, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'house_id' })
  house: House;

  @Column({ name: 'invited_by_id' })
  invitedById: string;

  @ManyToOne(() => User, (user) => user.sentInvites, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'invited_by_id' })
  invitedBy: User;
}
