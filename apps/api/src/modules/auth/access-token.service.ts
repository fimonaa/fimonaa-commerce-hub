import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { validate as isUuid } from 'uuid';

@Injectable()
export class AccessTokenService {
  constructor(private readonly jwtService: JwtService) {}

  async issue(userId: string): Promise<string> {
    if (!isUuid(userId)) {
      throw new Error('Cannot issue access token for an invalid user ID');
    }

    return this.jwtService.signAsync({
      sub: userId,
    });
  }
}
