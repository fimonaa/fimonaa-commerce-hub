import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';

import {
  BUSINESS_INVITATION_STATUSES,
  ListBusinessMembershipInvitationsDto,
} from '../dto/list-business-membership-invitations.dto';

describe('ListBusinessMembershipInvitationsDto', () => {
  it('uses default pagination and status values', () => {
    const dto = plainToInstance(
      ListBusinessMembershipInvitationsDto,
      {},
    );

    expect(dto.page).toBe(1);
    expect(dto.limit).toBe(25);
    expect(dto.status).toBe('all');
  });

  it('converts page and limit strings into numbers', () => {
    const dto = plainToInstance(
      ListBusinessMembershipInvitationsDto,
      {
        page: '2',
        limit: '50',
      },
    );

    expect(dto.page).toBe(2);
    expect(dto.limit).toBe(50);
  });

  it.each(BUSINESS_INVITATION_STATUSES)(
    'accepts the supported status %s',
    async (status) => {
      const dto = plainToInstance(
        ListBusinessMembershipInvitationsDto,
        { status },
      );

      const errors = await validate(dto);

      expect(errors).toHaveLength(0);
    },
  );

  it.each([
    'unknown',
    'ACTIVE',
    '',
    'Pending',
  ])(
    'rejects unsupported status %s',
    async (status) => {
      const dto = plainToInstance(
        ListBusinessMembershipInvitationsDto,
        { status },
      );

      const errors = await validate(dto);

      expect(
        errors.some((error) => error.property === 'status'),
      ).toBe(true);
    },
  );

  it.each([
    ['0', 'page'],
    ['-1', 'page'],
    ['1.5', 'page'],
    ['abc', 'page'],
    ['0', 'limit'],
    ['-1', 'limit'],
    ['1.5', 'limit'],
    ['101', 'limit'],
    ['abc', 'limit'],
  ])(
    'rejects invalid value %s for %s',
    async (value, property) => {
      const dto = plainToInstance(
        ListBusinessMembershipInvitationsDto,
        { [property]: value },
      );

      const errors = await validate(dto);

      expect(
        errors.some((error) => error.property === property),
      ).toBe(true);
    },
  );

  it('rejects unexpected businessId query parameters', async () => {
    const dto = plainToInstance(
      ListBusinessMembershipInvitationsDto,
      {
        businessId: '00000000-0000-4000-8000-000000000001',
      },
    );

    const errors = await validate(dto, {
      whitelist: true,
      forbidNonWhitelisted: true,
    });

    expect(
      errors.some((error) => error.property === 'businessId'),
    ).toBe(true);
  });

  it('rejects unexpected userId query parameters', async () => {
    const dto = plainToInstance(
      ListBusinessMembershipInvitationsDto,
      {
        userId: '00000000-0000-4000-8000-000000000001',
      },
    );

    const errors = await validate(dto, {
      whitelist: true,
      forbidNonWhitelisted: true,
    });

    expect(
      errors.some((error) => error.property === 'userId'),
    ).toBe(true);
  });

  it('rejects unexpected role query parameters', async () => {
    const dto = plainToInstance(
      ListBusinessMembershipInvitationsDto,
      {
        role: 'owner',
      },
    );

    const errors = await validate(dto, {
      whitelist: true,
      forbidNonWhitelisted: true,
    });

    expect(
      errors.some((error) => error.property === 'role'),
    ).toBe(true);
  });
});
