import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { BusinessMembership } from "../auth/entities/business-membership.entity";
import { User } from "../auth/entities/user.entity";
import { BusinessMembershipsController } from "./business-memberships.controller";
import { BusinessMembershipsService } from "./business-memberships.service";
import { BusinessMembershipRoleManagementService } from "./business-membership-role-management.service";
import { BusinessMembershipSuspensionService } from "./business-membership-suspension.service";
import { BusinessMembershipReactivationService } from "./business-membership-reactivation.service";
import { BusinessMembershipRemovalService } from "./business-membership-removal.service";

@Module({
  imports: [TypeOrmModule.forFeature([BusinessMembership, User])],
  controllers: [BusinessMembershipsController],
  providers: [
    BusinessMembershipsService,
    BusinessMembershipRoleManagementService,
    BusinessMembershipSuspensionService,
    BusinessMembershipReactivationService,
    BusinessMembershipRemovalService,
  ],
})
export class BusinessMembershipsModule {}
