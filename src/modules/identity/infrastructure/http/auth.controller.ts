import {
  BadRequestException,
  Body,
  ConflictException,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpException,
  HttpStatus,
  Param,
  Patch,
  Post,
  Req,
  Res,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import type { Request, Response } from 'express';
import { RegisterUserUseCase } from '../../application/use-cases/register-user.use-case.js';
import { LoginUserUseCase } from '../../application/use-cases/login-user.use-case.js';
import { RequestPasswordResetUseCase } from '../../application/use-cases/request-password-reset.use-case.js';
import { ResetPasswordUseCase } from '../../application/use-cases/reset-password.use-case.js';
import { GetCurrentUserUseCase } from '../../application/use-cases/get-current-user.use-case.js';
import { LogoutUserUseCase } from '../../application/use-cases/logout-user.use-case.js';
import { ChangePasswordUseCase } from '../../application/use-cases/change-password.use-case.js';
import { RefreshAccessTokenUseCase } from '../../application/use-cases/refresh-access-token.use-case.js';
import {
  ResendVerificationUseCase,
  VerifyEmailUseCase,
} from '../../application/use-cases/verify-email.use-case.js';
import {
  SendPhoneOtpUseCase,
  VerifyPhoneUseCase,
} from '../../application/use-cases/phone-verification.use-case.js';
import {
  ConfirmTwoFactorUseCase,
  DisableTwoFactorUseCase,
  SetupTwoFactorUseCase,
  VerifyTwoFactorLoginUseCase,
} from '../../application/use-cases/two-factor.use-case.js';
import {
  ListSessionsUseCase,
  LogoutAllUseCase,
  RevokeSessionUseCase,
} from '../../application/use-cases/session-management.use-case.js';
import {
  DeactivateAccountUseCase,
  DeleteAccountUseCase,
  UpdateProfileUseCase,
} from '../../application/use-cases/account-management.use-case.js';
import {
  AccountDeactivatedError,
  AccountLimitReachedError,
  AccountLockedError,
  EmailNotVerifiedError,
  IdentityDomainError,
  InvalidCredentialsError,
  InvalidOtpError,
  InvalidRefreshTokenError,
  InvalidResetTokenError,
  InvalidTwoFactorCodeError,
  TwoFactorAlreadyEnabledError,
  TwoFactorNotEnabledError,
  UsernameAlreadyTakenError,
  UserNotFoundError,
} from '../../domain/errors/identity.errors.js';
import { AuthGuard } from './auth.guard.js';
import { AccessToken, CurrentUser } from './current-user.decorator.js';
import type { AuthenticatedUser } from '../../application/dto/auth.dto.js';
import {
  ChangePasswordRequestDto,
  DeleteAccountRequestDto,
  ForgotPasswordRequestDto,
  LoginRequestDto,
  LogoutRequestDto,
  RefreshTokenRequestDto,
  RegisterRequestDto,
  ResetPasswordRequestDto,
  TwoFactorCodeRequestDto,
  UpdateProfileRequestDto,
  VerifyEmailRequestDto,
  VerifyPhoneRequestDto,
  VerifyTwoFactorLoginRequestDto,
} from './dto/auth-request.dto.js';
import {
  clearRefreshTokenCookie,
  getRefreshTokenFromCookie,
  setRefreshTokenCookie,
} from './auth-cookie.helper.js';
import {
  translate,
  translateDomainError,
} from '../../../../shared/infrastructure/i18n/translate.js';

function sessionMetadata(req: Request) {
  return {
    userAgent: req.headers['user-agent'],
    ip: req.ip,
  };
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
    private readonly refreshAccessToken: RefreshAccessTokenUseCase,
    private readonly verifyEmail: VerifyEmailUseCase,
    private readonly resendVerification: ResendVerificationUseCase,
    private readonly sendPhoneOtp: SendPhoneOtpUseCase,
    private readonly verifyPhone: VerifyPhoneUseCase,
    private readonly setupTwoFactor: SetupTwoFactorUseCase,
    private readonly confirmTwoFactor: ConfirmTwoFactorUseCase,
    private readonly disableTwoFactor: DisableTwoFactorUseCase,
    private readonly verifyTwoFactorLogin: VerifyTwoFactorLoginUseCase,
    private readonly listSessions: ListSessionsUseCase,
    private readonly revokeSession: RevokeSessionUseCase,
    private readonly logoutAll: LogoutAllUseCase,
    private readonly updateProfile: UpdateProfileUseCase,
    private readonly deactivateAccount: DeactivateAccountUseCase,
    private readonly deleteAccount: DeleteAccountUseCase,
  ) {}

  @Post('register')
  async register(
    @Body() body: RegisterRequestDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    try {
      const result = await this.registerUser.execute(body);
      setRefreshTokenCookie(res, result.refreshToken);
      return result;
    } catch (error) {
      this.mapDomainError(error);
    }
  }

  @Post('login')
  @HttpCode(200)
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  async login(
    @Body() body: LoginRequestDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const identifier = body.identifier ?? body.username;
    if (!identifier || !body.password) {
      throw new BadRequestException(
        translate('common.http.IDENTIFIER_PASSWORD_REQUIRED'),
      );
    }

    try {
      const result = await this.loginUser.execute({
        identifier,
        password: body.password,
        metadata: sessionMetadata(req),
      });

      if ('requires2fa' in result) {
        return result;
      }

      setRefreshTokenCookie(res, result.refreshToken);
      return result;
    } catch (error) {
      this.mapDomainError(error);
    }
  }

  @Post('forgot-password')
  @HttpCode(200)
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  async forgotPassword(@Body() body: ForgotPasswordRequestDto) {
    return this.requestPasswordReset.execute({ username: body.username });
  }

  @Post('reset-password')
  @HttpCode(200)
  async resetPasswordHandler(@Body() body: ResetPasswordRequestDto) {
    try {
      return await this.resetPassword.execute(body);
    } catch (error) {
      this.mapDomainError(error);
    }
  }

  @Post('refresh')
  @HttpCode(200)
  @Throttle({ default: { limit: 20, ttl: 60_000 } })
  async refresh(
    @Body() body: RefreshTokenRequestDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const refreshToken =
      body.refreshToken ?? getRefreshTokenFromCookie(req.cookies ?? {});
    if (!refreshToken) {
      throw new BadRequestException(
        translate('common.http.REFRESH_TOKEN_REQUIRED'),
      );
    }

    try {
      const result = await this.refreshAccessToken.execute({
        refreshToken,
        metadata: sessionMetadata(req),
      });
      setRefreshTokenCookie(res, result.refreshToken);
      return result;
    } catch (error) {
      this.mapDomainError(error);
    }
  }

  @Post('verify-email')
  @HttpCode(200)
  async verifyEmailHandler(@Body() body: VerifyEmailRequestDto) {
    try {
      return await this.verifyEmail.execute(body);
    } catch (error) {
      this.mapDomainError(error);
    }
  }

  @Post('resend-verification')
  @UseGuards(AuthGuard)
  @HttpCode(200)
  async resendVerificationHandler(@CurrentUser() user: AuthenticatedUser) {
    return this.resendVerification.execute({ userId: user.userId });
  }

  @Post('send-phone-otp')
  @UseGuards(AuthGuard)
  @HttpCode(200)
  async sendPhoneOtpHandler(@CurrentUser() user: AuthenticatedUser) {
    return this.sendPhoneOtp.execute({ userId: user.userId });
  }

  @Post('verify-phone')
  @UseGuards(AuthGuard)
  @HttpCode(200)
  async verifyPhoneHandler(
    @CurrentUser() user: AuthenticatedUser,
    @Body() body: VerifyPhoneRequestDto,
  ) {
    try {
      return await this.verifyPhone.execute({
        userId: user.userId,
        code: body.code,
      });
    } catch (error) {
      this.mapDomainError(error);
    }
  }

  @Post('2fa/setup')
  @UseGuards(AuthGuard)
  @HttpCode(200)
  async setupTwoFactorHandler(@CurrentUser() user: AuthenticatedUser) {
    try {
      return await this.setupTwoFactor.execute({ userId: user.userId });
    } catch (error) {
      this.mapDomainError(error);
    }
  }

  @Post('2fa/confirm')
  @UseGuards(AuthGuard)
  @HttpCode(200)
  async confirmTwoFactorHandler(
    @CurrentUser() user: AuthenticatedUser,
    @Body() body: TwoFactorCodeRequestDto,
  ) {
    try {
      return await this.confirmTwoFactor.execute({
        userId: user.userId,
        code: body.code,
      });
    } catch (error) {
      this.mapDomainError(error);
    }
  }

  @Post('2fa/disable')
  @UseGuards(AuthGuard)
  @HttpCode(200)
  async disableTwoFactorHandler(
    @CurrentUser() user: AuthenticatedUser,
    @Body() body: TwoFactorCodeRequestDto,
  ) {
    try {
      return await this.disableTwoFactor.execute({
        userId: user.userId,
        code: body.code,
      });
    } catch (error) {
      this.mapDomainError(error);
    }
  }

  @Post('2fa/verify')
  @HttpCode(200)
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  async verifyTwoFactorLoginHandler(
    @Body() body: VerifyTwoFactorLoginRequestDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    try {
      const result = await this.verifyTwoFactorLogin.execute({
        ...body,
        metadata: sessionMetadata(req),
      });
      setRefreshTokenCookie(res, result.refreshToken);
      return result;
    } catch (error) {
      this.mapDomainError(error);
    }
  }

  @Get('sessions')
  @UseGuards(AuthGuard)
  async sessions(
    @CurrentUser() user: AuthenticatedUser,
    @Req() req: Request,
  ) {
    const currentSessionId = req.headers['x-session-id'] as string | undefined;
    return this.listSessions.execute({
      userId: user.userId,
      currentSessionId,
    });
  }

  @Delete('sessions/:sessionId')
  @UseGuards(AuthGuard)
  @HttpCode(HttpStatus.NO_CONTENT)
  async revokeSessionHandler(
    @CurrentUser() user: AuthenticatedUser,
    @Param('sessionId') sessionId: string,
  ) {
    await this.revokeSession.execute({ userId: user.userId, sessionId });
  }

  @Post('logout-all')
  @UseGuards(AuthGuard)
  @HttpCode(HttpStatus.NO_CONTENT)
  async logoutAllHandler(
    @CurrentUser() user: AuthenticatedUser,
    @AccessToken() accessToken: string,
    @Res({ passthrough: true }) res: Response,
  ) {
    await this.logoutAll.execute({ userId: user.userId, accessToken });
    clearRefreshTokenCookie(res);
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

  @Patch('me')
  @UseGuards(AuthGuard)
  @HttpCode(200)
  async updateProfileHandler(
    @CurrentUser() user: AuthenticatedUser,
    @Body() body: UpdateProfileRequestDto,
  ) {
    if (!body.email && !body.phone) {
      throw new BadRequestException(
        translate('common.http.EMAIL_OR_PHONE_REQUIRED'),
      );
    }

    try {
      return await this.updateProfile.execute({
        userId: user.userId,
        email: body.email,
        phone: body.phone,
      });
    } catch (error) {
      this.mapDomainError(error);
    }
  }

  @Post('deactivate')
  @UseGuards(AuthGuard)
  @HttpCode(200)
  async deactivateHandler(
    @CurrentUser() user: AuthenticatedUser,
    @AccessToken() accessToken: string,
    @Res({ passthrough: true }) res: Response,
  ) {
    try {
      const result = await this.deactivateAccount.execute({
        userId: user.userId,
        accessToken,
      });
      clearRefreshTokenCookie(res);
      return result;
    } catch (error) {
      this.mapDomainError(error);
    }
  }

  @Delete('account')
  @UseGuards(AuthGuard)
  @HttpCode(200)
  async deleteAccountHandler(
    @CurrentUser() user: AuthenticatedUser,
    @AccessToken() accessToken: string,
    @Body() body: DeleteAccountRequestDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    try {
      const result = await this.deleteAccount.execute({
        userId: user.userId,
        password: body.password,
        accessToken,
      });
      clearRefreshTokenCookie(res);
      return result;
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
    @Body() body: LogoutRequestDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const refreshToken =
      body.refreshToken ?? getRefreshTokenFromCookie(req.cookies ?? {});

    await this.logoutUser.execute({
      userId: user.userId,
      accessToken,
      refreshToken,
      sessionId: body.sessionId,
    });
    clearRefreshTokenCookie(res);
  }

  @Post('change-password')
  @UseGuards(AuthGuard)
  @HttpCode(200)
  async changePasswordHandler(
    @CurrentUser() user: AuthenticatedUser,
    @AccessToken() accessToken: string,
    @Body() body: ChangePasswordRequestDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    try {
      const result = await this.changePassword.execute({
        userId: user.userId,
        currentPassword: body.currentPassword,
        newPassword: body.newPassword,
        accessToken,
      });
      clearRefreshTokenCookie(res);
      return result;
    } catch (error) {
      this.mapDomainError(error);
    }
  }

  private mapDomainError(error: unknown): never {
    const message =
      error instanceof IdentityDomainError
        ? translateDomainError(error, 'identity')
        : error instanceof Error
          ? error.message
          : translate('common.errors.UNEXPECTED');

    if (
      error instanceof AccountLimitReachedError ||
      error instanceof UsernameAlreadyTakenError ||
      error instanceof TwoFactorAlreadyEnabledError
    ) {
      throw new ConflictException(message);
    }

    if (error instanceof AccountLockedError) {
      throw new HttpException(message, HttpStatus.TOO_MANY_REQUESTS);
    }

    if (
      error instanceof InvalidCredentialsError ||
      error instanceof InvalidResetTokenError ||
      error instanceof InvalidRefreshTokenError ||
      error instanceof InvalidOtpError ||
      error instanceof InvalidTwoFactorCodeError ||
      error instanceof TwoFactorNotEnabledError ||
      error instanceof EmailNotVerifiedError ||
      error instanceof AccountDeactivatedError ||
      error instanceof UserNotFoundError
    ) {
      throw new UnauthorizedException(message);
    }

    if (error instanceof IdentityDomainError) {
      throw new BadRequestException(message);
    }

    throw error;
  }
}
