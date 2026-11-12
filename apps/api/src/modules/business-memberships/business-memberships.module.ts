import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { BusinessMembership } from '../auth/entities/business-membership.entity';
import { User } from '../auth/entities/user.entity';

import { BusinessMembershipsController } from './business-memberships.controller';
import { BusinessMembershipsService } from './business-memberships.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      BusinessMembership,
      User,
    ]),
  ],
  controllers: [BusinessMembershipsController],
  providers: [BusinessMembershipsService],
})
export class BusinessMembershipsModule {}