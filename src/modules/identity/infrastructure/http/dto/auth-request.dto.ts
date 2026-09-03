import { IsEmail, IsNotEmpty, IsOptional, IsString, MinLength } from 'class-validator';

export class RegisterRequestDto {
  @IsEmail()
  email!: string;

  @IsString()
  @IsNotEmpty()
  phone!: string;

  @IsString()
  @IsNotEmpty()
  username!: string;

  @IsString()
  @MinLength(8)
  password!: string;
}

export class LoginRequestDto {
  @IsOptional()
  @IsString()
  username?: string;

  @IsOptional()
  @IsString()
  identifier?: string;

  @IsString()
  @IsNotEmpty()
  password!: string;
}

export class ForgotPasswordRequestDto {
  @IsString()
  @IsNotEmpty()
  username!: string;
}

export class ResetPasswordRequestDto {
  @IsString()
  @IsNotEmpty()
  token!: string;

  @IsString()
  @MinLength(8)
  newPassword!: string;
}

export class ChangePasswordRequestDto {
  @IsString()
  @IsNotEmpty()
  currentPassword!: string;

  @IsString()
  @MinLength(8)
  newPassword!: string;
}

export class RefreshTokenRequestDto {
  @IsOptional()
  @IsString()
  refreshToken?: string;
}

export class LogoutRequestDto {
  @IsOptional()
  @IsString()
  refreshToken?: string;

  @IsOptional()
  @IsString()
  sessionId?: string;
}

export class VerifyEmailRequestDto {
  @IsString()
  @IsNotEmpty()
  token!: string;
}

export class VerifyPhoneRequestDto {
  @IsString()
  @IsNotEmpty()
  code!: string;
}

export class TwoFactorCodeRequestDto {
  @IsString()
  @IsNotEmpty()
  code!: string;
}

export class VerifyTwoFactorLoginRequestDto {
  @IsString()
  @IsNotEmpty()
  tempToken!: string;

  @IsString()
  @IsNotEmpty()
  code!: string;
}

export class UpdateProfileRequestDto {
  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsString()
  phone?: string;
}

export class DeleteAccountRequestDto {
  @IsString()
  @IsNotEmpty()
  password!: string;
}
