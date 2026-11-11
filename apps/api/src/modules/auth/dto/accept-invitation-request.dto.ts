import {
  IsNotEmpty,
  IsString,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';

export class AcceptInvitationRequestDto {
  @IsString()
  @Matches(/^[A-Za-z0-9_-]{43}$/, {
    message: 'Invalid invitation token format',
  })
  token!: string;

  // Preserve passwords exactly as submitted.
  // Never trim, lowercase, or normalize password values.
  @IsString()
  @IsNotEmpty()
  @MinLength(12)
  @MaxLength(1024)
  password!: string;
}
