import { Transform } from 'class-transformer';
import {
  IsEmail,
  IsNotEmpty,
  IsString,
  MaxLength,
} from 'class-validator';

export class LoginRequestDto {
  @Transform(({ value }) =>
    typeof value === 'string' ? value.trim().toLowerCase() : value,
  )
  @IsString()
  @IsNotEmpty()
  @IsEmail()
  @MaxLength(254)
  email!: string;

  // Preserve the password exactly as submitted.
  // Never trim, lowercase, or otherwise transform passwords.
  @IsString()
  @IsNotEmpty()
  @MaxLength(1024)
  password!: string;
}
