import { PasswordHashingService } from '../password-hashing.service';

describe('PasswordHashingService', () => {
  const service = new PasswordHashingService();

  const password = 'Fimonaa-Test-Password-2026!';

  it('creates an Argon2id hash without storing the plaintext password', async () => {
    const hash = await service.hash(password);

    expect(hash).toMatch(/^\$argon2id\$/);
    expect(hash).not.toContain(password);
  });

  it('verifies the correct password', async () => {
    const hash = await service.hash(password);

    await expect(service.verify(hash, password)).resolves.toBe(true);
  });

  it('rejects an incorrect password', async () => {
    const hash = await service.hash(password);

    await expect(
      service.verify(hash, 'Incorrect-Password-2026!'),
    ).resolves.toBe(false);
  });

  it('generates different salted hashes for the same password', async () => {
    const firstHash = await service.hash(password);
    const secondHash = await service.hash(password);

    expect(firstHash).not.toBe(secondHash);

    await expect(service.verify(firstHash, password)).resolves.toBe(true);
    await expect(service.verify(secondHash, password)).resolves.toBe(true);
  });
});
