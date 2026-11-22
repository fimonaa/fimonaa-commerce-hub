import { Module } from "@nestjs/common";
import { APP_GUARD } from "@nestjs/core";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { JwtModule } from "@nestjs/jwt";
import { TypeOrmModule } from "@nestjs/typeorm";

import { BusinessMembership } from "./entities/business-membership.entity";
import { Business } from "./entities/business.entity";
import { User } from "./entities/user.entity";
import { UserInvitation } from "./entities/user-invitation.entity";
import { AuthenticationGuard } from "./guards/authentication.guard";
import { RolesGuard } from "./guards/roles.guard";
import { AuthenticationContextService } from "./authentication-context.service";
import { JwtVerificationService } from "./jwt-verification.service";
import { PasswordHashingService } from "./password-hashing.service";
import { AccessTokenService } from "./access-token.service";
import { CredentialVerificationService } from "./credential-verification.service";
import { LoginService } from "./login.service";
import { AuthController } from "./auth.controller";
import { InvitationTokenService } from "./invitation-token.service";
import { InvitationPersistenceService } from "./invitation-persistence.service";
import { InvitationAcceptanceService } from "./invitation-acceptance.service";
import { BusinessMembershipInvitation } from "./entities/business-membership-invitation.entity";
import { BusinessMembershipInvitationIssuanceService } from "./business-membership-invitation-issuance.service";
import { BusinessMembershipInvitationAcceptanceService } from "./business-membership-invitation-acceptance.service";
import { BusinessMembershipInvitationManagementService } from "./business-membership-invitation-management.service";

@Module({
  imports: [
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        secret: configService.getOrThrow<string>("JWT_SECRET"),
        signOptions: {
          algorithm: "HS256",
          expiresIn: "15m",
        },
        verifyOptions: {
          algorithms: ["HS256"],
        },
      }),
    }),
    TypeOrmModule.forFeature([
      User,
      Business,
      BusinessMembership,
      UserInvitation,
      BusinessMembershipInvitation,
    ]),
  ],
  controllers: [AuthController],
  providers: [
    JwtVerificationService,
    PasswordHashingService,
    AccessTokenService,
    CredentialVerificationService,
    LoginService,
    InvitationTokenService,
    InvitationPersistenceService,
    InvitationAcceptanceService,
    BusinessMembershipInvitationIssuanceService,
    BusinessMembershipInvitationAcceptanceService,
    BusinessMembershipInvitationManagementService,
    AuthenticationContextService,
    { provide: APP_GUARD, useClass: AuthenticationGuard },
    { provide: APP_GUARD, useClass: RolesGuard },
  ],
  exports: [JwtVerificationService],
})
export class AuthModule {}
