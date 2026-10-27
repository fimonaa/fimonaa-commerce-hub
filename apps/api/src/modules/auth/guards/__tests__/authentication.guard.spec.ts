import { ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';

import { AuthenticationGuard } from '../authentication.guard';
import { AuthenticationContextService } from '../../authentication-context.service';
import { IS_PUBLIC_KEY } from '../../decorators/public.decorator';
import { JwtVerificationService } from '../../jwt-verification.service';

describe('AuthenticationGuard', () => {
  const userId = '550e8400-e29b-41d4-a716-446655440000';
  const businessId = '550e8400-e29b-41d4-a716-446655440001';

  const authenticatedUser = {
    userId,
    businessId,
    role: 'inventory_manager' as const,
  };

  let guard: AuthenticationGuard;
  let reflector: jest.Mocked<Pick<Reflector, 'getAllAndOverride'>>;

  const jwtVerification = {
    verifyToken: jest.fn(),
  };

  const authenticationContext = {
    resolve: jest.fn(),
  };

  const createContext = (
    headers: Record<string, string | string[]> = {},
  ): { context: ExecutionContext; request: { headers: typeof headers; user?: typeof authenticatedUser } } => {
    const request: {
      headers: typeof headers;
      user?: typeof authenticatedUser;
    } = { headers };

    const context = {
      getHandler: jest.fn(),
      getClass: jest.fn(),
      switchToHttp: jest.fn().mockReturnValue({
        getRequest: jest.fn().mockReturnValue(request),
      }),
    } as unknown as ExecutionContext;

    return { context, request };
  };

  beforeEach(() => {
    jest.resetAllMocks();

    reflector = {
      getAllAndOverride: jest.fn().mockReturnValue(false),
    };

    jwtVerification.verifyToken.mockResolvedValue({ sub: userId });
    authenticationContext.resolve.mockResolvedValue(authenticatedUser);

    guard = new AuthenticationGuard(
      reflector as unknown as Reflector,
      jwtVerification as unknown as JwtVerificationService,
      authenticationContext as unknown as AuthenticationContextService,
    );
  });

  it('allows routes explicitly marked public', async () => {
    reflector.getAllAndOverride.mockReturnValue(true);

    const { context } = createContext();

    await expect(guard.canActivate(context)).resolves.toBe(true);

    expect(reflector.getAllAndOverride).toHaveBeenCalledWith(
      IS_PUBLIC_KEY,
      expect.any(Array),
    );

    expect(jwtVerification.verifyToken).not.toHaveBeenCalled();
    expect(authenticationContext.resolve).not.toHaveBeenCalled();
  });

  it('rejects protected requests without credentials', async () => {
    const { context } = createContext();

    await expect(guard.canActivate(context)).rejects.toThrow(
      UnauthorizedException,
    );

    expect(jwtVerification.verifyToken).not.toHaveBeenCalled();
  });

  it('rejects malformed Bearer tokens', async () => {
    const { context } = createContext({
      authorization: 'Basic credentials',
    });

    await expect(guard.canActivate(context)).rejects.toThrow(
      UnauthorizedException,
    );

    expect(jwtVerification.verifyToken).not.toHaveBeenCalled();
  });

  it('rejects invalid JWTs', async () => {
    jwtVerification.verifyToken.mockRejectedValue(
      new UnauthorizedException('Invalid token'),
    );

    const { context } = createContext({
      authorization: 'Bearer invalid-token',
      'x-business-id': businessId,
    });

    await expect(guard.canActivate(context)).rejects.toThrow(
      UnauthorizedException,
    );

    expect(authenticationContext.resolve).not.toHaveBeenCalled();
  });

  it('rejects requests without a business ID', async () => {
    const { context } = createContext({
      authorization: 'Bearer valid-token',
    });

    await expect(guard.canActivate(context)).rejects.toThrow(
      UnauthorizedException,
    );

    expect(authenticationContext.resolve).not.toHaveBeenCalled();
  });

  it('rejects requests without business membership', async () => {
    authenticationContext.resolve.mockRejectedValue(
      new UnauthorizedException('Business membership required'),
    );

    const { context, request } = createContext({
      authorization: 'Bearer valid-token',
      'x-business-id': businessId,
    });

    await expect(guard.canActivate(context)).rejects.toThrow(
      UnauthorizedException,
    );

    expect(authenticationContext.resolve).toHaveBeenCalledWith(
      userId,
      businessId,
    );

    expect(request.user).toBeUndefined();
  });

  it('attaches verified business context to authenticated requests', async () => {
    const { context, request } = createContext({
      authorization: 'Bearer valid-token',
      'x-business-id': businessId,
    });

    await expect(guard.canActivate(context)).resolves.toBe(true);

    expect(jwtVerification.verifyToken).toHaveBeenCalledWith(
      'valid-token',
    );

    expect(authenticationContext.resolve).toHaveBeenCalledWith(
      userId,
      businessId,
    );

    expect(request.user).toEqual(authenticatedUser);
  });

  it('rejects multiple business identifiers', async () => {
    const { context } = createContext({
      authorization: 'Bearer valid-token',
      'x-business-id': [businessId, businessId],
    });

    await expect(guard.canActivate(context)).rejects.toThrow(
      UnauthorizedException,
    );

    expect(authenticationContext.resolve).not.toHaveBeenCalled();
  });
});
