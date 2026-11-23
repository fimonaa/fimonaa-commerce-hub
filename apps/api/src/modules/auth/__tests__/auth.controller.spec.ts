import { InvitationPersistenceService } from "../invitation-persistence.service";
import { BadRequestException, UnauthorizedException } from "@nestjs/common";
import {
  HTTP_CODE_METADATA,
  ROUTE_ARGS_METADATA,
} from "@nestjs/common/constants";
import { METHOD_METADATA, PATH_METADATA } from "@nestjs/common/constants";
import { ROLES_KEY } from "../decorators/roles.decorator";
import { AuthenticatedRequest } from "../types/authenticated-user.type";
import { AuthController } from "../auth.controller";
import { IS_PUBLIC_KEY } from "../decorators/public.decorator";
import { LoginService } from "../login.service";
import { InvitationAcceptanceService } from "../invitation-acceptance.service";
import { BusinessMembershipInvitationIssuanceService } from "../business-membership-invitation-issuance.service";
import { BusinessMembershipInvitationAcceptanceService } from "../business-membership-invitation-acceptance.service";
import { IS_IDENTITY_ONLY_KEY } from "../decorators/identity-only.decorator";
import type { IdentityAuthenticatedRequest } from "../types/authenticated-user.type";
import { BusinessMembershipInvitationManagementService } from "../business-membership-invitation-management.service";
import { MyBusinessesService } from "../my-businesses.service";

