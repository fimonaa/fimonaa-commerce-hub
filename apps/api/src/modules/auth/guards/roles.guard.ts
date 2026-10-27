import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';

import { ROLES_KEY } from '../decorators/roles.decorator';
import type { BusinessRole } from '../entities/business-membership.entity';
import type { AuthenticatedRequest } from '../types/authenticated-user.type';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<BusinessRole[]>(
      ROLES_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!requiredRoles || requiredRoles.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const authenticatedUser = request.user;

    if (!authenticatedUser?.userId || !authenticatedUser.businessId) {
      throw new UnauthorizedException('Authentication required');
    }

    if (!requiredRoles.includes(authenticatedUser.role)) {
      throw new ForbiddenException(
        'Insufficient permissions for this operation',
      );
    }

    return true;
  }
}
