import { BadRequestException } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { InvitationAcceptanceService } from '../invitation-acceptance.service';
import { InvitationTokenService } from '../invitation-token.service';
import { PasswordHashingService } from '../password-hashing.service';

describe('InvitationAcceptanceService', () => {
  let service: InvitationAcceptanceService;
  let query: jest.Mock;
  let transaction: jest.Mock;
  let passwordHashingService: {
    hash: jest.Mock;
  };

  const tokenService = new InvitationTokenService();

  beforeEach(() => {
    query = jest.fn();

    transaction = jest.fn(async (callback) =>
      callback({ query }),
    );

    passwordHashingService = {
      hash: jest.fn().mockResolvedValue('argon2id-test-hash'),
    };

    service = new InvitationAcceptanceService(
      { transaction } as unknown as DataSource,
      tokenService,
      passwordHashingService as unknown as PasswordHashingService,
    );
  });


  it.each([
    ['short password', 'Short123!'],
    ['password exceeding 1024 characters', 'A'.repeat(1025)],
    ['non-string password', 123456789012],
    ['missing password', undefined],
  ])(
    'rejects invalid passwords before accessing the database: %s',
    async (_description, password) => {
      const { token } = tokenService.generate();

      await expect(
        service.accept(token, password as string),
      ).rejects.toThrow(
        'Password must contain between 12 and 1024 characters',
      );

      expect(transaction).not.toHaveBeenCalled();
      expect(passwordHashingService.hash).not.toHaveBeenCalled();
    },
  );

  it('rejects malformed tokens before accessing the database', async () => {
    await expect(
      service.accept('invalid-token', 'SecurePassword123!'),
    ).rejects.toThrow(BadRequestException);

    expect(transaction).not.toHaveBeenCalled();
    expect(passwordHashingService.hash).not.toHaveBeenCalled();
  });

  it('rejects expired invitations without activating the user', async () => {
    const { token } = tokenService.generate();

    query.mockResolvedValueOnce([
      {
        id: '22222222-2222-4222-8222-222222222222',
        user_id: '11111111-1111-4111-8111-111111111111',
        expires_at: new Date(Date.now() - 60_000),
        consumed_at: null,
      },
    ]);

    await expect(
      service.accept(token, 'SecurePassword123!'),
    ).rejects.toThrow(BadRequestException);

    expect(transaction).toHaveBeenCalledTimes(1);
    expect(query).toHaveBeenCalledTimes(1);
    expect(passwordHashingService.hash).not.toHaveBeenCalled();
  });

  it('rejects previously consumed invitations without activating the user', async () => {
    const { token } = tokenService.generate();

    query.mockResolvedValueOnce([
      {
        id: '22222222-2222-4222-8222-222222222222',
        user_id: '11111111-1111-4111-8111-111111111111',
        expires_at: new Date(Date.now() + 60_000),
        consumed_at: new Date(Date.now() - 60_000),
      },
    ]);

    await expect(
      service.accept(token, 'SecurePassword123!'),
    ).rejects.toThrow(BadRequestException);

    expect(transaction).toHaveBeenCalledTimes(1);
    expect(query).toHaveBeenCalledTimes(1);
    expect(passwordHashingService.hash).not.toHaveBeenCalled();
  });


  it('activates an invited user and consumes the invitation in one transaction', async () => {
    const { token, tokenHash } = tokenService.generate();

    const invitationId = '22222222-2222-4222-8222-222222222222';
    const userId = '11111111-1111-4111-8111-111111111111';

    query
      .mockResolvedValueOnce([
        {
          id: invitationId,
          user_id: userId,
          expires_at: new Date(Date.now() + 60_000),
          consumed_at: null,
        },
      ])
      .mockResolvedValueOnce([{ id: userId }])
      .mockResolvedValueOnce([[{ id: userId }], 1])
      .mockResolvedValueOnce([[{ id: invitationId }], 1]);

    await expect(
      service.accept(token, 'SecurePassword123!'),
    ).resolves.toBeUndefined();

    expect(transaction).toHaveBeenCalledTimes(1);
    expect(query).toHaveBeenCalledTimes(4);

    expect(query.mock.calls[0][0]).toContain('FOR UPDATE');
    expect(query.mock.calls[0][1]).toEqual([tokenHash]);

    expect(query.mock.calls[1][0]).toContain('FOR UPDATE');
    expect(query.mock.calls[1][1]).toEqual([userId]);

    expect(passwordHashingService.hash).toHaveBeenCalledWith(
      'SecurePassword123!',
    );

    expect(query.mock.calls[2][0]).toContain("status = 'active'");
    expect(query.mock.calls[2][1]).toEqual([
      'argon2id-test-hash',
      userId,
    ]);

    expect(query.mock.calls[3][0]).toContain('consumed_at = NOW()');
    expect(query.mock.calls[3][1]).toEqual([invitationId]);
  });


  it('propagates a failure when invitation consumption cannot be completed', async () => {
    const { token } = tokenService.generate();

    const invitationId = '22222222-2222-4222-8222-222222222222';
    const userId = '11111111-1111-4111-8111-111111111111';

    query
      .mockResolvedValueOnce([
        {
          id: invitationId,
          user_id: userId,
          expires_at: new Date(Date.now() + 60_000),
          consumed_at: null,
        },
      ])
      .mockResolvedValueOnce([{ id: userId }])
      .mockResolvedValueOnce([[{ id: userId }], 1])
      .mockRejectedValueOnce(
        new Error('Invitation consumption failed'),
      );

    await expect(
      service.accept(token, 'SecurePassword123!'),
    ).rejects.toThrow('Invitation consumption failed');

    expect(transaction).toHaveBeenCalledTimes(1);
    expect(query).toHaveBeenCalledTimes(4);

    expect(passwordHashingService.hash).toHaveBeenCalledTimes(1);

    expect(query.mock.calls[2][0]).toContain(
      "status = 'active'",
    );

    expect(query.mock.calls[3][0]).toContain(
      'consumed_at = NOW()',
    );
  });


  it('rejects activation when the user update affects zero rows', async () => {
    const { token } = tokenService.generate();

    const invitationId = '22222222-2222-4222-8222-222222222222';
    const userId = '11111111-1111-4111-8111-111111111111';

    query
      .mockResolvedValueOnce([
        {
          id: invitationId,
          user_id: userId,
          expires_at: new Date(Date.now() + 60_000),
          consumed_at: null,
        },
      ])
      .mockResolvedValueOnce([{ id: userId }])
      .mockResolvedValueOnce([[], 0]);

    await expect(
      service.accept(token, 'SecurePassword123!'),
    ).rejects.toThrow(BadRequestException);

    expect(transaction).toHaveBeenCalledTimes(1);
    expect(query).toHaveBeenCalledTimes(3);
    expect(passwordHashingService.hash).toHaveBeenCalledTimes(1);

    expect(query.mock.calls[2][0]).toContain('RETURNING id');
    expect(query.mock.calls[2][1]).toEqual([
      'argon2id-test-hash',
      userId,
    ]);
  });


  it('rejects acceptance when invitation consumption affects zero rows', async () => {
    const { token } = tokenService.generate();

    const invitationId = '22222222-2222-4222-8222-222222222222';
    const userId = '11111111-1111-4111-8111-111111111111';

    query
      .mockResolvedValueOnce([
        {
          id: invitationId,
          user_id: userId,
          expires_at: new Date(Date.now() + 60_000),
          consumed_at: null,
        },
      ])
      .mockResolvedValueOnce([{ id: userId }])
      .mockResolvedValueOnce([[{ id: userId }], 1])
      .mockResolvedValueOnce([[], 0]);

    await expect(
      service.accept(token, 'SecurePassword123!'),
    ).rejects.toThrow(BadRequestException);

    expect(transaction).toHaveBeenCalledTimes(1);
    expect(query).toHaveBeenCalledTimes(4);

    expect(passwordHashingService.hash).toHaveBeenCalledTimes(1);

    expect(query.mock.calls[2][0]).toContain('RETURNING id');
    expect(query.mock.calls[2][1]).toEqual([
      'argon2id-test-hash',
      userId,
    ]);

    expect(query.mock.calls[3][0]).toContain('RETURNING id');
    expect(query.mock.calls[3][1]).toEqual([invitationId]);
  });

});
