import { UnauthorizedException } from '@nestjs/common';
import { Repository } from 'typeorm';

import { CredentialVerificationService } from '../credential-verification.service';
import { PasswordHashingService } from '../password-hashing.service';
import { User } from '../entities/user.entity';

describe('CredentialVerificationService', () => {
  const userId = '550e8400-e29b-41d4-a716-446655440000';

  const activeUser = {
    id: userId,
    email: 'admin@example.com',
    passwordHash: 'stored-argon2-hash',
    status: 'active',
  } as User;

  const getOne = jest.fn();
  const addSelect = jest.fn();
  const where = jest.fn();
  const createQueryBuilder = jest.fn();

  const passwordHashing = {
    verify: jest.fn(),
  };

  let service: CredentialVerificationService;

  beforeEach(() => {
    jest.clearAllMocks();

    getOne.mockResolvedValue(activeUser);
    addSelect.mockReturnValue({ where });
    where.mockReturnValue({ getOne });
    createQueryBuilder.mockReturnValue({ addSelect });

    passwordHashing.verify.mockResolvedValue(true);

    const users = {
      createQueryBuilder,
    } as unknown as Repository<User>;

    service = new CredentialVerificationService(
      users,
      passwordHashing as unknown as PasswordHashingService,
    );
  });

  it('authenticates an active user with the correct password', async () => {
    const result = await service.verify('admin@example.com', 'correct-password');

    expect(result).toBe(userId);
    expect(passwordHashing.verify).toHaveBeenCalledWith(
      'stored-argon2-hash',
      'correct-password',
    );
  });

  it('normalizes email addresses before querying', async () => {
    await service.verify('  ADMIN@EXAMPLE.COM  ', 'correct-password');

    expect(where).toHaveBeenCalledWith(
      'LOWER(user.email) = :email',
      { email: 'admin@example.com' },
    );
  });

  it('explicitly selects the password hash', async () => {
    await service.verify('admin@example.com', 'correct-password');

    expect(addSelect).toHaveBeenCalledWith('user.passwordHash');
  });

  it('rejects an incorrect password', async () => {
    passwordHashing.verify.mockResolvedValue(false);

    await expect(
      service.verify('admin@example.com', 'wrong-password'),
    ).rejects.toThrow(UnauthorizedException);
  });

  it('rejects an unknown user', async () => {
    getOne.mockResolvedValue(null);

    await expect(
      service.verify('unknown@example.com', 'password'),
    ).rejects.toThrow('Invalid email or password');
  });

  it.each(['invited', 'disabled'] as const)(
    'rejects a user with %s status',
    async (status) => {
      getOne.mockResolvedValue({ ...activeUser, status });

      await expect(
        service.verify('admin@example.com', 'password'),
      ).rejects.toThrow(UnauthorizedException);
    },
  );

  it('rejects accounts without a password hash', async () => {
    getOne.mockResolvedValue({ ...activeUser, passwordHash: null });

    await expect(
      service.verify('admin@example.com', 'password'),
    ).rejects.toThrow(UnauthorizedException);
  });

  it('rejects password verification errors without exposing details', async () => {
    passwordHashing.verify.mockRejectedValue(new Error('Internal hash error'));

    await expect(
      service.verify('admin@example.com', 'password'),
    ).rejects.toThrow('Invalid email or password');
  });

  it('performs dummy-hash verification for unknown users', async () => {
    getOne.mockResolvedValue(null);

    await expect(
      service.verify('unknown@example.com', 'password'),
    ).rejects.toThrow('Invalid email or password');

    expect(passwordHashing.verify).toHaveBeenCalledTimes(1);
    expect(passwordHashing.verify).toHaveBeenCalledWith(
      expect.stringMatching(/^\$argon2id\$/),
      'password',
    );
  });

  it('never authenticates inactive users even when dummy verification succeeds', async () => {
    getOne.mockResolvedValue({ ...activeUser, status: 'disabled' });
    passwordHashing.verify.mockResolvedValue(true);

    await expect(
      service.verify('admin@example.com', 'password'),
    ).rejects.toThrow('Invalid email or password');

    expect(passwordHashing.verify).toHaveBeenCalledTimes(1);
    expect(passwordHashing.verify).toHaveBeenCalledWith(
      expect.stringMatching(/^\$argon2id\$/),
      'password',
    );
  });

  it('rejects empty credentials', async () => {
    await expect(service.verify('', '')).rejects.toThrow(
      UnauthorizedException,
    );

    expect(createQueryBuilder).not.toHaveBeenCalled();
  });
});
