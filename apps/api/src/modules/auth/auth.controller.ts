import {
  Body,
  Controller,
  Get,
  Header,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
  Req,
} from "@nestjs/common";
import { Public } from "./decorators/public.decorator";
import { LoginRequestDto } from "./dto/login-request.dto";
import { LoginService, type LoginResult } from "./login.service";
import { AcceptInvitationRequestDto } from "./dto/accept-invitation-request.dto";
import { InvitationAcceptanceService } from "./invitation-acceptance.service";
import { Roles } from "./decorators/roles.decorator";
import { CreateInvitationRequestDto } from "./dto/create-invitation-request.dto";
import {
  InvitationPersistenceService,
  type CreatedInvitation,
} from "./invitation-persistence.service";
import type { AuthenticatedRequest } from "./types/authenticated-user.type";
import { CreateBusinessMembershipInvitationDto } from "./dto/create-business-membership-invitation.dto";
import {
  BusinessMembershipInvitationIssuanceService,
  type CreatedBusinessMembershipInvitation,
} from "./business-membership-invitation-issuance.service";
import { IdentityOnly } from "./decorators/identity-only.decorator";
import { AcceptBusinessMembershipInvitationDto } from "./dto/accept-business-membership-invitation.dto";
import {
  BusinessMembershipInvitationAcceptanceService,
  type AcceptedBusinessMembershipInvitation,
} from "./business-membership-invitation-acceptance.service";
import type { IdentityAuthenticatedRequest } from "./types/authenticated-user.type";
import { ListBusinessMembershipInvitationsDto } from "./dto/list-business-membership-invitations.dto";
import {
  BusinessMembershipInvitationManagementService,
  type BusinessMembershipInvitationListItem,
  type BusinessMembershipInvitationListResponse,
} from "./business-membership-invitation-management.service";

@Controller("auth")
export class AuthController {
  constructor(
    private readonly loginService: LoginService,
    private readonly invitationAcceptanceService: InvitationAcceptanceService,
    private readonly invitationPersistenceService: InvitationPersistenceService,
    private readonly businessMembershipInvitationIssuanceService: BusinessMembershipInvitationIssuanceService,
    private readonly businessMembershipInvitationAcceptanceService: BusinessMembershipInvitationAcceptanceService,
    private readonly businessMembershipInvitationManagementService: BusinessMembershipInvitationManagementService,
  ) {}

  /**
   * POST /api/auth/login
   *
   * Public endpoint: users do not yet have an access token.
   * Credential verification and token issuance are handled by LoginService.
   */
  @Public()
  @Post("login")
  @HttpCode(HttpStatus.OK)
  login(@Body() credentials: LoginRequestDto): Promise<LoginResult> {
    return this.loginService.login(credentials.email, credentials.password);
  }

  /**
   * POST /api/auth/accept-invitation
   *
   * Public endpoint: invited users do not have an access token yet.
   * Validates the request and activates the account using a single-use token.
   */
  @Public()
  @Post("accept-invitation")
  @HttpCode(HttpStatus.NO_CONTENT)
  async acceptInvitation(
    @Body() request: AcceptInvitationRequestDto,
  ): Promise<void> {
    await this.invitationAcceptanceService.accept(
      request.token,
      request.password,
    );
  }

  /**
   * POST /api/auth/invitations
   *
   * Requires authentication and owner or admin permissions.
   * The business ID comes from the validated authentication context.
   */
  @Post("invitations")
  @Roles("owner", "admin")
  @Header("Cache-Control", "no-store")
  @HttpCode(HttpStatus.CREATED)
  createInvitation(
    @Body() request: CreateInvitationRequestDto,
    @Req() authenticatedRequest: AuthenticatedRequest,
  ): Promise<CreatedInvitation> {
    return this.invitationPersistenceService.create(
      request.userId,
      authenticatedRequest.user.businessId,
    );
  }

