import { UnauthorizedException } from '@nestjs/common';

import { LoginService } from '../login.service';
import { CredentialVerificationService } from '../credential-verification.service';
import { AccessTokenService } from '../access-token.service';

describe('LoginService', () => {
  const userId = '550e8400-e29b-41d4-a716-446655440000';

  const credentials = {
    verify: jest.fn(),
  };

  const accessTokens = {
    issue: jest.fn(),
  };

  let service: LoginService;

  beforeEach(() => {
    jest.clearAllMocks();

    credentials.verify.mockResolvedValue(userId);
    accessTokens.issue.mockResolvedValue('signed-access-token');

    service = new LoginService(
      credentials as unknown as CredentialVerificationService,
      accessTokens as unknown as AccessTokenService,
    );
  });

  it('issues an access token after successful authentication', async () => {
    const result = await service.login(
      'admin@example.com',
      'correct-password',
    );

    expect(credentials.verify).toHaveBeenCalledWith(
      'admin@example.com',
      'correct-password',
    );

    expect(accessTokens.issue).toHaveBeenCalledWith(userId);

    expect(result).toEqual({
      accessToken: 'signed-access-token',
      tokenType: 'Bearer',
      expiresIn: 900,
    });
  });

  it('never issues a token when credentials are invalid', async () => {
    credentials.verify.mockRejectedValue(
      new UnauthorizedException('Invalid email or password'),
    );

    await expect(
      service.login('admin@example.com', 'wrong-password'),
    ).rejects.toThrow(UnauthorizedException);

    expect(accessTokens.issue).not.toHaveBeenCalled();
  });

  it('does not return a successful login when token issuance fails', async () => {
    accessTokens.issue.mockRejectedValue(
      new Error('Token signing failed'),
    );

    await expect(
      service.login('admin@example.com', 'correct-password'),
    ).rejects.toThrow('Token signing failed');

    expect(credentials.verify).toHaveBeenCalledTimes(1);
    expect(accessTokens.issue).toHaveBeenCalledTimes(1);
  });
});
