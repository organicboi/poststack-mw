import {
  IsEmail,
  IsString,
  MinLength,
  MaxLength,
  IsOptional,
  Matches,
  IsUrl,
  IsIn
} from 'class-validator';
import { Expose, Transform } from 'class-transformer';

export class RegisterDto {
  @Expose()
  @IsEmail({}, { message: 'Please provide a valid email address' })
  @Transform(({ value }) => value?.toLowerCase().trim())
  email!: string;

  @Expose()
  @IsString({ message: 'Password must be a string' })
  @MinLength(8, { message: 'Password must be at least 8 characters long' })
  @MaxLength(128, { message: 'Password must not exceed 128 characters' })
  @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/, {
    message: 'Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character'
  })
  password!: string;

  @Expose()
  @IsOptional()
  @IsString({ message: 'Full name must be a string' })
  @MaxLength(100, { message: 'Full name must not exceed 100 characters' })
  @Transform(({ value }) => value?.trim())
  fullName?: string;

  @Expose()
  @IsOptional()
  @IsUrl({}, { message: 'Please provide a valid redirect URL' })
  redirectTo?: string;
}

export class LoginDto {
  @Expose()
  @IsEmail({}, { message: 'Please provide a valid email address' })
  @Transform(({ value }) => value?.toLowerCase().trim())
  email!: string;

  @Expose()
  @IsString({ message: 'Password must be a string' })
  @MinLength(1, { message: 'Password is required' })
  password!: string;

  @Expose()
  @IsOptional()
  @IsUrl({}, { message: 'Please provide a valid redirect URL' })
  redirectTo?: string;
}

export class ResetPasswordDto {
  @Expose()
  @IsEmail({}, { message: 'Please provide a valid email address' })
  @Transform(({ value }) => value?.toLowerCase().trim())
  email!: string;

  @Expose()
  @IsOptional()
  @IsUrl({}, { message: 'Please provide a valid redirect URL' })
  redirectTo?: string;
}

export class UpdatePasswordDto {
  @Expose()
  @IsString({ message: 'New password must be a string' })
  @MinLength(8, { message: 'Password must be at least 8 characters long' })
  @MaxLength(128, { message: 'Password must not exceed 128 characters' })
  @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/, {
    message: 'Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character'
  })
  password!: string;

  @Expose()
  @IsString({ message: 'Access token is required' })
  @MinLength(1, { message: 'Access token is required' })
  accessToken!: string;

  @Expose()
  @IsString({ message: 'Refresh token is required' })
  @MinLength(1, { message: 'Refresh token is required' })
  refreshToken!: string;
}

export class OAuthLoginDto {
  @Expose()
  @IsString({ message: 'Provider must be a string' })
  @IsIn(['google', 'github', 'microsoft', 'facebook'], {
    message: 'Provider must be one of: google, github, microsoft, facebook'
  })
  provider!: string;

  @Expose()
  @IsOptional()
  @IsUrl({}, { message: 'Please provide a valid redirect URL' })
  redirectTo?: string;

  @Expose()
  @IsOptional()
  @IsString({ message: 'Scopes must be a string' })
  scopes?: string;
}

export class RefreshTokenDto {
  @Expose()
  @IsString({ message: 'Refresh token is required' })
  @MinLength(1, { message: 'Refresh token is required' })
  refreshToken!: string;
}

export class VerifyEmailDto {
  @Expose()
  @IsString({ message: 'Token is required' })
  @MinLength(1, { message: 'Token is required' })
  token!: string;

  @Expose()
  @IsString({ message: 'Token hash is required' })
  @MinLength(1, { message: 'Token hash is required' })
  tokenHash!: string;

  @Expose()
  @IsOptional()
  @IsUrl({}, { message: 'Please provide a valid redirect URL' })
  redirectTo?: string;
}