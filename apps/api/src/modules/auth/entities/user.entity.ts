import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

export type UserStatus = 'invited' | 'active' | 'disabled';

@Entity({ name: 'users' })
export class User {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar', length: 254 })
  email!: string;

  @Column({ name: 'password_hash', type: 'text', nullable: true, select: false })
  passwordHash!: string | null;

  @Column({ type: 'varchar', length: 20, default: 'invited' })
  status!: UserStatus;

  @Column({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @Column({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;
}
