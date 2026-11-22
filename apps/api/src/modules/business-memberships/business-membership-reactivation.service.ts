import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { DataSource } from "typeorm";

import type { BusinessRole } from "../auth/entities/business-membership.entity";

interface LockedMembership {
  id: string;
  user_id: string;
  role: BusinessRole;
  status: string;
}

interface ReactivatedMembership {
  id: string;
  user_id: string;
  role: BusinessRole;
  status: string;
}

@Injectable()
export class BusinessMembershipReactivationService {
  constructor(private readonly dataSource: DataSource) {}

  async reactivate(
    businessId: string,
    actorUserId: string,
    membershipId: string,
  ): Promise<{
    id: string;
    userId: string;
    role: BusinessRole;
    membershipStatus: string;
  }> {
    return this.dataSource.transaction(async (manager) => {
      // Serialize membership administration within the business.
      const businesses: Array<{ id: string }> = await manager.query(
        `SELECT id FROM businesses WHERE id = $1 FOR UPDATE`,
        [businessId],
      );

      if (businesses.length !== 1) {
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

      const actor = actors[0];

      if (
        actors.length !== 1 ||
        actor.status !== "active" ||
        !["owner", "admin"].includes(actor.role)
      ) {
        throw new ForbiddenException(
          "Only active owners and admins can reactivate memberships",
        );
      }

      // Lock the target membership within the selected business.
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
          "You cannot reactivate your own membership",
        );
      }

      if (target.role === "owner") {
        throw new ForbiddenException("Owner memberships cannot be reactivated");
      }

      if (actor.role === "admin" && target.role === "admin") {
        throw new ForbiddenException("Admins cannot reactivate other admins");
      }

      if (target.status !== "suspended") {
        throw new ConflictException(
          "Only suspended memberships can be reactivated",
        );
      }

      const updateResult: [ReactivatedMembership[], number] =
        await manager.query(
          `UPDATE business_memberships
           SET status = 'active',
               updated_at = NOW()
           WHERE id = $1 AND business_id = $2
           RETURNING id, user_id, role, status`,
          [membershipId, businessId],
        );

      const [updatedRows, affectedCount] = updateResult;

      if (affectedCount !== 1 || updatedRows.length !== 1) {
        throw new ConflictException("Membership reactivation failed");
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
