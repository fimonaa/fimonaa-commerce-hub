import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Request } from 'express';

import { AuthenticationContextService } from '../authentication-context.service';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';
import { JwtVerificationService } from '../jwt-verification.service';
import type { AuthenticatedUser } from '../types/authenticated-user.type';

type RequestWithUser = Request & {
  user?: AuthenticatedUser;
};

@Injectable()
export class AuthenticationGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly jwtVerification: JwtVerificationService,
    private readonly authenticationContext: AuthenticationContextService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(
      IS_PUBLIC_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (isPublic) {
      return true;
    }

    const request = context.switchToHttp().getRequest<RequestWithUser>();

    const authorization = request.headers.authorization;

    if (
      typeof authorization !== 'string' ||
      !/^Bearer [^\s]+$/.test(authorization)
    ) {
      throw new UnauthorizedException('Bearer token required');
    }

    const token = authorization.slice('Bearer '.length);

    const payload = await this.jwtVerification.verifyToken(token);

    const businessId = request.headers['x-business-id'];

    if (typeof businessId !== 'string' || !businessId.trim()) {
      throw new UnauthorizedException('Business ID required');
    }

    const authenticatedUser = await this.authenticationContext.resolve(
      payload.sub,
      businessId,
    );

    request.user = authenticatedUser;

    return true;
  }
}
