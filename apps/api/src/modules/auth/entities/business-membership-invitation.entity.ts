import {
  Column,
  Entity,
  PrimaryGeneratedColumn,
} from 'typeorm';

import type { BusinessRole } from './business-membership.entity';

export type BusinessInvitationRole = Exclude<
  BusinessRole,
  'owner'
>;

@Entity({ name: 'business_membership_invitations' })
export class BusinessMembershipInvitation {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'business_id', type: 'uuid' })
  businessId!: string;

  @Column({
    name: 'invited_email',
    type: 'varchar',
    length: 320,
  })
  invitedEmail!: string;

  @Column({ type: 'varchar', length: 30 })
  role!: BusinessInvitationRole;

  @Column({
    name: 'token_hash',
    type: 'varchar',
    length: 64,
    unique: true,
    select: false,
  })
  tokenHash!: string;

  @Column({ name: 'invited_by_user_id', type: 'uuid' })
  invitedByUserId!: string;

  @Column({ name: 'expires_at', type: 'timestamptz' })
  expiresAt!: Date;

  @Column({
    name: 'accepted_at',
    type: 'timestamptz',
    nullable: true,
  })
  acceptedAt!: Date | null;

  @Column({
    name: 'revoked_at',
    type: 'timestamptz',
    nullable: true,
  })
  revokedAt!: Date | null;

  @Column({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;
}