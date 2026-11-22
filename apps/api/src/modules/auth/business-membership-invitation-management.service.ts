import {
  ConflictException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { DataSource } from "typeorm";
import type { BusinessInvitationRole } from "./entities/business-membership-invitation.entity";
import type {
  BusinessInvitationStatus,
  ListBusinessMembershipInvitationsDto,
} from "./dto/list-business-membership-invitations.dto";

export type EffectiveBusinessInvitationStatus = Exclude<
  BusinessInvitationStatus,
  "all"
>;

export interface BusinessMembershipInvitationListItem {
  invitationId: string;
  businessId: string;
  invitedEmail: string;
  role: BusinessInvitationRole;
  status: EffectiveBusinessInvitationStatus;
  invitedByUserId: string;
  createdAt: Date;
  expiresAt: Date;
  acceptedAt: Date | null;
  revokedAt: Date | null;
}

export interface BusinessMembershipInvitationListResponse {
  items: BusinessMembershipInvitationListItem[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

interface InvitationRow {
  id: string;
  business_id: string;
  invited_email: string;
  role: BusinessInvitationRole;
  invited_by_user_id: string;
  created_at: Date;
  expires_at: Date;
  accepted_at: Date | null;
  revoked_at: Date | null;
  effective_status: EffectiveBusinessInvitationStatus;
}

interface CountRow {
  total: string;
}

@Injectable()
export class BusinessMembershipInvitationManagementService {
  constructor(private readonly dataSource: DataSource) {}

  async list(
    businessId: string,
    query: ListBusinessMembershipInvitationsDto,
  ): Promise<BusinessMembershipInvitationListResponse> {
    const { page, limit, status } = query;
    const offset = (page - 1) * limit;

    const statusExpression = `
      CASE
        WHEN accepted_at IS NOT NULL THEN 'accepted'
        WHEN revoked_at IS NOT NULL THEN 'revoked'
        WHEN expires_at <= NOW() THEN 'expired'
        ELSE 'pending'
      END
    `;

    const countRows: CountRow[] = await this.dataSource.query(
      `
        SELECT COUNT(*)::text AS total
        FROM business_membership_invitations
        WHERE business_id = $1
          AND (
            $2::text = 'all'
            OR ${statusExpression} = $2::text
          )
      `,
      [businessId, status],
    );

    const total = Number(countRows[0]?.total ?? 0);

    const rows: InvitationRow[] = await this.dataSource.query(
      `
        SELECT
          id,
          business_id,
          invited_email,
          role,
          invited_by_user_id,
          created_at,
          expires_at,
          accepted_at,
          revoked_at,
          ${statusExpression} AS effective_status
        FROM business_membership_invitations
        WHERE business_id = $1
          AND (
            $2::text = 'all'
            OR ${statusExpression} = $2::text
          )
        ORDER BY created_at DESC, id DESC
        LIMIT $3
        OFFSET $4
      `,
      [businessId, status, limit, offset],
    );

    return {
      items: rows.map((row) => ({
        invitationId: row.id,
        businessId: row.business_id,
        invitedEmail: row.invited_email,
        role: row.role,
        status: row.effective_status,
        invitedByUserId: row.invited_by_user_id,
        createdAt: row.created_at,
        expiresAt: row.expires_at,
        acceptedAt: row.accepted_at,
        revokedAt: row.revoked_at,
      })),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async getById(
    businessId: string,
    invitationId: string,
  ): Promise<BusinessMembershipInvitationListItem> {
    const rows: InvitationRow[] = await this.dataSource.query(
      `
      SELECT
        id,
        business_id,
        invited_email,
        role,
        invited_by_user_id,
        created_at,
        expires_at,
        accepted_at,
        revoked_at,
        CASE
          WHEN accepted_at IS NOT NULL THEN 'accepted'
          WHEN revoked_at IS NOT NULL THEN 'revoked'
          WHEN expires_at <= NOW() THEN 'expired'
          ELSE 'pending'
        END AS effective_status
      FROM business_membership_invitations
      WHERE business_id = $1
        AND id = $2
      LIMIT 1
    `,
      [businessId, invitationId],
    );

    const row = rows[0];

    if (!row) {
      throw new NotFoundException("Invitation not found");
    }

    return {
      invitationId: row.id,
      businessId: row.business_id,
      invitedEmail: row.invited_email,
      role: row.role,
      status: row.effective_status,
      invitedByUserId: row.invited_by_user_id,
      createdAt: row.created_at,
      expiresAt: row.expires_at,
      acceptedAt: row.accepted_at,
      revokedAt: row.revoked_at,
    };
  }

  async revoke(businessId: string, invitationId: string): Promise<void> {
    await this.dataSource.transaction(async (manager) => {
      const invitations: Array<{
        id: string;
        accepted_at: Date | null;
        revoked_at: Date | null;
        is_expired: boolean;
      }> = await manager.query(
        `
        SELECT
            id,
            accepted_at,
            revoked_at,
            expires_at <= NOW() AS is_expired
        FROM business_membership_invitations
        WHERE id = $1
          AND business_id = $2
        FOR UPDATE
    `,
        [invitationId, businessId],
      );

      const invitation = invitations[0];

      if (!invitation) {
        throw new NotFoundException("Invitation not found");
      }

      if (
        invitation.accepted_at !== null ||
        invitation.revoked_at !== null ||
        invitation.is_expired
      ) {
        throw new ConflictException("Only pending invitations can be revoked");
      }

      const revokedInvitations: [Array<{ id: string }>, number] =
        await manager.query(
          `
            UPDATE business_membership_invitations
            SET revoked_at = NOW()
            WHERE id = $1
              AND business_id = $2
              AND accepted_at IS NULL
              AND revoked_at IS NULL
              AND expires_at > NOW()
            RETURNING id
        `,
          [invitationId, businessId],
        );

      if (revokedInvitations[0].length !== 1 || revokedInvitations[1] !== 1) {
        throw new ConflictException("Only pending invitations can be revoked");
      }
    });
  }
}
