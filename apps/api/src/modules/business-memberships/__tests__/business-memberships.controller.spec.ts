import { UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';

import { ROLES_KEY } from '../../auth/decorators/roles.decorator';
import type { AuthenticatedRequest } from '../../auth/types/authenticated-user.type';
import { BusinessMembershipsController } from '../business-memberships.controller';
import { BusinessMembershipsService } from '../business-memberships.service';

describe('BusinessMembershipsController', () => {
  const businessId = '550e8400-e29b-41d4-a716-446655440001';
  const otherBusinessId = '550e8400-e29b-41d4-a716-446655440002';
  const membershipId = '550e8400-e29b-41d4-a716-446655440003';

  let controller: BusinessMembershipsController;
  let service: jest.Mocked<
    Pick<BusinessMembershipsService, 'listMembers' | 'getMember'>
  >;

  const createRequest = (
    selectedBusinessId: string,
  ): AuthenticatedRequest => ({
    user: {
      userId: '550e8400-e29b-41d4-a716-446655440000',
      businessId: selectedBusinessId,
      role: 'admin',
    },
  });

  beforeEach(() => {
    service = {
      listMembers: jest.fn(),
      getMember: jest.fn(),
    };

    controller = new BusinessMembershipsController(
      service as unknown as BusinessMembershipsService,
    );
  });

  it('passes the authenticated business ID to the list service', async () => {
    const expected = { items: [] };
    service.listMembers.mockResolvedValue(expected);

    const result = await controller.listMembers(createRequest(businessId));

    expect(service.listMembers).toHaveBeenCalledWith(businessId);
    expect(result).toEqual(expected);
  });

  it('uses the selected authenticated business', async () => {
    service.listMembers.mockResolvedValue({ items: [] });

    await controller.listMembers(createRequest(otherBusinessId));

    expect(service.listMembers).toHaveBeenCalledWith(otherBusinessId);
    expect(service.listMembers).not.toHaveBeenCalledWith(businessId);
  });

  it('rejects listing without authenticated business context', () => {
    expect(() =>
      controller.listMembers({} as AuthenticatedRequest),
    ).toThrow(UnauthorizedException);

    expect(service.listMembers).not.toHaveBeenCalled();
  });

  it('passes business and membership IDs to the detail service', async () => {
    const expected = {
      id: membershipId,
      userId: '550e8400-e29b-41d4-a716-446655440000',
      email: 'member@example.com',
      status: 'active' as const,
      role: 'admin' as const,
      createdAt: new Date('2026-11-01T10:00:00.000Z'),
    };

    service.getMember.mockResolvedValue(expected);

    const result = await controller.getMember(
      createRequest(businessId),
      membershipId,
    );

    expect(service.getMember).toHaveBeenCalledWith(
      businessId,
      membershipId,
    );
    expect(result).toEqual(expected);
  });

  it('rejects member details without authenticated business context', () => {
    expect(() =>
      controller.getMember({} as AuthenticatedRequest, membershipId),
    ).toThrow(UnauthorizedException);

    expect(service.getMember).not.toHaveBeenCalled();
  });

  it('restricts the controller to owner and admin roles', () => {
    const reflector = new Reflector();

    const roles = reflector.get<string[]>(
      ROLES_KEY,
      BusinessMembershipsController,
    );

    expect(roles).toEqual(['owner', 'admin']);
  });
});
