import { ConflictException } from '@nestjs/common';
import { DataSource } from 'typeorm';

import { BusinessMembershipInvitationIssuanceService } from '../business-membership-invitation-issuance.service';
import { InvitationTokenService } from '../invitation-token.service';

describe('BusinessMembershipInvitationIssuanceService', () => {
    let service: BusinessMembershipInvitationIssuanceService;

    const transaction = jest.fn();

    beforeEach(() => {
        jest.clearAllMocks();

        const dataSource = {
            transaction,
        } as unknown as DataSource;

        service = new BusinessMembershipInvitationIssuanceService(
            dataSource,
            new InvitationTokenService(),
        );
    });

    it('translates a pending invitation unique index violation into HTTP 409', async () => {
        transaction.mockRejectedValue({
            driverError: {
                code: '23505',
                constraint:
                    'business_membership_invitations_pending_unique_idx',
            },
        });

        await expect(
            service.create(
                '00000000-0000-4000-8000-000000000001',
                '00000000-0000-4000-8000-000000000002',
                'employee@example.com',
                'viewer',
            ),
        ).rejects.toBeInstanceOf(ConflictException);

        expect(transaction).toHaveBeenCalledTimes(1);
    });

    it('does not translate unrelated unique constraint violations', async () => {
        const databaseError = {
            driverError: {
                code: '23505',
                constraint: 'UQ_unrelated_constraint',
            },
        };

        transaction.mockRejectedValue(databaseError);

        await expect(
            service.create(
                '00000000-0000-4000-8000-000000000001',
                '00000000-0000-4000-8000-000000000002',
                'employee@example.com',
                'viewer',
            ),
        ).rejects.toBe(databaseError);
    });

    it('does not translate a token hash uniqueness violation', async () => {
        const databaseError = {
            driverError: {
                code: '23505',
                constraint:
                    'business_membership_invitations_token_hash_key',
            },
        };

        transaction.mockRejectedValue(databaseError);

        await expect(
            service.create(
                '00000000-0000-4000-8000-000000000001',
                '00000000-0000-4000-8000-000000000002',
                'employee@example.com',
                'viewer',
            ),
        ).rejects.toBe(databaseError);
    });
});