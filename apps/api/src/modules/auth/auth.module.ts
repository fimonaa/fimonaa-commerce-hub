import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { TypeOrmModule } from '@nestjs/typeorm';

import { BusinessMembership } from './entities/business-membership.entity';
import { Business } from './entities/business.entity';
import { User } from './entities/user.entity';
import { AuthenticationGuard } from './guards/authentication.guard';
import { RolesGuard } from './guards/roles.guard';
import { AuthenticationContextService } from './authentication-context.service';
import { JwtVerificationService } from './jwt-verification.service';

@Module({
  imports: [
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        secret: configService.getOrThrow<string>('JWT_SECRET'),
        signOptions: {
          algorithm: 'HS256',
          expiresIn: '15m',
        },
        verifyOptions: {
          algorithms: ['HS256'],
        },
      }),
    }),
    TypeOrmModule.forFeature([
      User,
      Business,
      BusinessMembership,
    ]),
  ],
  providers: [
    JwtVerificationService,
    AuthenticationContextService,
    { provide: APP_GUARD, useClass: AuthenticationGuard },
    { provide: APP_GUARD, useClass: RolesGuard },
  ],
  exports: [JwtVerificationService],
})
export class AuthModule {}
