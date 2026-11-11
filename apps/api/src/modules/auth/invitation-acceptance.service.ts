import {
  BadRequestException,
  Injectable,
} from '@nestjs/common';
import { DataSource } from 'typeorm';
import { InvitationTokenService } from './invitation-token.service';
import { PasswordHashingService } from './password-hashing.service';

interface InvitationRow {
  id: string;
  user_id: string;
  expires_at: Date;
  consumed_at: Date | null;
}

@Injectable()
export class InvitationAcceptanceService {
  constructor(
    private readonly dataSource: DataSource,
    private readonly invitationTokenService: InvitationTokenService,
    private readonly passwordHashingService: PasswordHashingService,
  ) {}

  async accept(token: string, password: string): Promise<void> {
    if (
      typeof password !== 'string' ||
      password.length < 12 ||
      password.length > 1024
    ) {
      throw new BadRequestException(
        'Password must contain between 12 and 1024 characters',
      );
    }

    let tokenHash: string;

    try {
      tokenHash = this.invitationTokenService.hash(token);
    } catch {
      throw new BadRequestException('Invalid or expired invitation');
    }

    return this.dataSource.transaction(async (manager) => {
      const invitations: InvitationRow[] = await manager.query(
        `
          SELECT id, user_id, expires_at, consumed_at
          FROM user_invitations
          WHERE token_hash = $1
          FOR UPDATE
        `,
        [tokenHash],
      );

      const invitation = invitations[0];

      if (
        !invitation ||
        invitation.consumed_at !== null ||
        new Date(invitation.expires_at).getTime() <= Date.now()
      ) {
        throw new BadRequestException('Invalid or expired invitation');
      }

      const users: Array<{ id: string }> = await manager.query(
        `
          SELECT id
          FROM users
          WHERE id = $1
            AND status = 'invited'
          FOR UPDATE
        `,
        [invitation.user_id],
      );

      if (users.length !== 1) {
        throw new BadRequestException('Invalid or expired invitation');
      }

      const passwordHash = await this.passwordHashingService.hash(password);

      const activatedUsers: [Array<{ id: string }>, number] = await manager.query(
        `
          UPDATE users
          SET password_hash = $1,
              status = 'active',
              updated_at = NOW()
          WHERE id = $2
            AND status = 'invited'
          RETURNING id
        `,
        [passwordHash, invitation.user_id],
      );

      if (activatedUsers[0].length !== 1 || activatedUsers[1] !== 1) {
        throw new BadRequestException('Invalid or expired invitation');
      }

      const consumedInvitations: [Array<{ id: string }>, number] = await manager.query(
        `
          UPDATE user_invitations
          SET consumed_at = NOW()
          WHERE id = $1
            AND consumed_at IS NULL
          RETURNING id
        `,
        [invitation.id],
      );

      if (consumedInvitations[0].length !== 1 || consumedInvitations[1] !== 1) {
        throw new BadRequestException('Invalid or expired invitation');
      }
    });
  }
}
