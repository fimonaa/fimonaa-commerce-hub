import {
  ExecutionContext,
  ForbiddenException,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';

import { RolesGuard } from '../roles.guard';
import { ROLES_KEY } from '../../decorators/roles.decorator';
import type { BusinessRole } from '../../entities/business-membership.entity';
import type { AuthenticatedUser } from '../../types/authenticated-user.type';

describe('RolesGuard', () => {
  const userId = '550e8400-e29b-41d4-a716-446655440000';
  const businessId = '550e8400-e29b-41d4-a716-446655440001';

  const reflector = {
    getAllAndOverride: jest.fn(),
  };

  const guard = new RolesGuard(reflector as unknown as Reflector);

  const createContext = (user?: AuthenticatedUser): ExecutionContext =>
    ({
      getHandler: jest.fn(),
      getClass: jest.fn(),
      switchToHttp: jest.fn().mockReturnValue({
        getRequest: jest.fn().mockReturnValue({ user }),
      }),
    }) as unknown as ExecutionContext;

  const createUser = (role: BusinessRole): AuthenticatedUser => ({
    userId,
    businessId,
    role,
  });

  beforeEach(() => {
    jest.resetAllMocks();
  });

  it('allows endpoints without role restrictions', () => {
    reflector.getAllAndOverride.mockReturnValue(undefined);

    expect(guard.canActivate(createContext())).toBe(true);
    expect(reflector.getAllAndOverride).toHaveBeenCalledWith(
      ROLES_KEY,
      expect.any(Array),
    );
  });

  it('allows owners to access owner-restricted endpoints', () => {
    reflector.getAllAndOverride.mockReturnValue(['owner']);

    expect(guard.canActivate(createContext(createUser('owner')))).toBe(true);
  });

  it('allows inventory managers when their role is permitted', () => {
    reflector.getAllAndOverride.mockReturnValue([
      'owner',
      'admin',
      'inventory_manager',
    ]);

    expect(
      guard.canActivate(createContext(createUser('inventory_manager'))),
    ).toBe(true);
  });

  it('rejects viewers from inventory modification endpoints', () => {
    reflector.getAllAndOverride.mockReturnValue([
      'owner',
      'admin',
      'inventory_manager',
    ]);

    expect(() =>
      guard.canActivate(createContext(createUser('viewer'))),
    ).toThrow(ForbiddenException);
  });

  it('rejects operators when their role is not permitted', () => {
    reflector.getAllAndOverride.mockReturnValue(['owner', 'admin']);

    expect(() =>
      guard.canActivate(createContext(createUser('operator'))),
    ).toThrow(ForbiddenException);
  });

  it('rejects requests without authenticated context', () => {
    reflector.getAllAndOverride.mockReturnValue(['owner']);

    expect(() => guard.canActivate(createContext())).toThrow(
      UnauthorizedException,
    );
  });

  it('rejects incomplete authenticated context', () => {
    reflector.getAllAndOverride.mockReturnValue(['owner']);

    const incompleteUser = {
      userId,
      businessId: '',
      role: 'owner',
    } as AuthenticatedUser;

    expect(() =>
      guard.canActivate(createContext(incompleteUser)),
    ).toThrow(UnauthorizedException);
  });
});
