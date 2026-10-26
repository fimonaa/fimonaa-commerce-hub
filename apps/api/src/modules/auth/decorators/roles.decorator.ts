import { SetMetadata } from '@nestjs/common';

import type { BusinessRole } from '../entities/business-membership.entity';

export const ROLES_KEY = 'required_business_roles';

export const Roles = (...roles: BusinessRole[]) =>
  SetMetadata(ROLES_KEY, roles);
