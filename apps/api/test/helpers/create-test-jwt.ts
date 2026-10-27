import { JwtService } from '@nestjs/jwt';
import { validate as isUuid } from 'uuid';

export async function createTestJwt(userId: string): Promise<string> {
  if (!isUuid(userId)) {
    throw new Error('Test JWT requires a valid user UUID.');
  }

  const secret = process.env.JWT_SECRET;

  if (!secret || secret.length < 64) {
    throw new Error('Integration-test JWT secret is missing or invalid.');
  }

  const jwtService = new JwtService({
    secret,
    signOptions: {
      algorithm: 'HS256',
      expiresIn: '15m',
    },
  });

  return jwtService.signAsync({ sub: userId });
}
