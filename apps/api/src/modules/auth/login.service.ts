import { Injectable } from '@nestjs/common';

import { AccessTokenService } from './access-token.service';
import { CredentialVerificationService } from './credential-verification.service';

export interface LoginResult {
  accessToken: string;
  tokenType: 'Bearer';
  expiresIn: 900;
}

@Injectable()
export class LoginService {
  constructor(
    private readonly credentials: CredentialVerificationService,
    private readonly accessTokens: AccessTokenService,
  ) {}

  async login(email: string, password: string): Promise<LoginResult> {
    const userId = await this.credentials.verify(email, password);

    const accessToken = await this.accessTokens.issue(userId);

    return {
      accessToken,
      tokenType: 'Bearer',
      expiresIn: 900,
    };
  }
}
