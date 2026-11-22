import { IsIn } from "class-validator";

import type { BusinessRole } from "../../auth/entities/business-membership.entity";

export const ASSIGNABLE_BUSINESS_ROLES = [
  "admin",
  "inventory_manager",
  "operator",
  "viewer",
] as const satisfies readonly BusinessRole[];

export class UpdateBusinessMembershipRoleDto {
  @IsIn(ASSIGNABLE_BUSINESS_ROLES)
  role!: (typeof ASSIGNABLE_BUSINESS_ROLES)[number];
}
