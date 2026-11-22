import {
  BadRequestException,
  ConflictException,
  Injectable,
} from "@nestjs/common";
import { DataSource } from "typeorm";

import { InvitationTokenService } from "./invitation-token.service";
import type { BusinessInvitationRole } from "./entities/business-membership-invitation.entity";

interface InvitationRow {
  id: string;
  business_id: string;
  invited_email: string;
  role: BusinessInvitationRole;
  expires_at: Date;
  accepted_at: Date | null;
  revoked_at: Date | null;
}

interface UserRow {
  id: string;
  email: string;
}

interface BusinessRow {
  id: string;
}

interface MembershipRow {
  id: string;
}

export interface AcceptedBusinessMembershipInvitation {
  membershipId: string;
  businessId: string;
  role: BusinessInvitationRole;
  status: "active";
}

@Injectable()
export class BusinessMembershipInvitationAcceptanceService {
  constructor(
    private readonly dataSource: DataSource,
    private readonly invitationTokenService: InvitationTokenService,
  ) {}

  async accept(
    token: string,
    authenticatedUserId: string,
  ): Promise<AcceptedBusinessMembershipInvitation> {
    let tokenHash: string;

    try {
      tokenHash = this.invitationTokenService.hash(token);
    } catch {
      throw new BadRequestException("Invalid or expired membership invitation");
    }

    try {
      return await this.dataSource.transaction(async (manager) => {
        /*
         * Read the invitation only to identify its intended recipient.
         *
         * This preliminary read is not trusted for acceptance decisions.
         * The invitation is locked and validated again below.
         */
        const invitationLookup: Array<{
          id: string;
          invited_email: string;
        }> = await manager.query(
          `
          SELECT id, invited_email
          FROM business_membership_invitations
          WHERE token_hash = $1
        `,
          [tokenHash],
        );

        const preliminaryInvitation = invitationLookup[0];

        if (!preliminaryInvitation) {
          throw new BadRequestException(
            "Invalid or expired membership invitation",
          );
        }

        /*
         * Lock the authenticated user first.
         *
         * Invitation issuance also locks recipient user records.
         * This establishes a consistent locking order.
         */
        const users: UserRow[] = await manager.query(
          `
          SELECT id, email
          FROM users
          WHERE id = $1
            AND status = 'active'
          FOR UPDATE
        `,
          [authenticatedUserId],
        );

        const user = users[0];

        if (!user) {
          throw new BadRequestException(
            "Invalid or expired membership invitation",
          );
        }

        /*
         * Lock the invitation before making any acceptance decision.
         */
        const invitations: InvitationRow[] = await manager.query(
          `
          SELECT
            id,
            business_id,
            invited_email,
            role,
            expires_at,
            accepted_at,
            revoked_at
          FROM business_membership_invitations
          WHERE id = $1
            AND token_hash = $2
          FOR UPDATE
        `,
          [preliminaryInvitation.id, tokenHash],
        );

        const invitation = invitations[0];

        if (
          !invitation ||
          invitation.accepted_at !== null ||
          invitation.revoked_at !== null ||
          new Date(invitation.expires_at).getTime() <= Date.now()
        ) {
          throw new BadRequestException(
            "Invalid or expired membership invitation",
          );
        }

        /*
         * The invitation belongs to an email address, not merely
         * to whoever possesses its token.
         */
        if (
          user.email.trim().toLowerCase() !==
          invitation.invited_email.trim().toLowerCase()
        ) {
          throw new BadRequestException(
            "Invalid or expired membership invitation",
          );
        }

        /*
         * Never allow an invitation to grant access to an inactive business.
         */
        const businesses: BusinessRow[] = await manager.query(
          `
    SELECT id
    FROM businesses
    WHERE id = $1
      AND status = 'active'
    FOR SHARE
  `,
          [invitation.business_id],
        );

        if (businesses.length !== 1) {
          throw new BadRequestException(
            "Invalid or expired membership invitation",
          );
        }

        /*
         * Existing memberships must be managed through the membership
         * lifecycle workflow, not through invitation acceptance.
         */
        const existingMemberships: MembershipRow[] = await manager.query(
          `
          SELECT id
          FROM business_memberships
          WHERE business_id = $1
            AND user_id = $2
        `,
          [invitation.business_id, user.id],
        );

        if (existingMemberships.length > 0) {
          throw new ConflictException(
            "User already has a membership in this business",
          );
        }

        /*
         * The role comes exclusively from the invitation record.
         * The client cannot choose or elevate its role.
         */
        const createdMemberships: MembershipRow[] = await manager.query(
          `
          INSERT INTO business_memberships (
            business_id,
            user_id,
            role,
            status,
            created_at,
            updated_at
          )
          VALUES ($1, $2, $3, 'active', NOW(), NOW())
          RETURNING id
        `,
          [invitation.business_id, user.id, invitation.role],
        );

        const membership = createdMemberships[0];

        if (!membership) {
          throw new Error("Membership creation failed");
        }

        /*
         * Consume the invitation inside the same transaction.
         *
         * If this update fails, the membership insertion rolls back.
         */
        const acceptedInvitations: [Array<{ id: string }>, number] =
          await manager.query(
            `
    UPDATE business_membership_invitations
    SET accepted_at = NOW()
    WHERE id = $1
      AND accepted_at IS NULL
      AND revoked_at IS NULL
      AND expires_at > NOW()
    RETURNING id
  `,
            [invitation.id],
          );

        if (
          acceptedInvitations[0].length !== 1 ||
          acceptedInvitations[1] !== 1
        ) {
          throw new BadRequestException(
            "Invalid or expired membership invitation",
          );
        }

        return {
          membershipId: membership.id,
          businessId: invitation.business_id,
          role: invitation.role,
          status: "active",
        };
      });
    } catch (error: unknown) {
      if (
        typeof error === "object" &&
        error !== null &&
        "driverError" in error &&
        typeof error.driverError === "object" &&
        error.driverError !== null &&
        "code" in error.driverError &&
        "constraint" in error.driverError &&
        error.driverError.code === "23505" &&
        error.driverError.constraint ===
          "business_memberships_business_id_user_id_key"
      ) {
        throw new ConflictException(
          "User already has a membership in this business",
        );
      }

      throw error;
    }
  }
}
