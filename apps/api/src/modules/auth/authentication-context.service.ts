import { Injectable, UnauthorizedException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { validate as isUuid } from 'uuid';
import { Repository } from 'typeorm';

import { BusinessMembership } from './entities/business-membership.entity';
import { Business } from './entities/business.entity';
import { User } from './entities/user.entity';
import type { AuthenticatedUser } from './types/authenticated-user.type';

@Injectable()
export class AuthenticationContextService {
  constructor(
    @InjectRepository(User)
    private readonly users: Repository<User>,
    @InjectRepository(Business)
    private readonly businesses: Repository<Business>,
    @InjectRepository(BusinessMembership)
    private readonly memberships: Repository<BusinessMembership>,
  ) {}

  async resolve(
    userId: string,
    businessId: string,
  ): Promise<AuthenticatedUser> {
    if (!isUuid(userId) || !isUuid(businessId)) {
      throw new UnauthorizedException('Invalid authentication context');
    }

    const user = await this.users.findOneBy({
      id: userId,
      status: 'active',
    });

    if (!user) {
      throw new UnauthorizedException('User is not active');
    }

    const business = await this.businesses.findOneBy({
      id: businessId,
      status: 'active',
    });

    if (!business) {
      throw new UnauthorizedException('Business is not active');
    }

    const membership = await this.memberships.findOneBy({
      userId,
      businessId,
      status: 'active',
    });

    if (!membership) {
      throw new UnauthorizedException('Business membership required');
    }

    return {
      userId: user.id,
      businessId: business.id,
      role: membership.role,
    };
  }
}
