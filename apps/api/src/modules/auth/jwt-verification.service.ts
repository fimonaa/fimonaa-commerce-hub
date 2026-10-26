import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { validate as isUuid } from 'uuid';

import type { JwtPayload } from './types/jwt-payload.type';

@Injectable()
export class JwtVerificationService {
  constructor(private readonly jwtService: JwtService) {}

  async verifyToken(token: string): Promise<JwtPayload> {
    try {
      const payload = await this.jwtService.verifyAsync<JwtPayload>(token);

      if (
        !payload ||
        typeof payload.sub !== 'string' ||
        !isUuid(payload.sub) ||
        typeof payload.exp !== 'number'
      ) {
        throw new UnauthorizedException('Invalid authentication token');
      }

      return payload;
    } catch {
      throw new UnauthorizedException('Invalid or expired authentication token');
    }
  }
}
