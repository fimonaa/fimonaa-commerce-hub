import { validateEnvironment } from '../validate-environment';

describe('validateEnvironment', () => {
  const validEnvironment = {
    DATABASE_URL: 'postgresql://localhost:5432/example',
    JWT_SECRET: 'a'.repeat(64),
  };

  it('accepts valid environment configuration', () => {
    expect(validateEnvironment(validEnvironment)).toBe(validEnvironment);
  });

  it('rejects missing database configuration', () => {
    expect(() =>
      validateEnvironment({
        JWT_SECRET: validEnvironment.JWT_SECRET,
      }),
    ).toThrow('DATABASE_URL must be configured');
  });

  it('rejects empty database configuration', () => {
    expect(() =>
      validateEnvironment({
        ...validEnvironment,
        DATABASE_URL: ' ',
      }),
    ).toThrow('DATABASE_URL must be configured');
  });

  it('rejects missing JWT secrets', () => {
    expect(() =>
      validateEnvironment({
        DATABASE_URL: validEnvironment.DATABASE_URL,
      }),
    ).toThrow('JWT_SECRET must contain at least 32 characters');
  });

  it('rejects short JWT secrets', () => {
    expect(() =>
      validateEnvironment({
        ...validEnvironment,
        JWT_SECRET: 'short-secret',
      }),
    ).toThrow('JWT_SECRET must contain at least 32 characters');
  });

  it('rejects known placeholder secrets', () => {
    expect(() =>
      validateEnvironment({
        ...validEnvironment,
        JWT_SECRET: 'test-only-jwt-secret-not-for-production',
      }),
    ).toThrow('JWT_SECRET must not use a placeholder value');
  });

  it('does not expose secret values in validation errors', () => {
    const weakSecret = 'sensitive-short-secret';

    expect(() =>
      validateEnvironment({
        ...validEnvironment,
        JWT_SECRET: weakSecret,
      }),
    ).toThrow('JWT_SECRET must contain at least 32 characters');

    try {
      validateEnvironment({
        ...validEnvironment,
        JWT_SECRET: weakSecret,
      });
    } catch (error) {
      expect((error as Error).message).not.toContain(weakSecret);
    }
  });
});
