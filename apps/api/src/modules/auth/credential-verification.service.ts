import { Injectable, UnauthorizedException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { User } from './entities/user.entity';
import { PasswordHashingService } from './password-hashing.service';

const DUMMY_PASSWORD_HASH =
  '$argon2id$v=19$m=19456,p=1,t=2$iBwUBBSQMeqintYcN8vS9A$l1AwLDwHLHMU0gjKmQew9ZFTNktx+YMqohhWLckyfO8';

@Injectable()
export class CredentialVerificationService {
  constructor(
    @InjectRepository(User)
    private readonly users: Repository<User>,
    private readonly passwordHashing: PasswordHashingService,
  ) {}

  async verify(email: string, password: string): Promise<string> {
    const invalidCredentials = () =>
      new UnauthorizedException('Invalid email or password');

    if (
      typeof email !== 'string' ||
      typeof password !== 'string' ||
      !email.trim() ||
      !password
    ) {
      throw invalidCredentials();
    }

    const normalizedEmail = email.trim().toLowerCase();

    const user = await this.users
      .createQueryBuilder('user')
      .addSelect('user.passwordHash')
      .where('LOWER(user.email) = :email', { email: normalizedEmail })
      .getOne();

    const eligibleUser =
      user?.status === 'active' && Boolean(user.passwordHash);

    const hashToVerify = eligibleUser
      ? user.passwordHash!
      : DUMMY_PASSWORD_HASH;

    let passwordValid: boolean;

    try {
      passwordValid = await this.passwordHashing.verify(
        hashToVerify,
        password,
      );
    } catch {
      throw invalidCredentials();
    }

    if (!eligibleUser || !passwordValid) {
      throw invalidCredentials();
    }

    return user!.id;
  }
}
