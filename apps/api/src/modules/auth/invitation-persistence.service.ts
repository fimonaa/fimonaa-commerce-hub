import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, IsNull, MoreThan, Repository } from 'typeorm';
import { User } from './entities/user.entity';
import { BusinessMembership } from './entities/business-membership.entity';
import { UserInvitation } from './entities/user-invitation.entity';
import { InvitationTokenService } from './invitation-token.service';

export interface CreatedInvitation {
  invitationId: string;
  token: string;
  expiresAt: Date;
}

@Injectable()
export class InvitationPersistenceService {
  constructor(
    @InjectRepository(UserInvitation)
    private readonly invitationRepository: Repository<UserInvitation>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private readonly invitationTokenService: InvitationTokenService,
    @InjectRepository(BusinessMembership)
    private readonly membershipRepository: Repository<BusinessMembership>,
    private readonly dataSource: DataSource,
  ) {}

  async create(
    userId: string,
    businessId: string,
  ): Promise<CreatedInvitation> {
    return this.dataSource.transaction(async (manager) => {
      const userRepository = manager.getRepository(User);
      const membershipRepository =
        manager.getRepository(BusinessMembership);
      const invitationRepository =
        manager.getRepository(UserInvitation);

      const user = await userRepository.findOne({
        where: {
          id: userId,
          status: 'invited',
        },
        lock: {
          mode: 'pessimistic_write',
        },
      });

      if (!user) {
        throw new NotFoundException('Invited user not found');
      }

      const membership = await membershipRepository.findOne({
        where: {
          userId,
          businessId,
        },
      });

      if (!membership) {
        throw new NotFoundException('Invited user not found');
      }

      const existingInvitation = await invitationRepository.findOne({
        where: {
          userId,
          consumedAt: IsNull(),
          expiresAt: MoreThan(new Date()),
        },
      });

      if (existingInvitation) {
        throw new ConflictException(
          'An active invitation already exists for this user',
        );
      }

      const { token, tokenHash } =
        this.invitationTokenService.generate();

      const expiresAt = new Date(
        Date.now() + 24 * 60 * 60 * 1000,
      );

      const invitation = invitationRepository.create({
        userId,
        tokenHash,
        expiresAt,
      });

      const savedInvitation =
        await invitationRepository.save(invitation);

      return {
        invitationId: savedInvitation.id,
        token,
        expiresAt: savedInvitation.expiresAt,
      };
    });
  }
}
