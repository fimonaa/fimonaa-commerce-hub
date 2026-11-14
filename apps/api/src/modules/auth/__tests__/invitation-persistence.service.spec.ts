import { ConflictException, NotFoundException } from '@nestjs/common';
import { InvitationPersistenceService } from '../invitation-persistence.service';
import { InvitationTokenService } from '../invitation-token.service';

describe('InvitationPersistenceService', () => {
  const userId = '11111111-1111-4111-8111-111111111111';
  const invitationId = '22222222-2222-4222-8222-222222222222';
  const businessId = '33333333-3333-4333-8333-333333333333';

  let service: InvitationPersistenceService;
  let invitationRepository: {
    create: jest.Mock;
    save: jest.Mock;
    findOne: jest.Mock;
  };
  let userRepository: {
    findOne: jest.Mock;
  };
  let membershipRepository: {
    findOne: jest.Mock;
  };
  let tokenService: InvitationTokenService;
  let dataSource: {
    transaction: jest.Mock;
  };

  beforeEach(() => {
    invitationRepository = {
      create: jest.fn((data) => ({ ...data })),
      save: jest.fn(async (data) => ({
        ...data,
        id: invitationId,
      })),
      findOne: jest.fn().mockResolvedValue(null),
    };

    userRepository = {
      findOne: jest.fn().mockResolvedValue({
        id: userId,
        status: 'invited',
      }),
    };

    membershipRepository = {
      findOne: jest.fn().mockResolvedValue({
        userId,
        businessId,
        role: 'operator',
      }),
    };

    tokenService = new InvitationTokenService();

    dataSource = {
      transaction: jest.fn(async (callback) =>
        callback({
          getRepository: jest.fn((entity) => {
            if (entity.name === 'User') return userRepository;
            if (entity.name === 'BusinessMembership') {
              return membershipRepository;
            }
            if (entity.name === 'UserInvitation') {
              return invitationRepository;
            }
            throw new Error('Unexpected repository');
          }),
        }),
      ),
    };

    service = new InvitationPersistenceService(
      invitationRepository as never,
      userRepository as never,
      tokenService,
      membershipRepository as never,
      dataSource as never,
    );
  });

  it('creates an invitation for an invited user without storing the raw token', async () => {
    const before = Date.now();

    const result = await service.create(userId, businessId);

    const after = Date.now();

    expect(userRepository.findOne).toHaveBeenCalledWith({
      where: {
        id: userId,
        status: 'invited',
      },
      lock: {
        mode: 'pessimistic_write',
      },
    });

    expect(membershipRepository.findOne).toHaveBeenCalledWith({
      where: {
        userId,
        businessId,
        status: 'active',
      },
    });

    expect(result.invitationId).toBe(invitationId);
    expect(result.token).toMatch(/^[A-Za-z0-9_-]{43}$/);

    const savedData = invitationRepository.create.mock.calls[0][0];

    expect(savedData.userId).toBe(userId);
    expect(savedData.tokenHash).toBe(tokenService.hash(result.token));
    expect(savedData).not.toHaveProperty('token');

    expect(savedData.expiresAt.getTime()).toBeGreaterThanOrEqual(
      before + 24 * 60 * 60 * 1000,
    );

    expect(savedData.expiresAt.getTime()).toBeLessThanOrEqual(
      after + 24 * 60 * 60 * 1000,
    );

    expect(invitationRepository.save).toHaveBeenCalledTimes(1);
    expect(result.expiresAt).toEqual(savedData.expiresAt);
  });

  it('locks the invited user before creating an invitation', async () => {
    await service.create(userId, businessId);

    expect(userRepository.findOne).toHaveBeenCalledWith({
      where: {
        id: userId,
        status: 'invited',
      },
      lock: {
        mode: 'pessimistic_write',
      },
    });
  });

  it('creates invitations inside a database transaction', async () => {
    await service.create(userId, businessId);

    expect(dataSource.transaction).toHaveBeenCalledTimes(1);
  });

  it('rejects duplicate active invitations', async () => {
    invitationRepository.findOne.mockResolvedValue({
      id: invitationId,
      userId,
      consumedAt: null,
      expiresAt: new Date(Date.now() + 60 * 60 * 1000),
    });

    await expect(
      service.create(userId, businessId),
    ).rejects.toThrow(ConflictException);

    expect(invitationRepository.findOne).toHaveBeenCalledTimes(1);
    expect(invitationRepository.create).not.toHaveBeenCalled();
    expect(invitationRepository.save).not.toHaveBeenCalled();
  });

  it('allows a new invitation when previous invitations have expired', async () => {
    invitationRepository.findOne.mockResolvedValue(null);

    const result = await service.create(userId, businessId);

    expect(invitationRepository.findOne).toHaveBeenCalledWith({
      where: {
        userId,
        consumedAt: expect.objectContaining({
          _type: 'isNull',
        }),
        expiresAt: expect.objectContaining({
          _type: 'moreThan',
        }),
      },
    });

    expect(invitationRepository.save).toHaveBeenCalledTimes(1);
    expect(result.invitationId).toBe(invitationId);
  });

  it('rejects invitations for users outside the specified business', async () => {
    membershipRepository.findOne.mockResolvedValue(null);

    await expect(
      service.create(userId, businessId),
    ).rejects.toThrow(NotFoundException);

    expect(membershipRepository.findOne).toHaveBeenCalledWith({
      where: {
        userId,
        businessId,
        status: 'active',
      },
    });

    expect(invitationRepository.create).not.toHaveBeenCalled();
    expect(invitationRepository.save).not.toHaveBeenCalled();
  });

  it('rejects users who are not eligible for an invitation', async () => {
    userRepository.findOne.mockResolvedValue(null);

    await expect(service.create(userId, businessId)).rejects.toThrow(
      NotFoundException,
    );

    expect(invitationRepository.create).not.toHaveBeenCalled();
    expect(invitationRepository.save).not.toHaveBeenCalled();
  });
});
