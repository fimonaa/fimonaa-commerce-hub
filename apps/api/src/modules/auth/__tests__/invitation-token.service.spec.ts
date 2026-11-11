import { createHash } from 'node:crypto';
import { InvitationTokenService } from '../invitation-token.service';

describe('InvitationTokenService', () => {
  let service: InvitationTokenService;

  beforeEach(() => {
    service = new InvitationTokenService();
  });

  it('generates a URL-safe invitation token with 256 bits of randomness', () => {
    const result = service.generate();

    expect(result.token).toMatch(/^[A-Za-z0-9_-]{43}$/);
    expect(Buffer.from(result.token, 'base64url')).toHaveLength(32);
  });

  it('generates a unique token for each invitation', () => {
    const first = service.generate();
    const second = service.generate();

    expect(first.token).not.toBe(second.token);
    expect(first.tokenHash).not.toBe(second.tokenHash);
  });

  it('generates the correct SHA-256 token hash', () => {
    const result = service.generate();

    const expectedHash = createHash('sha256')
      .update(result.token, 'utf8')
      .digest('hex');

    expect(result.tokenHash).toBe(expectedHash);
    expect(result.tokenHash).toMatch(/^[a-f0-9]{64}$/);
  });

  it('produces a deterministic hash for the same token', () => {
    const { token, tokenHash } = service.generate();

    expect(service.hash(token)).toBe(tokenHash);
    expect(service.hash(token)).toBe(tokenHash);
  });

  it.each([
    '',
    'invalid-token',
    'a'.repeat(42),
    'a'.repeat(44),
    'a'.repeat(42) + '+',
    'a'.repeat(42) + '/',
    'a'.repeat(42) + '=',
  ])('rejects invalid token format: %s', (token) => {
    expect(() => service.hash(token)).toThrow(
      'Invalid invitation token format',
    );
  });

  it('rejects non-string token input', () => {
    expect(() => service.hash(null as unknown as string)).toThrow(
      'Invalid invitation token format',
    );

    expect(() => service.hash(123 as unknown as string)).toThrow(
      'Invalid invitation token format',
    );
  });
});
