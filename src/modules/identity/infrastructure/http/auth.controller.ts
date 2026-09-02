import {
  BadRequestException,
  Body,
  ConflictException,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import { RegisterUserUseCase } from '../../application/use-cases/register-user.use-case.js';
import { LoginUserUseCase } from '../../application/use-cases/login-user.use-case.js';
import { RequestPasswordResetUseCase } from '../../application/use-cases/request-password-reset.use-case.js';
import { ResetPasswordUseCase } from '../../application/use-cases/reset-password.use-case.js';
import { GetCurrentUserUseCase } from '../../application/use-cases/get-current-user.use-case.js';
import { LogoutUserUseCase } from '../../application/use-cases/logout-user.use-case.js';
import { ChangePasswordUseCase } from '../../application/use-cases/change-password.use-case.js';
import {
  AccountLimitReachedError,
  IdentityDomainError,
  InvalidCredentialsError,
  InvalidResetTokenError,
  UsernameAlreadyTakenError,
  UserNotFoundError,
} from '../../domain/errors/identity.errors.js';
import { AuthGuard } from './auth.guard.js';
import { AccessToken, CurrentUser } from './current-user.decorator.js';
import type { AuthenticatedUser } from '../../application/dto/auth.dto.js';

class RegisterRequestDto {
  email!: string;
  phone!: string;
  username!: string;
  password!: string;
}

class LoginRequestDto {
  username!: string;
  password!: string;
}

class ForgotPasswordRequestDto {
  username!: string;
}

class ResetPasswordRequestDto {
  token!: string;
  newPassword!: string;
}

class ChangePasswordRequestDto {
  currentPassword!: string;
  newPassword!: string;
}

@Controller('auth')
export class AuthController {
  constructor(
    private readonly registerUser: RegisterUserUseCase,
    private readonly loginUser: LoginUserUseCase,
    private readonly requestPasswordReset: RequestPasswordResetUseCase,
    private readonly resetPassword: ResetPasswordUseCase,
    private readonly getCurrentUser: GetCurrentUserUseCase,
    private readonly logoutUser: LogoutUserUseCase,
    private readonly changePassword: ChangePasswordUseCase,
  ) {}

  @Post('register')
  async register(@Body() body: RegisterRequestDto) {
    if (!body?.email || !body?.phone || !body?.username || !body?.password) {
      throw new BadRequestException(
        'email, phone, username and password are required',
      );
    }

    try {
      return await this.registerUser.execute({
        email: body.email,
        phone: body.phone,
        username: body.username,
        password: body.password,
      });
    } catch (error) {
      this.mapDomainError(error);
    }
  }

  @Post('login')
  @HttpCode(200)
  async login(@Body() body: LoginRequestDto) {
    if (!body?.username || !body?.password) {
      throw new BadRequestException('username and password are required');
    }

    try {
      return await this.loginUser.execute({
        username: body.username,
        password: body.password,
      });
    } catch (error) {
      this.mapDomainError(error);
    }
  }

  @Post('forgot-password')
  @HttpCode(200)
  async forgotPassword(@Body() body: ForgotPasswordRequestDto) {
    if (!body?.username) {
      throw new BadRequestException('username is required');
    }

    return this.requestPasswordReset.execute({ username: body.username });
  }

  @Post('reset-password')
  @HttpCode(200)
  async resetPasswordHandler(@Body() body: ResetPasswordRequestDto) {
    if (!body?.token || !body?.newPassword) {
      throw new BadRequestException('token and newPassword are required');
    }

    try {
      return await this.resetPassword.execute({
        token: body.token,
        newPassword: body.newPassword,
      });
    } catch (error) {
      this.mapDomainError(error);
    }
  }

  @Get('me')
  @UseGuards(AuthGuard)
  async me(@CurrentUser() user: AuthenticatedUser) {
    try {
      return await this.getCurrentUser.execute({ userId: user.userId });
    } catch (error) {
      this.mapDomainError(error);
    }
  }

  @Post('logout')
  @UseGuards(AuthGuard)
  @HttpCode(HttpStatus.NO_CONTENT)
  async logout(
    @CurrentUser() user: AuthenticatedUser,
    @AccessToken() accessToken: string,
  ) {
    await this.logoutUser.execute({
      userId: user.userId,
      accessToken,
    });
  }

  @Post('change-password')
  @UseGuards(AuthGuard)
  @HttpCode(200)
  async changePasswordHandler(
    @CurrentUser() user: AuthenticatedUser,
    @Body() body: ChangePasswordRequestDto,
  ) {
    if (!body?.currentPassword || !body?.newPassword) {
      throw new BadRequestException(
        'currentPassword and newPassword are required',
      );
    }

    try {
      return await this.changePassword.execute({
        userId: user.userId,
        currentPassword: body.currentPassword,
        newPassword: body.newPassword,
      });
    } catch (error) {
      this.mapDomainError(error);
    }
  }

  private mapDomainError(error: unknown): never {
    if (
      error instanceof AccountLimitReachedError ||
      error instanceof UsernameAlreadyTakenError
    ) {
      throw new ConflictException(error.message);
    }

    if (
      error instanceof InvalidCredentialsError ||
      error instanceof InvalidResetTokenError ||
      error instanceof UserNotFoundError
    ) {
      throw new UnauthorizedException(error.message);
    }

    if (error instanceof IdentityDomainError) {
      throw new BadRequestException(error.message);
    }

    throw error;
  }
}
