import type { BusinessRole } from "../types/auth.types";

/**
 * Human-readable labels for workspace membership roles.
 *
 * This mapping is shared by workspace selection, navigation,
 * and account controls to keep role names consistent.
 *
 * Record<BusinessRole, string> ensures TypeScript reports
 * an error if a new role is introduced without a label.
 */
export const BUSINESS_ROLE_LABELS: Record<BusinessRole, string> = {
  owner: "Owner",
  admin: "Administrator",
  inventory_manager: "Inventory Manager",
  operator: "Operator",
  viewer: "Viewer",
};

/**
 * Returns the display label for an authorized business role.
 */
export function getBusinessRoleLabel(role: BusinessRole): string {
  return BUSINESS_ROLE_LABELS[role];
}
