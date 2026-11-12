import {
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Req,
  UnauthorizedException,
} from '@nestjs/common';

import { Roles } from '../auth/decorators/roles.decorator';
import type { AuthenticatedRequest } from '../auth/types/authenticated-user.type';

import { BusinessMembershipsService } from './business-memberships.service';
import type {
  BusinessMember,
  BusinessMembersResponse,
} from './types/business-membership.types';

@Controller('business-memberships')
@Roles('owner', 'admin')
export class BusinessMembershipsController {
  constructor(
    private readonly membershipsService: BusinessMembershipsService,
  ) {}

  @Get()
  listMembers(
    @Req() request: AuthenticatedRequest,
  ): Promise<BusinessMembersResponse> {
    const businessId = request.user?.businessId;

    if (!businessId) {
      throw new UnauthorizedException(
        'Authenticated business context required',
      );
    }

    return this.membershipsService.listMembers(businessId);
  }

  @Get(':membershipId')
  getMember(
    @Req() request: AuthenticatedRequest,
    @Param('membershipId', new ParseUUIDPipe())
    membershipId: string,
  ): Promise<BusinessMember> {
    const businessId = request.user?.businessId;

    if (!businessId) {
      throw new UnauthorizedException(
        'Authenticated business context required',
      );
    }

    return this.membershipsService.getMember(
      businessId,
      membershipId,
    );
  }
}