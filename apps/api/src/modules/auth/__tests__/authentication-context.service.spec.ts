import { UnauthorizedException } from '@nestjs/common';
import type { Repository } from 'typeorm';

import { AuthenticationContextService } from '../authentication-context.service';
import { BusinessMembership } from '../entities/business-membership.entity';
import { Business } from '../entities/business.entity';
import { User } from '../entities/user.entity';

describe('AuthenticationContextService', () => {
  const userId = '550e8400-e29b-41d4-a716-446655440000';
  const businessId = '550e8400-e29b-41d4-a716-446655440001';

  const users = {
    findOneBy: jest.fn(),
  };

  const businesses = {
    findOneBy: jest.fn(),
  };

  const memberships = {
    findOneBy: jest.fn(),
  };

  const service = new AuthenticationContextService(
    users as unknown as Repository<User>,
    businesses as unknown as Repository<Business>,
    memberships as unknown as Repository<BusinessMembership>,
  );

  beforeEach(() => {
    jest.resetAllMocks();

    users.findOneBy.mockResolvedValue({
      id: userId,
      status: 'active',
    });

    businesses.findOneBy.mockResolvedValue({
      id: businessId,
      status: 'active',
    });

    memberships.findOneBy.mockResolvedValue({
      userId,
      businessId,
      role: 'inventory_manager',
      status: 'active',
    });
  });

  it('resolves an active user with a valid business membership', async () => {
    await expect(service.resolve(userId, businessId)).resolves.toEqual({
      userId,
      businessId,
      role: 'inventory_manager',
    });

    expect(users.findOneBy).toHaveBeenCalledWith({
      id: userId,
      status: 'active',
    });

    expect(businesses.findOneBy).toHaveBeenCalledWith({
      id: businessId,
      status: 'active',
    });

    expect(memberships.findOneBy).toHaveBeenCalledWith({
      userId,
      businessId,
      status: 'active',
    });
  });

  it('rejects inactive users', async () => {
    users.findOneBy.mockResolvedValue(null);

    await expect(service.resolve(userId, businessId)).rejects.toBeInstanceOf(
      UnauthorizedException,
    );

    expect(memberships.findOneBy).not.toHaveBeenCalled();
  });

  it('rejects suspended or archived businesses', async () => {
    businesses.findOneBy.mockResolvedValue(null);

    await expect(service.resolve(userId, businessId)).rejects.toBeInstanceOf(
      UnauthorizedException,
    );

    expect(memberships.findOneBy).not.toHaveBeenCalled();
  });

  it('rejects users without membership in the requested business', async () => {
    memberships.findOneBy.mockResolvedValue(null);

    await expect(service.resolve(userId, businessId)).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
  });

  it('rejects malformed identifiers before querying the database', async () => {
    await expect(service.resolve('invalid', businessId)).rejects.toBeInstanceOf(
      UnauthorizedException,
    );

    expect(users.findOneBy).not.toHaveBeenCalled();
    expect(businesses.findOneBy).not.toHaveBeenCalled();
    expect(memberships.findOneBy).not.toHaveBeenCalled();
  });

  it('rejects requests without an active business membership', async () => {
    memberships.findOneBy.mockResolvedValue(null);

    await expect(
      service.resolve(userId, businessId),
    ).rejects.toBeInstanceOf(UnauthorizedException);

    expect(memberships.findOneBy).toHaveBeenCalledWith({
      userId,
      businessId,
      status: 'active',
    });
  });

  describe('resolveIdentity', () => {
    it('allows an active user without checking business membership', async () => {
      users.findOneBy.mockResolvedValue({
        id: userId,
        status: 'active',
      } as User);

      await expect(
        service.resolveIdentity(userId),
      ).resolves.toEqual({
        userId,
      });

      expect(users.findOneBy).toHaveBeenCalledWith({
        id: userId,
        status: 'active',
      });

      expect(businesses.findOneBy).not.toHaveBeenCalled();
      expect(memberships.findOneBy).not.toHaveBeenCalled();
    });

    it('rejects users without an active account', async () => {
      users.findOneBy.mockResolvedValue(null);

      await expect(
        service.resolveIdentity(userId),
      ).rejects.toBeInstanceOf(UnauthorizedException);
    });

    it('rejects invalid user identifiers', async () => {
      await expect(
        service.resolveIdentity('invalid-user-id'),
      ).rejects.toBeInstanceOf(UnauthorizedException);

      expect(users.findOneBy).not.toHaveBeenCalled();
    });
  });
});
