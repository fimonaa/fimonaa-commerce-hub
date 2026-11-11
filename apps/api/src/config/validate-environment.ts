type Environment = Record<string, unknown>;

export function validateEnvironment(
  environment: Environment,
): Environment {
  const databaseUrl = environment.DATABASE_URL;

  if (
    typeof databaseUrl !== 'string' ||
    databaseUrl.trim().length === 0
  ) {
    throw new Error('DATABASE_URL must be configured');
  }

  const jwtSecret = environment.JWT_SECRET;

  if (
    typeof jwtSecret !== 'string' ||
    jwtSecret.length < 32
  ) {
    throw new Error(
      'JWT_SECRET must contain at least 32 characters',
    );
  }

  const normalizedSecret = jwtSecret.trim().toLowerCase();

  const forbiddenSecrets = new Set([
    'changeme',
    'your-secret-key',
    'replace-with-a-secure-secret',
    'test-only-jwt-secret-not-for-production',
    'unit-test-secret-not-for-production',
  ]);

  if (
    forbiddenSecrets.has(normalizedSecret) ||
    normalizedSecret.includes('replace-me') ||
    normalizedSecret.includes('change-me')
  ) {
    throw new Error(
      'JWT_SECRET must not use a placeholder value',
    );
  }

  return environment;
}
