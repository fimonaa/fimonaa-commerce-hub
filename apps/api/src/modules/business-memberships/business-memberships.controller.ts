import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Req,
  UnauthorizedException,
} from "@nestjs/common";
import { Roles } from "../auth/decorators/roles.decorator";
import type { AuthenticatedRequest } from "../auth/types/authenticated-user.type";
import { BusinessMembershipsService } from "./business-memberships.service";
import type {
  BusinessMember,
  BusinessMembersResponse,
} from "./types/business-membership.types";
import { BusinessMembershipRoleManagementService } from "./business-membership-role-management.service";
import { UpdateBusinessMembershipRoleDto } from "./dto/update-business-membership-role.dto";
import { BusinessMembershipSuspensionService } from "./business-membership-suspension.service";
import { BusinessMembershipReactivationService } from "./business-membership-reactivation.service";
import { BusinessMembershipRemovalService } from "./business-membership-removal.service";

@Controller("business-memberships")
@Roles("owner", "admin")
export class BusinessMembershipsController {
  constructor(
    private readonly membershipsService: BusinessMembershipsService,
    private readonly roleManagementService: BusinessMembershipRoleManagementService,
    private readonly suspensionService: BusinessMembershipSuspensionService,
    private readonly reactivationService: BusinessMembershipReactivationService,
    private readonly removalService: BusinessMembershipRemovalService,
  ) {}

  @Get()
  listMembers(
    @Req() request: AuthenticatedRequest,
  ): Promise<BusinessMembersResponse> {
    const businessId = request.user?.businessId;

    if (!businessId) {
      throw new UnauthorizedException(
        "Authenticated business context required",
      );
    }

    return this.membershipsService.listMembers(businessId);
  }

  @Get(":membershipId")
  getMember(
    @Req() request: AuthenticatedRequest,
    @Param("membershipId", new ParseUUIDPipe())
    membershipId: string,
  ): Promise<BusinessMember> {
    const businessId = request.user?.businessId;

    if (!businessId) {
      throw new UnauthorizedException(
        "Authenticated business context required",
      );
    }

    return this.membershipsService.getMember(businessId, membershipId);
  }

  @Patch(":membershipId/role")
  @Roles("owner")
  updateRole(
    @Req() request: AuthenticatedRequest,
    @Param("membershipId", new ParseUUIDPipe()) membershipId: string,
    @Body() dto: UpdateBusinessMembershipRoleDto,
  ) {
    const user = request.user;

    if (!user?.businessId || !user.userId) {
      throw new UnauthorizedException(
        "Authenticated business context required",
      );
    }

    return this.roleManagementService.updateRole(
      user.businessId,
      user.userId,
      membershipId,
      dto.role,
    );
  }

  @Post(":membershipId/suspend")
  @Roles("owner", "admin")
  suspendMembership(
    @Req() request: AuthenticatedRequest,
    @Param("membershipId", new ParseUUIDPipe()) membershipId: string,
  ) {
    const user = request.user;

    if (!user?.businessId || !user.userId) {
      throw new UnauthorizedException(
        "Authenticated business context required",
      );
    }

    return this.suspensionService.suspend(
      user.businessId,
      user.userId,
      membershipId,
    );
  }

  @Post(":membershipId/reactivate")
  @Roles("owner", "admin")
  reactivateMembership(
    @Req() request: AuthenticatedRequest,
    @Param("membershipId", new ParseUUIDPipe()) membershipId: string,
  ) {
    const user = request.user;

    if (!user?.businessId || !user.userId) {
      throw new UnauthorizedException(
        "Authenticated business context required",
      );
    }

    return this.reactivationService.reactivate(
      user.businessId,
      user.userId,
      membershipId,
    );
  }

  @Post(":membershipId/remove")
  @Roles("owner")
  removeMembership(
    @Req() request: AuthenticatedRequest,
    @Param("membershipId", new ParseUUIDPipe()) membershipId: string,
  ) {
    const user = request.user;

    if (!user?.businessId || !user.userId) {
      throw new UnauthorizedException(
        "Authenticated business context required",
      );
    }

    return this.removalService.remove(
      user.businessId,
      user.userId,
      membershipId,
    );
  }
}
