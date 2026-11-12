import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { BusinessMembership } from '../auth/entities/business-membership.entity';
import { User } from '../auth/entities/user.entity';

import type {
  BusinessMember,
  BusinessMembersResponse,
} from './types/business-membership.types';

@Injectable()
export class BusinessMembershipsService {
  constructor(
    @InjectRepository(BusinessMembership)
    private readonly memberships: Repository<BusinessMembership>,

    @InjectRepository(User)
    private readonly users: Repository<User>,
  ) {}

  async listMembers(
    businessId: string,
  ): Promise<BusinessMembersResponse> {
    const memberships = await this.memberships.find({
      where: { businessId },
      order: { createdAt: 'ASC', id: 'ASC' },
    });

    const userIds = memberships.map((membership) => membership.userId);

    if (userIds.length === 0) {
      return { items: [] };
    }

    const users = await this.users
      .createQueryBuilder('user')
      .where('user.id IN (:...userIds)', { userIds })
      .getMany();

    const usersById = new Map(users.map((user) => [user.id, user]));

    const items: BusinessMember[] = memberships.flatMap((membership) => {
      const user = usersById.get(membership.userId);

      if (!user) {
        return [];
      }

      return [
        {
          id: membership.id,
          userId: membership.userId,
          email: user.email,
          status: user.status,
          role: membership.role,
          createdAt: membership.createdAt,
        },
      ];
    });

    return { items };
  }

  async getMember(
    businessId: string,
    membershipId: string,
  ): Promise<BusinessMember> {
    const membership = await this.memberships.findOneBy({
      id: membershipId,
      businessId,
    });

    if (!membership) {
      throw new NotFoundException('Business membership not found');
    }

    const user = await this.users.findOneBy({
      id: membership.userId,
    });

    if (!user) {
      throw new NotFoundException('Business membership not found');
    }

    return {
      id: membership.id,
      userId: membership.userId,
      email: user.email,
      status: user.status,
      role: membership.role,
      createdAt: membership.createdAt,
    };
  }
}