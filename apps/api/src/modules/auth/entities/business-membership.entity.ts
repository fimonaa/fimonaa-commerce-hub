import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

export type BusinessRole =
  | 'owner'
  | 'admin'
  | 'inventory_manager'
  | 'operator'
  | 'viewer';

export type BusinessMembershipStatus =
  | 'pending'
  | 'active'
  | 'suspended'
  | 'removed';

@Entity({ name: 'business_memberships' })
export class BusinessMembership {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'business_id', type: 'uuid' })
  businessId!: string;

  @Column({ name: 'user_id', type: 'uuid' })
  userId!: string;

  @Column({ type: 'varchar', length: 30 })
  role!: BusinessRole;

  @Column({ type: 'varchar', length: 20, default: 'active' })
  status!: BusinessMembershipStatus;

  @Column({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @Column({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;

  @Column({
    name: 'removed_at',
    type: 'timestamptz',
    nullable: true,
  })
  removedAt!: Date | null;
}
