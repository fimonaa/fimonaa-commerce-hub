import type {
  BusinessRole,
  BusinessMembershipStatus,
} from '../../auth/entities/business-membership.entity';

import type { UserStatus } from '../../auth/entities/user.entity';

export interface BusinessMember {
  id: string;
  userId: string;
  email: string;
  status: UserStatus;
  membershipStatus: BusinessMembershipStatus;
  role: BusinessRole;
  createdAt: Date;
}

export interface BusinessMembersResponse {
  items: BusinessMember[];
}