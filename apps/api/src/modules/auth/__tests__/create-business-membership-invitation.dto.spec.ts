import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';

import {
  CreateBusinessMembershipInvitationDto,
} from '../dto/create-business-membership-invitation.dto';

describe('CreateBusinessMembershipInvitationDto', () => {
  async function validateRequest(
    payload: Record<string, unknown>,
  ) {
    const dto = plainToInstance(
      CreateBusinessMembershipInvitationDto,
      payload,
    );

    const errors = await validate(dto);

    return { dto, errors };
  }

  it('accepts a valid invitation request', async () => {
    const { dto, errors } = await validateRequest({
      email: 'employee@example.com',
      role: 'inventory_manager',
    });

    expect(errors).toHaveLength(0);
    expect(dto.email).toBe('employee@example.com');
    expect(dto.role).toBe('inventory_manager');
  });

  it('normalizes email casing and whitespace', async () => {
    const { dto, errors } = await validateRequest({
      email: '  Employee@Example.COM  ',
      role: 'viewer',
    });

    expect(errors).toHaveLength(0);
    expect(dto.email).toBe('employee@example.com');
  });

  it.each([
    'admin',
    'inventory_manager',
    'operator',
    'viewer',
  ])('accepts the %s role', async (role) => {
    const { errors } = await validateRequest({
      email: 'employee@example.com',
      role,
    });

    expect(errors).toHaveLength(0);
  });

  it.each([
    'owner',
    'super_admin',
    'unknown',
    '',
  ])('rejects the %s role', async (role) => {
    const { errors } = await validateRequest({
      email: 'employee@example.com',
      role,
    });

    expect(errors.some((error) => error.property === 'role'))
      .toBe(true);
  });

  it.each([
    '',
    'invalid-email',
    'employee@',
    123,
    null,
  ])('rejects invalid email value %s', async (email) => {
    const { errors } = await validateRequest({
      email,
      role: 'viewer',
    });

    expect(errors.some((error) => error.property === 'email'))
      .toBe(true);
  });

  it('rejects a missing email', async () => {
    const { errors } = await validateRequest({
      role: 'viewer',
    });

    expect(errors.some((error) => error.property === 'email'))
      .toBe(true);
  });

  it('rejects a missing role', async () => {
    const { errors } = await validateRequest({
      email: 'employee@example.com',
    });

    expect(errors.some((error) => error.property === 'role'))
      .toBe(true);
  });

  it('rejects an email longer than 254 characters', async () => {
    const email = `${'a'.repeat(245)}@example.com`;

    const { errors } = await validateRequest({
      email,
      role: 'viewer',
    });

    expect(errors.some((error) => error.property === 'email'))
      .toBe(true);
  });
});