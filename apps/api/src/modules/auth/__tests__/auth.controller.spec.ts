import { InvitationPersistenceService } from '../invitation-persistence.service';
import { BadRequestException, UnauthorizedException } from '@nestjs/common';
import { HTTP_CODE_METADATA, ROUTE_ARGS_METADATA } from '@nestjs/common/constants';
import { METHOD_METADATA, PATH_METADATA } from '@nestjs/common/constants';
import { ROLES_KEY } from '../decorators/roles.decorator';
import { AuthenticatedRequest } from '../types/authenticated-user.type';
import { AuthController } from '../auth.controller';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';
import { LoginService } from '../login.service';
import { InvitationAcceptanceService } from '../invitation-acceptance.service';
import { BusinessMembershipInvitationIssuanceService } from '../business-membership-invitation-issuance.service';
import { BusinessMembershipInvitationAcceptanceService } from '../business-membership-invitation-acceptance.service';
import { IS_IDENTITY_ONLY_KEY } from '../decorators/identity-only.decorator';
import type { IdentityAuthenticatedRequest } from '../types/authenticated-user.type';

describe('AuthController', () => {
  const loginResult = {
    accessToken: 'signed-jwt-token',
    tokenType: 'Bearer' as const,
    expiresIn: 900 as const,
  };

  let controller: AuthController;
  let loginService: jest.Mocked<Pick<LoginService, 'login'>>;
  let invitationAcceptanceService: jest.Mocked<
    Pick<InvitationAcceptanceService, 'accept'>
  >;
  let businessMembershipInvitationIssuanceService: jest.Mocked<
    Pick<BusinessMembershipInvitationIssuanceService, 'create'>
  >;
  let businessMembershipInvitationAcceptanceService: jest.Mocked<
    Pick<BusinessMembershipInvitationAcceptanceService, 'accept'>
  >;

  beforeEach(() => {
    loginService = {
      login: jest.fn(),
    };

    invitationAcceptanceService = {
      accept: jest.fn(),
    };
    businessMembershipInvitationIssuanceService = {
      create: jest.fn(),
    };
    businessMembershipInvitationAcceptanceService = {
      accept: jest.fn(),
    };

    controller = new AuthController(
      loginService as unknown as LoginService,
      invitationAcceptanceService as unknown as InvitationAcceptanceService,
      {
        createInvitation: jest.fn(),
      } as unknown as InvitationPersistenceService,
      businessMembershipInvitationIssuanceService as unknown as BusinessMembershipInvitationIssuanceService,
      businessMembershipInvitationAcceptanceService as unknown as BusinessMembershipInvitationAcceptanceService,
    );
  });


  it('delegates invitation acceptance to InvitationAcceptanceService', async () => {
    invitationAcceptanceService.accept.mockResolvedValue(undefined);

    const request = {
      token: 'A'.repeat(43),
      password: 'SecurePassword123!',
    };

    await expect(
      controller.acceptInvitation(request),
    ).resolves.toBeUndefined();

    expect(invitationAcceptanceService.accept).toHaveBeenCalledWith(
      request.token,
      request.password,
    );
  });

  it('propagates invitation acceptance errors', async () => {
    invitationAcceptanceService.accept.mockRejectedValue(
      new BadRequestException('Invalid or expired invitation'),
    );

    await expect(
      controller.acceptInvitation({
        token: 'A'.repeat(43),
        password: 'SecurePassword123!',
      }),
    ).rejects.toThrow(BadRequestException);
  });

  it('marks the invitation acceptance handler as public', () => {
    expect(
      Reflect.getMetadata(IS_PUBLIC_KEY, controller.acceptInvitation),
    ).toBe(true);
  });

  it('declares the invitation acceptance POST route with HTTP 204', () => {
    expect(
      Reflect.getMetadata(PATH_METADATA, controller.acceptInvitation),
    ).toBe('accept-invitation');

    expect(
      Reflect.getMetadata(METHOD_METADATA, controller.acceptInvitation),
    ).toBe(1);

    expect(
      Reflect.getMetadata(HTTP_CODE_METADATA, controller.acceptInvitation),
    ).toBe(204);

    expect(
      Reflect.getMetadata(
        ROUTE_ARGS_METADATA,
        AuthController,
        'acceptInvitation',
      ),
    ).toBeDefined();
  });

  it('delegates credentials to LoginService', async () => {
    loginService.login.mockResolvedValue(loginResult);

    await expect(
      controller.login({
        email: 'admin@example.com',
        password: 'SecurePassword123!',
      }),
    ).resolves.toEqual(loginResult);

    expect(loginService.login).toHaveBeenCalledWith(
      'admin@example.com',
      'SecurePassword123!',
    );
  });

  it('propagates invalid credential errors', async () => {
    loginService.login.mockRejectedValue(
      new UnauthorizedException('Invalid email or password'),
    );

    await expect(
      controller.login({
        email: 'admin@example.com',
        password: 'incorrect',
      }),
    ).rejects.toThrow(UnauthorizedException);
  });

  it('marks only the login handler as public', () => {
    expect(Reflect.getMetadata(IS_PUBLIC_KEY, controller.login)).toBe(true);
    expect(Reflect.getMetadata(IS_PUBLIC_KEY, AuthController)).toBeUndefined();
  });

  it('declares the expected controller and login route', () => {
    expect(Reflect.getMetadata(PATH_METADATA, AuthController)).toBe('auth');
    expect(
      Reflect.getMetadata(PATH_METADATA, controller.login),
    ).toBe('login');
    expect(
      Reflect.getMetadata(METHOD_METADATA, controller.login),
    ).toBe(1);
    expect(
      Reflect.getMetadata(ROUTE_ARGS_METADATA, AuthController, 'login'),
    ).toBeDefined();
  });

  it('uses authenticated business and user IDs when issuing a membership invitation', async () => {
    const request = {
      email: 'employee@example.com',
      role: 'operator' as const,
    };

    const authenticatedRequest = {
      user: {
        userId: '11111111-1111-4111-8111-111111111111',
        businessId: '22222222-2222-4222-8222-222222222222',
        role: 'admin',
      },
    } as AuthenticatedRequest;

    const result = {
      invitationId: '33333333-3333-4333-8333-333333333333',
      businessId: authenticatedRequest.user.businessId,
      invitedEmail: request.email,
      role: request.role,
      expiresAt: new Date('2026-11-22T12:00:00.000Z'),
      token: 'secure-invitation-token',
    };

    businessMembershipInvitationIssuanceService.create.mockResolvedValue(
      result,
    );

    await expect(
      controller.createBusinessMembershipInvitation(
        request,
        authenticatedRequest,
      ),
    ).resolves.toEqual(result);

    expect(
      businessMembershipInvitationIssuanceService.create,
    ).toHaveBeenCalledTimes(1);

    expect(
      businessMembershipInvitationIssuanceService.create,
    ).toHaveBeenCalledWith(
      authenticatedRequest.user.businessId,
      authenticatedRequest.user.userId,
      request.email,
      request.role,
    );
  });

  it('requires owner or admin permissions for membership invitations', () => {
    const handler = controller.createBusinessMembershipInvitation;

    expect(
      Reflect.getMetadata(ROLES_KEY, handler),
    ).toEqual(['owner', 'admin']);

    expect(
      Reflect.getMetadata(IS_PUBLIC_KEY, handler),
    ).not.toBe(true);
  });

  it('declares the membership invitation endpoint with HTTP 201', () => {
    const handler = controller.createBusinessMembershipInvitation;

    expect(
      Reflect.getMetadata(PATH_METADATA, handler),
    ).toBe('business-membership-invitations');

    expect(
      Reflect.getMetadata(METHOD_METADATA, handler),
    ).toBe(1);

    expect(
      Reflect.getMetadata(HTTP_CODE_METADATA, handler),
    ).toBe(201);

    expect(
      Reflect.getMetadata(
        ROUTE_ARGS_METADATA,
        AuthController,
        'createBusinessMembershipInvitation',
      ),
    ).toBeDefined();
  });

  it('propagates membership invitation issuance errors', async () => {
    const authenticatedRequest = {
      user: {
        userId: '11111111-1111-4111-8111-111111111111',
        businessId: '22222222-2222-4222-8222-222222222222',
        role: 'admin',
      },
    } as AuthenticatedRequest;

    businessMembershipInvitationIssuanceService.create.mockRejectedValue(
      new BadRequestException('Invitation could not be issued'),
    );

    await expect(
      controller.createBusinessMembershipInvitation(
        {
          email: 'employee@example.com',
          role: 'viewer',
        },
        authenticatedRequest,
      ),
    ).rejects.toThrow(BadRequestException);
  });

  it('accepts a business membership invitation using the authenticated user identity', async () => {
    const authenticatedRequest: IdentityAuthenticatedRequest = {
      user: {
        userId: '11111111-1111-4111-8111-111111111111',
      },
    };

    const token = 'A'.repeat(43);

    const result = {
      membershipId: '33333333-3333-4333-8333-333333333333',
      businessId: '22222222-2222-4222-8222-222222222222',
      role: 'operator' as const,
      status: 'active' as const,
    };

    businessMembershipInvitationAcceptanceService.accept.mockResolvedValue(
      result,
    );

    await expect(
      controller.acceptBusinessMembershipInvitation(
        { token },
        authenticatedRequest,
      ),
    ).resolves.toEqual(result);

    expect(
      businessMembershipInvitationAcceptanceService.accept,
    ).toHaveBeenCalledTimes(1);

    expect(
      businessMembershipInvitationAcceptanceService.accept,
    ).toHaveBeenCalledWith(
      token,
      authenticatedRequest.user.userId,
    );
  });

  it('requires identity-only authentication for membership invitation acceptance', () => {
    const handler = controller.acceptBusinessMembershipInvitation;

    expect(
      Reflect.getMetadata(IS_IDENTITY_ONLY_KEY, handler),
    ).toBe(true);

    expect(
      Reflect.getMetadata(IS_PUBLIC_KEY, handler),
    ).not.toBe(true);

    expect(
      Reflect.getMetadata(ROLES_KEY, handler),
    ).toBeUndefined();
  });

  it('declares the membership invitation acceptance endpoint with HTTP 201', () => {
    const handler = controller.acceptBusinessMembershipInvitation;

    expect(
      Reflect.getMetadata(PATH_METADATA, handler),
    ).toBe('business-membership-invitations/accept');

    expect(
      Reflect.getMetadata(METHOD_METADATA, handler),
    ).toBe(1);

    expect(
      Reflect.getMetadata(HTTP_CODE_METADATA, handler),
    ).toBe(201);

    expect(
      Reflect.getMetadata(
        ROUTE_ARGS_METADATA,
        AuthController,
        'acceptBusinessMembershipInvitation',
      ),
    ).toBeDefined();
  });

  it('propagates business membership invitation acceptance errors', async () => {
    const authenticatedRequest: IdentityAuthenticatedRequest = {
      user: {
        userId: '11111111-1111-4111-8111-111111111111',
      },
    };

    businessMembershipInvitationAcceptanceService.accept.mockRejectedValue(
      new BadRequestException('Invalid or expired membership invitation'),
    );

    await expect(
      controller.acceptBusinessMembershipInvitation(
        { token: 'A'.repeat(43) },
        authenticatedRequest,
      ),
    ).rejects.toThrow(BadRequestException);
  });
});
