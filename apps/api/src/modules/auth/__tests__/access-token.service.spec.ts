import { JwtService } from '@nestjs/jwt';

import { AccessTokenService } from '../access-token.service';
import { JwtVerificationService } from '../jwt-verification.service';

describe('AccessTokenService', () => {
  const secret = 'unit-test-secret-not-for-production';
  const userId = '550e8400-e29b-41d4-a716-446655440000';

  const jwtService = new JwtService({
    secret,
    signOptions: {
      algorithm: 'HS256',
      expiresIn: '15m',
    },
    verifyOptions: {
      algorithms: ['HS256'],
    },
  });

  const service = new AccessTokenService(jwtService);
  const verifier = new JwtVerificationService(jwtService);

  it('issues a signed JWT for a valid user UUID', async () => {
    const token = await service.issue(userId);

    expect(typeof token).toBe('string');
    expect(token.split('.')).toHaveLength(3);

    const payload = await jwtService.verifyAsync(token);

    expect(payload.sub).toBe(userId);
  });

  it('includes an expiration approximately 15 minutes after issuance', async () => {
    const token = await service.issue(userId);
    const payload = await jwtService.verifyAsync(token);

    expect(typeof payload.iat).toBe('number');
    expect(typeof payload.exp).toBe('number');
    expect(payload.exp - payload.iat).toBe(900);
  });

  it('issues tokens accepted by the existing verification service', async () => {
    const token = await service.issue(userId);
    const payload = await verifier.verifyToken(token);

    expect(payload.sub).toBe(userId);
  });

  it('rejects invalid user UUIDs', async () => {
    await expect(service.issue('invalid-user-id')).rejects.toThrow(
      'Cannot issue access token for an invalid user ID',
    );
  });
});
