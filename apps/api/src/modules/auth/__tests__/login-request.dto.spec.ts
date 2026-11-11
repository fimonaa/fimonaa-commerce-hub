import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';

import { LoginRequestDto } from '../dto/login-request.dto';

describe('LoginRequestDto', () => {
  async function validateInput(input: Record<string, unknown>) {
    const dto = plainToInstance(LoginRequestDto, input);
    const errors = await validate(dto);

    return { dto, errors };
  }

  it('accepts valid login credentials', async () => {
    const { errors } = await validateInput({
      email: 'admin@example.com',
      password: 'SecurePassword123!',
    });

    expect(errors).toHaveLength(0);
  });

  it('normalizes email addresses', async () => {
    const { dto, errors } = await validateInput({
      email: '  ADMIN@EXAMPLE.COM  ',
      password: 'password',
    });

    expect(errors).toHaveLength(0);
    expect(dto.email).toBe('admin@example.com');
  });

  it('preserves passwords exactly as submitted', async () => {
    const password = '  My Password 123!  ';

    const { dto, errors } = await validateInput({
      email: 'admin@example.com',
      password,
    });

    expect(errors).toHaveLength(0);
    expect(dto.password).toBe(password);
  });

  it('rejects invalid email addresses', async () => {
    const { errors } = await validateInput({
      email: 'not-an-email',
      password: 'password',
    });

    expect(errors.some((error) => error.property === 'email')).toBe(true);
  });

  it('rejects missing email addresses', async () => {
    const { errors } = await validateInput({
      password: 'password',
    });

    expect(errors.some((error) => error.property === 'email')).toBe(true);
  });

  it('rejects empty passwords', async () => {
    const { errors } = await validateInput({
      email: 'admin@example.com',
      password: '',
    });

    expect(errors.some((error) => error.property === 'password')).toBe(true);
  });

  it('rejects non-string passwords', async () => {
    const { errors } = await validateInput({
      email: 'admin@example.com',
      password: 123456,
    });

    expect(errors.some((error) => error.property === 'password')).toBe(true);
  });

  it('rejects passwords longer than 1024 characters', async () => {
    const { errors } = await validateInput({
      email: 'admin@example.com',
      password: 'a'.repeat(1025),
    });

    expect(errors.some((error) => error.property === 'password')).toBe(true);
  });
});
