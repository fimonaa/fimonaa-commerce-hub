import {
  IsEmail,
  IsIn,
  IsString,
  MaxLength,
} from 'class-validator';
import { Transform } from 'class-transformer';

import type { BusinessInvitationRole } from '../entities/business-membership-invitation.entity';

export const BUSINESS_INVITATION_ROLES = [
  'admin',
  'inventory_manager',
  'operator',
  'viewer',
] as const satisfies readonly BusinessInvitationRole[];

export class CreateBusinessMembershipInvitationDto {
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string'
      ? value.trim().toLowerCase()
      : value,
  )
  @IsString()
  @IsEmail()
  @MaxLength(254)
  email!: string;

  @IsIn(BUSINESS_INVITATION_ROLES)
  role!: BusinessInvitationRole;
}
