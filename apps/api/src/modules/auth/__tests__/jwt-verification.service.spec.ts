import { UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';

import { JwtVerificationService } from '../jwt-verification.service';

describe('JwtVerificationService', () => {
  const secret = 'test-only-jwt-secret-not-for-production';
  const userId = '550e8400-e29b-41d4-a716-446655440000';

  const jwtService = new JwtService({
    secret,
    signOptions: { algorithm: 'HS256' },
    verifyOptions: { algorithms: ['HS256'] },
  });

  const service = new JwtVerificationService(jwtService);

  it('accepts a valid signed JWT', async () => {
    const token = await jwtService.signAsync({
      sub: userId,
      exp: Math.floor(Date.now() / 1000) + 900,
    });

    await expect(service.verifyToken(token)).resolves.toMatchObject({
      sub: userId,
    });
  });

  it('rejects an expired JWT', async () => {
    const token = await jwtService.signAsync({
      sub: userId,
      exp: Math.floor(Date.now() / 1000) - 60,
    });

    await expect(service.verifyToken(token)).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
  });

  it('rejects a JWT signed with another secret', async () => {
    const otherJwtService = new JwtService({
      secret: 'different-test-secret',
      signOptions: { algorithm: 'HS256' },
    });

    const token = await otherJwtService.signAsync({
      sub: userId,
      exp: Math.floor(Date.now() / 1000) + 900,
    });

    await expect(service.verifyToken(token)).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
  });
});
