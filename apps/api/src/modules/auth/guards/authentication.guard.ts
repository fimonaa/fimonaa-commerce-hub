import {
  CanActivate,
  ExecutionContext,
  Injectable,
  InternalServerErrorException,
  UnauthorizedException,
} from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import type { Request } from "express";
import { AuthenticationContextService } from "../authentication-context.service";
import { ROLES_KEY } from "../decorators/roles.decorator";
import { IS_PUBLIC_KEY } from "../decorators/public.decorator";
import { IS_IDENTITY_ONLY_KEY } from "../decorators/identity-only.decorator";
import { JwtVerificationService } from "../jwt-verification.service";
import type { AuthenticatedUser } from "../types/authenticated-user.type";
import type { BusinessRole } from "../entities/business-membership.entity";

type RequestWithUser = Request & {
  user?: AuthenticatedUser | { userId: string };
};

@Injectable()
export class AuthenticationGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly jwtVerification: JwtVerificationService,
    private readonly authenticationContext: AuthenticationContextService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const handler = context.getHandler();
    const controller = context.getClass();

    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      handler,
      controller,
    ]);

    // Identity-only authentication must be explicitly enabled on a method.
    const isIdentityOnly = this.reflector.getAllAndOverride<boolean>(
      IS_IDENTITY_ONLY_KEY,
      [handler],
    );

    const requiredRoles = this.reflector.getAllAndOverride<BusinessRole[]>(
      ROLES_KEY,
      [handler, controller],
    );

    // Reject conflicting authentication configurations.
    if (isIdentityOnly && (isPublic || requiredRoles?.length)) {
      throw new InternalServerErrorException(
        "Conflicting authentication decorators",
      );
    }

    if (isPublic) {
      return true;
    }

    const request = context.switchToHttp().getRequest<RequestWithUser>();

    const authorization = request.headers.authorization;

    if (
      typeof authorization !== "string" ||
      !/^Bearer [^\s]+$/.test(authorization)
    ) {
      throw new UnauthorizedException("Bearer token required");
    }

    const token = authorization.slice("Bearer ".length);

    const payload = await this.jwtVerification.verifyToken(token);
    if (isIdentityOnly) {
      // Verify that the account is still active.
      // Business membership is not required for this authentication mode.
      request.user = await this.authenticationContext.resolveIdentity(
        payload.sub,
      );

      return true;
    }

    const businessId = request.headers["x-business-id"];

    if (typeof businessId !== "string" || !businessId.trim()) {
      throw new UnauthorizedException("Business ID required");
    }

    const authenticatedUser = await this.authenticationContext.resolve(
      payload.sub,
      businessId,
    );

    request.user = authenticatedUser;

    return true;
  }
}
