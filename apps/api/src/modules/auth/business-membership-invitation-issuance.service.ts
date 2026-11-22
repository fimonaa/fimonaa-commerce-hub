import {
    ConflictException,
    ForbiddenException,
    Injectable,
    NotFoundException,
} from '@nestjs/common';
import { DataSource } from 'typeorm';

import { BusinessMembership } from './entities/business-membership.entity';
import {
    BusinessMembershipInvitation,
    type BusinessInvitationRole,
} from './entities/business-membership-invitation.entity';
import { User } from './entities/user.entity';
import { InvitationTokenService } from './invitation-token.service';
import { Business } from './entities/business.entity';

export interface CreatedBusinessMembershipInvitation {
    invitationId: string;
    businessId: string;
    invitedEmail: string;
    role: BusinessInvitationRole;
    expiresAt: Date;
    token: string;
}

@Injectable()
export class BusinessMembershipInvitationIssuanceService {
    constructor(
        private readonly dataSource: DataSource,
        private readonly invitationTokenService: InvitationTokenService,
    ) {}

    async create(
        businessId: string,
        invitedByUserId: string,
        email: string,
        role: BusinessInvitationRole,
    ): Promise<CreatedBusinessMembershipInvitation> {
        const normalizedEmail = email.trim().toLowerCase();

        if (!['admin', 'inventory_manager', 'operator', 'viewer'].includes(role)) {
            throw new ForbiddenException('Invalid invitation role');
        }

        try {
            return await this.dataSource.transaction(async (manager) => {
                const userRepository = manager.getRepository(User);
                const membershipRepository =
                    manager.getRepository(BusinessMembership);
                const invitationRepository =
                    manager.getRepository(BusinessMembershipInvitation);

                const businessRepository = manager.getRepository(Business);

                const business = await businessRepository.findOne({
                    where: {
                        id: businessId,
                        status: 'active',
                    },
                });

                if (!business) {
                    throw new ForbiddenException(
                        'Business is not active or does not exist',
                    );
                }

                const inviter = await userRepository.findOne({
                    where: {
                        id: invitedByUserId,
                        status: 'active',
                    },
                });

                if (!inviter) {
                    throw new ForbiddenException(
                        'Inviter account is not active',
                    );
                }

                const inviterMembership = await membershipRepository.findOne({
                    where: {
                        businessId,
                        userId: invitedByUserId,
                        status: 'active',
                    },
                });

                if (
                    !inviterMembership ||
                    !['owner', 'admin'].includes(inviterMembership.role)
                ) {
                    throw new ForbiddenException(
                        'Only active business owners and administrators can issue invitations',
                    );
                }

                const user = await userRepository
                    .createQueryBuilder('user')
                    .setLock('pessimistic_write')
                    .where('LOWER(user.email) = :email', {
                        email: normalizedEmail,
                    })
                    .andWhere('user.status = :status', {
                        status: 'active',
                    })
                    .getOne();

                if (!user) {
                    throw new NotFoundException('Active user not found');
                }

                const existingMembership = await membershipRepository.findOne({
                    where: {
                        businessId,
                        userId: user.id,
                    },
                });

                if (existingMembership) {
                    throw new ConflictException(
                        'User already has a membership in this business',
                    );
                }

                const now = new Date();

                await invitationRepository
                    .createQueryBuilder()
                    .update(BusinessMembershipInvitation)
                    .set({ revokedAt: now })
                    .where('business_id = :businessId', { businessId })
                    .andWhere('LOWER(invited_email) = :email', {
                        email: normalizedEmail,
                    })
                    .andWhere('accepted_at IS NULL')
                    .andWhere('revoked_at IS NULL')
                    .andWhere('expires_at <= :now', { now })
                    .execute();

                const existingInvitation = await invitationRepository
                    .createQueryBuilder('invitation')
                    .where('invitation.business_id = :businessId', { businessId })
                    .andWhere('LOWER(invitation.invited_email) = :email', {
                        email: normalizedEmail,
                    })
                    .andWhere('invitation.accepted_at IS NULL')
                    .andWhere('invitation.revoked_at IS NULL')
                    .andWhere('invitation.expires_at > :now', { now })
                    .getOne();

                if (existingInvitation) {
                    throw new ConflictException(
                        'An active membership invitation already exists',
                    );
                }

                const { token, tokenHash } =
                    this.invitationTokenService.generate();

                const expiresAt = new Date(
                    now.getTime() + 24 * 60 * 60 * 1000,
                );

                const invitation = invitationRepository.create({
                    businessId,
                    invitedEmail: normalizedEmail,
                    role,
                    tokenHash,
                    invitedByUserId,
                    createdAt: now,
                    expiresAt,
                });

                const savedInvitation =
                    await invitationRepository.save(invitation);

                return {
                    invitationId: savedInvitation.id,
                    businessId: savedInvitation.businessId,
                    invitedEmail: savedInvitation.invitedEmail,
                    role: savedInvitation.role,
                    expiresAt: savedInvitation.expiresAt,
                    token,
                };
            });
        } catch (error: unknown) {
            if (
                typeof error === 'object' &&
                error !== null &&
                'driverError' in error &&
                typeof error.driverError === 'object' &&
                error.driverError !== null &&
                'code' in error.driverError &&
                'constraint' in error.driverError &&
                error.driverError.code === '23505' &&
                error.driverError.constraint ===
                'business_membership_invitations_pending_unique_idx'
            ) {
                throw new ConflictException(
                    'An active membership invitation already exists',
                );
            }

            throw error;
        }
    }
}
