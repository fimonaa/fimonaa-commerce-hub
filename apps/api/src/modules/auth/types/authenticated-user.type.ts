import type { BusinessRole } from '../entities/business-membership.entity';

export interface AuthenticatedUser {
  userId: string;
  businessId: string;
  role: BusinessRole;
}

export interface AuthenticatedRequest {
  user: AuthenticatedUser;
}
