import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';

import { AcceptBusinessMembershipInvitationDto } from '../dto/accept-business-membership-invitation.dto';

describe('AcceptBusinessMembershipInvitationDto', () => {
  const validToken = 'A'.repeat(43);

  const validateRequest = async (body: unknown) => {
    const dto = plainToInstance(
      AcceptBusinessMembershipInvitationDto,
      body,
    );

    return validate(dto, {
      whitelist: true,
      forbidNonWhitelisted: true,
    });
  };

  it('accepts a correctly formatted invitation token', async () => {
    const errors = await validateRequest({
      token: validToken,
    });

    expect(errors).toHaveLength(0);
  });

  it.each([
    ['missing token', {}],
    ['empty token', { token: '' }],
    ['short token', { token: 'abc' }],
    ['long token', { token: 'A'.repeat(44) }],
    ['numeric token', { token: 12345 }],
    ['null token', { token: null }],
    ['token containing spaces', { token: ` ${validToken}` }],
    ['token containing invalid characters', { token: '!'.repeat(43) }],
  ])('rejects %s', async (_scenario, body) => {
    const errors = await validateRequest(body);

    expect(errors.length).toBeGreaterThan(0);
  });

  it('rejects unexpected request properties', async () => {
    const errors = await validateRequest({
      token: validToken,
      businessId: 'client-controlled-business-id',
    });

    expect(errors.length).toBeGreaterThan(0);

    expect(
      errors.some((error) => error.property === 'businessId'),
    ).toBe(true);
  });

  it('rejects a client-provided role', async () => {
    const errors = await validateRequest({
      token: validToken,
      role: 'owner',
    });

    expect(errors.length).toBeGreaterThan(0);

    expect(
      errors.some((error) => error.property === 'role'),
    ).toBe(true);
  });

  it('rejects a client-provided user ID', async () => {
    const errors = await validateRequest({
      token: validToken,
      userId: 'client-controlled-user-id',
    });

    expect(errors.length).toBeGreaterThan(0);

    expect(
      errors.some((error) => error.property === 'userId'),
    ).toBe(true);
  });
});