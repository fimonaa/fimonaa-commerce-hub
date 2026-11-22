import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { DataSource } from "typeorm";
import type { BusinessRole } from "../auth/entities/business-membership.entity";
import { ASSIGNABLE_BUSINESS_ROLES } from "./dto/update-business-membership-role.dto";

interface LockedMembership {
  id: string;
  user_id: string;
  role: BusinessRole;
  status: string;
}

@Injectable()
export class BusinessMembershipRoleManagementService {
  constructor(private readonly dataSource: DataSource) {}

  async updateRole(
    businessId: string,
    actorUserId: string,
    membershipId: string,
    role: Exclude<BusinessRole, "owner">,
  ): Promise<{
    id: string;
    userId: string;
    role: BusinessRole;
    membershipStatus: string;
  }> {
    if (
      !ASSIGNABLE_BUSINESS_ROLES.some((allowedRole) => allowedRole === role)
    ) {
      throw new BadRequestException("Invalid business membership role");
    }
    return this.dataSource.transaction(async (manager) => {
      // Serialize membership administration within this business.
      const businesses: Array<{ id: string }> = await manager.query(
        `SELECT id FROM businesses WHERE id = $1 FOR UPDATE`,
        [businessId],
      );

      if (businesses.length === 0) {
        throw new NotFoundException("Business not found");
      }

      // Revalidate the actor after acquiring the business lock.
      const actors: LockedMembership[] = await manager.query(
        `SELECT id, user_id, role, status
         FROM business_memberships
         WHERE business_id = $1 AND user_id = $2
         FOR UPDATE`,
        [businessId, actorUserId],
      );

      if (
        actors.length !== 1 ||
        actors[0].status !== "active" ||
        actors[0].role !== "owner"
      ) {
        throw new ForbiddenException(
          "Only an active business owner can change member roles",
        );
      }

      const targets: LockedMembership[] = await manager.query(
        `SELECT id, user_id, role, status
         FROM business_memberships
         WHERE id = $1 AND business_id = $2
         FOR UPDATE`,
        [membershipId, businessId],
      );

      const target = targets[0];

      if (!target) {
        throw new NotFoundException("Business membership not found");
      }

      if (target.user_id === actorUserId) {
        throw new ForbiddenException(
          "You cannot change your own membership role",
        );
      }

      if (target.role === "owner") {
        throw new ForbiddenException(
          "Owner memberships cannot be modified through this endpoint",
        );
      }

      if (target.status !== "active") {
        throw new ConflictException("Only active memberships can change roles");
      }

      if (target.role === role) {
        throw new ConflictException(
          "Membership already has the requested role",
        );
      }

      const updateResult: [LockedMembership[], number] = await manager.query(
        `UPDATE business_memberships
   SET role = $1,
       updated_at = NOW()
   WHERE id = $2 AND business_id = $3
   RETURNING id, user_id, role, status`,
        [role, membershipId, businessId],
      );

      const [updatedRows, affectedCount] = updateResult;

      if (affectedCount !== 1 || updatedRows.length !== 1) {
        throw new ConflictException("Membership role update failed");
      }

      const updated = updatedRows[0];

      return {
        id: updated.id,
        userId: updated.user_id,
        role: updated.role,
        membershipStatus: updated.status,
      };
    });
  }
}
