import { InvitationPersistenceService } from '../invitation-persistence.service';
import { BadRequestException, UnauthorizedException } from '@nestjs/common';
import { HTTP_CODE_METADATA, ROUTE_ARGS_METADATA } from '@nestjs/common/constants';
import { METHOD_METADATA, PATH_METADATA } from '@nestjs/common/constants';

import { AuthController } from '../auth.controller';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';
import { LoginService } from '../login.service';
import { InvitationAcceptanceService } from '../invitation-acceptance.service';

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

  beforeEach(() => {
    loginService = {
      login: jest.fn(),
    };

    invitationAcceptanceService = {
      accept: jest.fn(),
    };

    controller = new AuthController(
      loginService as unknown as LoginService,
      invitationAcceptanceService as unknown as InvitationAcceptanceService,
      {
        createInvitation: jest.fn(),
      } as unknown as InvitationPersistenceService,
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
});
