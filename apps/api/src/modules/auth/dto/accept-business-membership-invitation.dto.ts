import {
  IsString,
  Matches,
} from 'class-validator';

export class AcceptBusinessMembershipInvitationDto {
  @IsString()
  @Matches(/^[A-Za-z0-9_-]{43}$/, {
    message: 'Invalid invitation token format',
  })
  token!: string;
}