describe("AuthController", () => {
  const loginResult = {
    accessToken: "signed-jwt-token",
    tokenType: "Bearer" as const,
    expiresIn: 900 as const,
  };

  let controller: AuthController;
  let loginService: jest.Mocked<Pick<LoginService, "login">>;
  let invitationAcceptanceService: jest.Mocked<
    Pick<InvitationAcceptanceService, "accept">
  >;
  let businessMembershipInvitationIssuanceService: jest.Mocked<
    Pick<BusinessMembershipInvitationIssuanceService, "create">
  >;
  let businessMembershipInvitationAcceptanceService: jest.Mocked<
    Pick<BusinessMembershipInvitationAcceptanceService, "accept">
  >;
  let businessMembershipInvitationManagementService: jest.Mocked<
    Pick<
      BusinessMembershipInvitationManagementService,
      "list" | "getById" | "revoke"
    >
  >;

  let myBusinessesService: jest.Mocked<Pick<MyBusinessesService, "list">>;

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

    businessMembershipInvitationManagementService = {
      list: jest.fn(),
      getById: jest.fn(),
      revoke: jest.fn(),
    };

    myBusinessesService = {
      list: jest.fn(),
    };

    controller = new AuthController(
      loginService as unknown as LoginService,
      invitationAcceptanceService as unknown as InvitationAcceptanceService,
      {
        createInvitation: jest.fn(),
      } as unknown as InvitationPersistenceService,
      businessMembershipInvitationIssuanceService as unknown as BusinessMembershipInvitationIssuanceService,
      businessMembershipInvitationAcceptanceService as unknown as BusinessMembershipInvitationAcceptanceService,
      businessMembershipInvitationManagementService as unknown as BusinessMembershipInvitationManagementService,
      myBusinessesService as unknown as MyBusinessesService,
    );
  });

  it("delegates invitation acceptance to InvitationAcceptanceService", async () => {
    invitationAcceptanceService.accept.mockResolvedValue(undefined);

    const request = {
      token: "A".repeat(43),
      password: "SecurePassword123!",
    };

    await expect(controller.acceptInvitation(request)).resolves.toBeUndefined();

    expect(invitationAcceptanceService.accept).toHaveBeenCalledWith(
      request.token,
      request.password,
    );
  });

  it("propagates invitation acceptance errors", async () => {
    invitationAcceptanceService.accept.mockRejectedValue(
      new BadRequestException("Invalid or expired invitation"),
    );

    await expect(
      controller.acceptInvitation({
        token: "A".repeat(43),
        password: "SecurePassword123!",
      }),
    ).rejects.toThrow(BadRequestException);
  });

  it("marks the invitation acceptance handler as public", () => {
    expect(
      Reflect.getMetadata(IS_PUBLIC_KEY, controller.acceptInvitation),
    ).toBe(true);
  });

  it("declares the invitation acceptance POST route with HTTP 204", () => {
    expect(
      Reflect.getMetadata(PATH_METADATA, controller.acceptInvitation),
    ).toBe("accept-invitation");

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
        "acceptInvitation",
      ),
    ).toBeDefined();
  });

  it("delegates credentials to LoginService", async () => {
    loginService.login.mockResolvedValue(loginResult);

    await expect(
      controller.login({
        email: "admin@example.com",
        password: "SecurePassword123!",
      }),
    ).resolves.toEqual(loginResult);

    expect(loginService.login).toHaveBeenCalledWith(
      "admin@example.com",
      "SecurePassword123!",
    );
  });

  it("propagates invalid credential errors", async () => {
    loginService.login.mockRejectedValue(
      new UnauthorizedException("Invalid email or password"),
    );

    await expect(
      controller.login({
        email: "admin@example.com",
        password: "incorrect",
      }),
    ).rejects.toThrow(UnauthorizedException);
  });

  it("marks only the login handler as public", () => {
    expect(Reflect.getMetadata(IS_PUBLIC_KEY, controller.login)).toBe(true);
    expect(Reflect.getMetadata(IS_PUBLIC_KEY, AuthController)).toBeUndefined();
  });

  it("declares the expected controller and login route", () => {
    expect(Reflect.getMetadata(PATH_METADATA, AuthController)).toBe("auth");
    expect(Reflect.getMetadata(PATH_METADATA, controller.login)).toBe("login");
    expect(Reflect.getMetadata(METHOD_METADATA, controller.login)).toBe(1);
    expect(
      Reflect.getMetadata(ROUTE_ARGS_METADATA, AuthController, "login"),
    ).toBeDefined();
  });

  it("uses authenticated business and user IDs when issuing a membership invitation", async () => {
    const request = {
      email: "employee@example.com",
      role: "operator" as const,
    };

    const authenticatedRequest = {
      user: {
        userId: "11111111-1111-4111-8111-111111111111",
        businessId: "22222222-2222-4222-8222-222222222222",
        role: "admin",
      },
    } as AuthenticatedRequest;

    const result = {
      invitationId: "33333333-3333-4333-8333-333333333333",
      businessId: authenticatedRequest.user.businessId,
      invitedEmail: request.email,
      role: request.role,
      expiresAt: new Date("2026-11-22T12:00:00.000Z"),
      token: "secure-invitation-token",
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

  it("requires owner or admin permissions for membership invitations", () => {
    const handler = controller.createBusinessMembershipInvitation;

    expect(Reflect.getMetadata(ROLES_KEY, handler)).toEqual(["owner", "admin"]);

    expect(Reflect.getMetadata(IS_PUBLIC_KEY, handler)).not.toBe(true);
  });

  it("declares the membership invitation endpoint with HTTP 201", () => {
    const handler = controller.createBusinessMembershipInvitation;

    expect(Reflect.getMetadata(PATH_METADATA, handler)).toBe(
      "business-membership-invitations",
    );

    expect(Reflect.getMetadata(METHOD_METADATA, handler)).toBe(1);

    expect(Reflect.getMetadata(HTTP_CODE_METADATA, handler)).toBe(201);

    expect(
      Reflect.getMetadata(
        ROUTE_ARGS_METADATA,
        AuthController,
        "createBusinessMembershipInvitation",
      ),
    ).toBeDefined();
  });

  it("propagates membership invitation issuance errors", async () => {
    const authenticatedRequest = {
      user: {
        userId: "11111111-1111-4111-8111-111111111111",
        businessId: "22222222-2222-4222-8222-222222222222",
        role: "admin",
      },
    } as AuthenticatedRequest;

    businessMembershipInvitationIssuanceService.create.mockRejectedValue(
      new BadRequestException("Invitation could not be issued"),
    );

    await expect(
      controller.createBusinessMembershipInvitation(
        {
          email: "employee@example.com",
          role: "viewer",
        },
        authenticatedRequest,
      ),
    ).rejects.toThrow(BadRequestException);
  });

  it("accepts a business membership invitation using the authenticated user identity", async () => {
    const authenticatedRequest: IdentityAuthenticatedRequest = {
      user: {
        userId: "11111111-1111-4111-8111-111111111111",
      },
    };

    const token = "A".repeat(43);

    const result = {
      membershipId: "33333333-3333-4333-8333-333333333333",
      businessId: "22222222-2222-4222-8222-222222222222",
      role: "operator" as const,
      status: "active" as const,
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
    ).toHaveBeenCalledWith(token, authenticatedRequest.user.userId);
  });

  it("requires identity-only authentication for membership invitation acceptance", () => {
    const handler = controller.acceptBusinessMembershipInvitation;

    expect(Reflect.getMetadata(IS_IDENTITY_ONLY_KEY, handler)).toBe(true);

    expect(Reflect.getMetadata(IS_PUBLIC_KEY, handler)).not.toBe(true);

    expect(Reflect.getMetadata(ROLES_KEY, handler)).toBeUndefined();
  });

  it("declares the membership invitation acceptance endpoint with HTTP 201", () => {
    const handler = controller.acceptBusinessMembershipInvitation;

    expect(Reflect.getMetadata(PATH_METADATA, handler)).toBe(
      "business-membership-invitations/accept",
    );

    expect(Reflect.getMetadata(METHOD_METADATA, handler)).toBe(1);

    expect(Reflect.getMetadata(HTTP_CODE_METADATA, handler)).toBe(201);

    expect(
      Reflect.getMetadata(
        ROUTE_ARGS_METADATA,
        AuthController,
        "acceptBusinessMembershipInvitation",
      ),
    ).toBeDefined();
  });

  it("propagates business membership invitation acceptance errors", async () => {
    const authenticatedRequest: IdentityAuthenticatedRequest = {
      user: {
        userId: "11111111-1111-4111-8111-111111111111",
      },
    };

    businessMembershipInvitationAcceptanceService.accept.mockRejectedValue(
      new BadRequestException("Invalid or expired membership invitation"),
    );

    await expect(
      controller.acceptBusinessMembershipInvitation(
        { token: "A".repeat(43) },
        authenticatedRequest,
      ),
    ).rejects.toThrow(BadRequestException);
  });

  it("uses the authenticated business when listing membership invitations", async () => {
    const authenticatedRequest = {
      user: {
        userId: "11111111-1111-4111-8111-111111111111",
        businessId: "22222222-2222-4222-8222-222222222222",
        role: "admin",
      },
    } as AuthenticatedRequest;

    const query = {
      status: "pending" as const,
      page: 1,
      limit: 25,
    };

    const expectedResult = {
      items: [],
      pagination: {
        page: 1,
        limit: 25,
        total: 0,
        totalPages: 0,
      },
    };

    businessMembershipInvitationManagementService.list.mockResolvedValue(
      expectedResult,
    );

    await expect(
      controller.listBusinessMembershipInvitations(query, authenticatedRequest),
    ).resolves.toEqual(expectedResult);

    expect(
      businessMembershipInvitationManagementService.list,
    ).toHaveBeenCalledWith(authenticatedRequest.user.businessId, query);
  });

  it("uses the authenticated business when retrieving invitation details", async () => {
    const authenticatedRequest = {
      user: {
        userId: "11111111-1111-4111-8111-111111111111",
        businessId: "22222222-2222-4222-8222-222222222222",
        role: "owner",
      },
    } as AuthenticatedRequest;

    const invitationId = "33333333-3333-4333-8333-333333333333";

    const expectedResult = {
      invitationId,
      businessId: authenticatedRequest.user.businessId,
      invitedEmail: "employee@example.com",
      role: "operator" as const,
      status: "pending" as const,
      invitedByUserId: authenticatedRequest.user.userId,
      createdAt: new Date("2026-11-22T10:00:00.000Z"),
      expiresAt: new Date("2026-11-29T10:00:00.000Z"),
      acceptedAt: null,
      revokedAt: null,
    };

    businessMembershipInvitationManagementService.getById.mockResolvedValue(
      expectedResult,
    );

    await expect(
      controller.getBusinessMembershipInvitation(
        invitationId,
        authenticatedRequest,
      ),
    ).resolves.toEqual(expectedResult);

    expect(
      businessMembershipInvitationManagementService.getById,
    ).toHaveBeenCalledWith(authenticatedRequest.user.businessId, invitationId);
  });

  it("requires owner or admin permissions for invitation management", () => {
    const handlers = [
      controller.listBusinessMembershipInvitations,
      controller.getBusinessMembershipInvitation,
    ];

    for (const handler of handlers) {
      expect(Reflect.getMetadata(ROLES_KEY, handler)).toEqual([
        "owner",
        "admin",
      ]);
    }
  });

  it("uses the authenticated business when revoking an invitation", async () => {
    const invitationId = "8d64c8aa-61b0-49c2-9cbb-5c0a2c98bb20";
    const businessId = "cde2f710-36c1-4c24-b9d0-40a0b497ab77";

    const authenticatedRequest = {
      user: {
        userId: "3e54095a-f345-498c-b71c-7c72c7b3d892",
        businessId,
        role: "owner",
      },
    } as AuthenticatedRequest;

    businessMembershipInvitationManagementService.revoke.mockResolvedValue(
      undefined,
    );

    await controller.revokeBusinessMembershipInvitation(
      invitationId,
      authenticatedRequest,
    );

    expect(
      businessMembershipInvitationManagementService.revoke,
    ).toHaveBeenCalledWith(businessId, invitationId);
  });

  it("requires owner or admin permissions for invitation revocation", () => {
    const roles = Reflect.getMetadata(
      ROLES_KEY,
      controller.revokeBusinessMembershipInvitation,
    );

    expect(roles).toEqual(["owner", "admin"]);
  });

  describe("GET /auth/my-businesses", () => {
    it("returns businesses for the authenticated identity", async () => {
      const userId = "550e8400-e29b-41d4-a716-446655440000";

      const response = {
        data: [
          {
            id: "660e8400-e29b-41d4-a716-446655440000",
            name: "Fimonaa India",
            slug: "fimonaa-india",
            role: "owner" as const,
          },
        ],
      };

      myBusinessesService.list.mockResolvedValue(response);

      const request: IdentityAuthenticatedRequest = {
        user: { userId },
      };

      await expect(controller.listMyBusinesses(request)).resolves.toEqual(
        response,
      );

      expect(myBusinessesService.list).toHaveBeenCalledWith(userId);
    });

    it("returns an empty list when no businesses are accessible", async () => {
      myBusinessesService.list.mockResolvedValue({ data: [] });

      const request: IdentityAuthenticatedRequest = {
        user: {
          userId: "550e8400-e29b-41d4-a716-446655440000",
        },
      };

      await expect(controller.listMyBusinesses(request)).resolves.toEqual({
        data: [],
      });
    });

    it("uses identity-only authentication", () => {
      expect(
        Reflect.getMetadata(IS_IDENTITY_ONLY_KEY, controller.listMyBusinesses),
      ).toBe(true);

      expect(
        Reflect.getMetadata(IS_PUBLIC_KEY, controller.listMyBusinesses),
      ).toBeUndefined();

      expect(
        Reflect.getMetadata(ROLES_KEY, controller.listMyBusinesses),
      ).toBeUndefined();
    });

    it("declares the expected GET route", () => {
      expect(
        Reflect.getMetadata(PATH_METADATA, controller.listMyBusinesses),
      ).toBe("my-businesses");

      expect(
        Reflect.getMetadata(METHOD_METADATA, controller.listMyBusinesses),
      ).toBe(0);

      expect(
        Reflect.getMetadata(HTTP_CODE_METADATA, controller.listMyBusinesses),
      ).toBe(200);
    });
  });
});