  /**
   * POST /api/auth/business-membership-invitations
   *
   * Requires authentication and owner or admin permissions.
   * Both the business ID and inviter user ID are obtained from the
   * authenticated request context, never from client-provided data.
   */
  @Post("business-membership-invitations")
  @Roles("owner", "admin")
  @Header("Cache-Control", "no-store")
  @HttpCode(HttpStatus.CREATED)
  createBusinessMembershipInvitation(
    @Body() request: CreateBusinessMembershipInvitationDto,
    @Req() authenticatedRequest: AuthenticatedRequest,
  ): Promise<CreatedBusinessMembershipInvitation> {
    return this.businessMembershipInvitationIssuanceService.create(
      authenticatedRequest.user.businessId,
      authenticatedRequest.user.userId,
      request.email,
      request.role,
    );
  }

  /**
   * POST /api/auth/business-membership-invitations/accept
   *
   * Allows an existing authenticated user to accept an invitation
   * without already belonging to the target business.
   *
   * The recipient user ID comes exclusively from the verified JWT.
   * The business ID and membership role come from the invitation.
   */
  @IdentityOnly()
  @Post("business-membership-invitations/accept")
  @Header("Cache-Control", "no-store")
  @HttpCode(HttpStatus.CREATED)
  acceptBusinessMembershipInvitation(
    @Body() request: AcceptBusinessMembershipInvitationDto,
    @Req() authenticatedRequest: IdentityAuthenticatedRequest,
  ): Promise<AcceptedBusinessMembershipInvitation> {
    return this.businessMembershipInvitationAcceptanceService.accept(
      request.token,
      authenticatedRequest.user.userId,
    );
  }

  /**
   * GET /api/auth/business-membership-invitations
   *
   * Lists invitations for the authenticated business.
   * Only active owners and admins can access this endpoint.
   *
   * Business isolation is enforced using the authenticated context.
   */
  @Get("business-membership-invitations")
  @Roles("owner", "admin")
  @Header("Cache-Control", "no-store")
  @HttpCode(HttpStatus.OK)
  listBusinessMembershipInvitations(
    @Query() query: ListBusinessMembershipInvitationsDto,
    @Req() authenticatedRequest: AuthenticatedRequest,
  ): Promise<BusinessMembershipInvitationListResponse> {
    return this.businessMembershipInvitationManagementService.list(
      authenticatedRequest.user.businessId,
      query,
    );
  }

  /**
   * GET /api/auth/business-membership-invitations/:invitationId
   *
   * Retrieves invitation metadata for the authenticated business.
   * Returns 404 for both missing and cross-business invitations.
   */
  @Get("business-membership-invitations/:invitationId")
  @Roles("owner", "admin")
  @Header("Cache-Control", "no-store")
  @HttpCode(HttpStatus.OK)
  getBusinessMembershipInvitation(
    @Param("invitationId", new ParseUUIDPipe()) invitationId: string,
    @Req() authenticatedRequest: AuthenticatedRequest,
  ): Promise<BusinessMembershipInvitationListItem> {
    return this.businessMembershipInvitationManagementService.getById(
      authenticatedRequest.user.businessId,
      invitationId,
    );
  }

  /**
   * Revokes a pending business membership invitation.
   *
   * Only active business owners and admins can revoke invitations
   * belonging to their authenticated business context.
   *
   * The service performs revocation within a database transaction,
   * preventing an invitation from being accepted and revoked simultaneously.
   * Invitation tokens and sensitive details are never exposed.
   */
  @Post("business-membership-invitations/:invitationId/revoke")
  @Roles("owner", "admin")
  @Header("Cache-Control", "no-store")
  @HttpCode(HttpStatus.NO_CONTENT)
  async revokeBusinessMembershipInvitation(
    @Param("invitationId", new ParseUUIDPipe())
    invitationId: string,
    @Req() authenticatedRequest: AuthenticatedRequest,
  ): Promise<void> {
    await this.businessMembershipInvitationManagementService.revoke(
      authenticatedRequest.user.businessId,
      invitationId,
    );
  }
}
