import { NotFoundException } from '@nestjs/common';
import { Repository } from 'typeorm';

import { BusinessMembership } from '../../auth/entities/business-membership.entity';
import { User } from '../../auth/entities/user.entity';
import { BusinessMembershipsService } from '../business-memberships.service';

describe('BusinessMembershipsService', () => {
  const businessId = '550e8400-e29b-41d4-a716-446655440001';
  const membershipId = '550e8400-e29b-41d4-a716-446655440002';
  const userId = '550e8400-e29b-41d4-a716-446655440003';
  const createdAt = new Date('2026-11-01T10:00:00.000Z');

  const membership: BusinessMembership = {
    id: membershipId,
    businessId,
    userId,
    role: 'admin',
    status: 'active',
    createdAt,
    updatedAt: createdAt,
    removedAt: null,
  };

  const user: User = {
    id: userId,
    email: 'member@example.com',
    passwordHash: null,
    status: 'active',
    createdAt,
    updatedAt: createdAt,
  };

  let service: BusinessMembershipsService;

  let memberships: {
    find: jest.Mock;
    findOneBy: jest.Mock;
  };

  let users: {
    findOneBy: jest.Mock;
    createQueryBuilder: jest.Mock;
  };

  let queryBuilder: {
    where: jest.Mock;
    getMany: jest.Mock;
  };

  beforeEach(() => {
    queryBuilder = {
      where: jest.fn().mockReturnThis(),
      getMany: jest.fn(),
    };

    memberships = {
      find: jest.fn(),
      findOneBy: jest.fn(),
    };

    users = {
      findOneBy: jest.fn(),
      createQueryBuilder: jest.fn().mockReturnValue(queryBuilder),
    };

    service = new BusinessMembershipsService(
      memberships as unknown as Repository<BusinessMembership>,
      users as unknown as Repository<User>,
    );
  });

  it('lists members for the selected business', async () => {
    memberships.find.mockResolvedValue([membership]);
    queryBuilder.getMany.mockResolvedValue([user]);

    const result = await service.listMembers(businessId);

    expect(memberships.find).toHaveBeenCalledWith({
      where: { businessId },
      order: { createdAt: 'ASC', id: 'ASC' },
    });

    expect(queryBuilder.where).toHaveBeenCalledWith(
      'user.id IN (:...userIds)',
      { userIds: [userId] },
    );

    expect(result).toEqual({
      items: [
        {
          id: membershipId,
          userId,
          email: user.email,
          status: 'active',
          role: 'admin',
          membershipStatus: 'active',
          createdAt,
        },
      ],
    });
  });

  it('returns an empty list when no memberships exist', async () => {
    memberships.find.mockResolvedValue([]);

    await expect(service.listMembers(businessId)).resolves.toEqual({
      items: [],
    });

    expect(users.createQueryBuilder).not.toHaveBeenCalled();
  });

  it('returns a membership only within the selected business', async () => {
    memberships.findOneBy.mockResolvedValue(membership);
    users.findOneBy.mockResolvedValue(user);

    const result = await service.getMember(businessId, membershipId);

    expect(memberships.findOneBy).toHaveBeenCalledWith({
      id: membershipId,
      businessId,
    });

    expect(users.findOneBy).toHaveBeenCalledWith({
      id: userId,
    });

    expect(result).toEqual({
      id: membershipId,
      userId,
      email: user.email,
      status: 'active',
      membershipStatus: 'active',
      role: 'admin',
      createdAt,
    });
  });

  it('rejects a membership not found in the selected business', async () => {
    memberships.findOneBy.mockResolvedValue(null);

    await expect(
      service.getMember(businessId, membershipId),
    ).rejects.toThrow(NotFoundException);

    expect(users.findOneBy).not.toHaveBeenCalled();
  });

  it('rejects memberships with missing user records', async () => {
    memberships.findOneBy.mockResolvedValue(membership);
    users.findOneBy.mockResolvedValue(null);

    await expect(
      service.getMember(businessId, membershipId),
    ).rejects.toThrow(NotFoundException);
  });

  it('currently excludes memberships with missing users from lists', async () => {
    memberships.find.mockResolvedValue([membership]);
    queryBuilder.getMany.mockResolvedValue([]);

    await expect(service.listMembers(businessId)).resolves.toEqual({
      items: [],
    });
  });
});