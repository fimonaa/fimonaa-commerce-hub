import { Injectable } from '@nestjs/common';
import { createHash, randomBytes } from 'node:crypto';

export interface GeneratedInvitationToken {
  token: string;
  tokenHash: string;
}

@Injectable()
export class InvitationTokenService {
  generate(): GeneratedInvitationToken {
    const token = randomBytes(32).toString('base64url');

    return {
      token,
      tokenHash: this.hash(token),
    };
  }

  hash(token: string): string {
    if (
      typeof token !== 'string' ||
      !/^[A-Za-z0-9_-]{43}$/.test(token)
    ) {
      throw new Error('Invalid invitation token format');
    }

    return createHash('sha256')
      .update(token, 'utf8')
      .digest('hex');
  }
}
