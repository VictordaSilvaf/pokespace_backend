import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import type { Pool } from 'pg';
import { DATABASE_POOL, useInMemoryUserRepository } from '../../shared/infrastructure/database/database.pool.port.js';
import {
  REDIS_CLIENT,
  type RedisClient,
} from '../../shared/infrastructure/redis/redis.client.port.js';
import { USER_REPOSITORY } from './domain/repositories/user.repository.js';
import { PASSWORD_HASHER } from './application/ports/password-hasher.port.js';
import { TOKEN_SERVICE } from './application/ports/token-service.port.js';
import { PASSWORD_RESET_STORE } from './application/ports/password-reset-store.port.js';
import { TOKEN_DENYLIST } from './application/ports/token-denylist.port.js';
import { REFRESH_TOKEN_STORE } from './application/ports/refresh-token-store.port.js';
import { MAILER } from './application/ports/mailer.port.js';
import { LOGIN_ATTEMPT_STORE } from './application/ports/login-attempt-store.port.js';
import { EMAIL_VERIFICATION_STORE } from './application/ports/email-verification-store.port.js';
import { PHONE_OTP_STORE } from './application/ports/phone-otp-store.port.js';
import { TEMP_AUTH_STORE } from './application/ports/temp-auth-store.port.js';
import { RegisterUserUseCase } from './application/use-cases/register-user.use-case.js';
import { LoginUserUseCase } from './application/use-cases/login-user.use-case.js';
import { RequestPasswordResetUseCase } from './application/use-cases/request-password-reset.use-case.js';
import { ResetPasswordUseCase } from './application/use-cases/reset-password.use-case.js';
import { GetCurrentUserUseCase } from './application/use-cases/get-current-user.use-case.js';
import { LogoutUserUseCase } from './application/use-cases/logout-user.use-case.js';
import { ChangePasswordUseCase } from './application/use-cases/change-password.use-case.js';
import { RefreshAccessTokenUseCase } from './application/use-cases/refresh-access-token.use-case.js';
import {
  ResendVerificationUseCase,
  VerifyEmailUseCase,
} from './application/use-cases/verify-email.use-case.js';
import {
  SendPhoneOtpUseCase,
  VerifyPhoneUseCase,
} from './application/use-cases/phone-verification.use-case.js';
import {
  ConfirmTwoFactorUseCase,
  DisableTwoFactorUseCase,
  SetupTwoFactorUseCase,
  VerifyTwoFactorLoginUseCase,
} from './application/use-cases/two-factor.use-case.js';
import {
  ListSessionsUseCase,
  LogoutAllUseCase,
  RevokeSessionUseCase,
} from './application/use-cases/session-management.use-case.js';
import {
  DeactivateAccountUseCase,
  DeleteAccountUseCase,
  UpdateProfileUseCase,
} from './application/use-cases/account-management.use-case.js';
import { AuthTokenIssuer } from './application/services/auth-token-issuer.service.js';
import { SessionRevoker } from './application/services/session-revoker.service.js';
import { AuthController } from './infrastructure/http/auth.controller.js';
import { AuthGuard } from './infrastructure/http/auth.guard.js';
import { InMemoryUserRepository } from './infrastructure/persistence/in-memory-user.repository.js';
import { PostgresUserRepository } from './infrastructure/persistence/postgres-user.repository.js';
import { ScryptPasswordHasher } from './infrastructure/adapters/scrypt-password-hasher.adapter.js';
import { JwtTokenService } from './infrastructure/adapters/jwt-token.adapter.js';
import { InMemoryPasswordResetStore } from './infrastructure/adapters/in-memory-password-reset.store.js';
import { RedisPasswordResetStore } from './infrastructure/adapters/redis-password-reset.store.js';
import { InMemoryTokenDenylist } from './infrastructure/adapters/in-memory-token-denylist.js';
import { InMemoryRefreshTokenStore } from './infrastructure/adapters/in-memory-refresh-token.store.js';
import { RedisTokenDenylist } from './infrastructure/adapters/redis-token-denylist.js';
import { RedisRefreshTokenStore } from './infrastructure/adapters/redis-refresh-token.store.js';
import { ConsoleMailerAdapter } from './infrastructure/adapters/console-mailer.adapter.js';
import { SmtpMailerAdapter } from './infrastructure/adapters/smtp-mailer.adapter.js';
import { InMemoryLoginAttemptStore } from './infrastructure/adapters/in-memory-login-attempt.store.js';
import { RedisLoginAttemptStore } from './infrastructure/adapters/redis-login-attempt.store.js';
import { InMemoryEmailVerificationStore } from './infrastructure/adapters/in-memory-email-verification.store.js';
import { RedisEmailVerificationStore } from './infrastructure/adapters/redis-email-verification.store.js';
import { InMemoryPhoneOtpStore } from './infrastructure/adapters/in-memory-phone-otp.store.js';
import { RedisPhoneOtpStore } from './infrastructure/adapters/redis-phone-otp.store.js';
import { InMemoryTempAuthStore } from './infrastructure/adapters/in-memory-temp-auth.store.js';
import { RedisTempAuthStore } from './infrastructure/adapters/redis-temp-auth.store.js';
import { useSmtpMailer } from './application/auth.config.js';

@Module({
  imports: [
    JwtModule.register({
      global: true,
      secret: process.env.AUTH_TOKEN_SECRET ?? 'dev-only-change-me',
    }),
  ],
  controllers: [AuthController],
  providers: [
    RegisterUserUseCase,
    LoginUserUseCase,
    RequestPasswordResetUseCase,
    ResetPasswordUseCase,
    GetCurrentUserUseCase,
    LogoutUserUseCase,
    ChangePasswordUseCase,
    RefreshAccessTokenUseCase,
    VerifyEmailUseCase,
    ResendVerificationUseCase,
    SendPhoneOtpUseCase,
    VerifyPhoneUseCase,
    SetupTwoFactorUseCase,
    ConfirmTwoFactorUseCase,
    DisableTwoFactorUseCase,
    VerifyTwoFactorLoginUseCase,
    ListSessionsUseCase,
    RevokeSessionUseCase,
    LogoutAllUseCase,
    UpdateProfileUseCase,
    DeactivateAccountUseCase,
    DeleteAccountUseCase,
    AuthTokenIssuer,
    SessionRevoker,
    AuthGuard,
    JwtTokenService,
    {
      provide: USER_REPOSITORY,
      useFactory: (pool: Pool | null) => {
        if (useInMemoryUserRepository() || !pool) {
          return new InMemoryUserRepository();
        }

        return new PostgresUserRepository(pool);
      },
      inject: [DATABASE_POOL],
    },
    {
      provide: PASSWORD_HASHER,
      useClass: ScryptPasswordHasher,
    },
    {
      provide: TOKEN_SERVICE,
      useExisting: JwtTokenService,
    },
    {
      provide: PASSWORD_RESET_STORE,
      useFactory: (redis: RedisClient) =>
        redis
          ? new RedisPasswordResetStore(redis)
          : new InMemoryPasswordResetStore(),
      inject: [REDIS_CLIENT],
    },
    {
      provide: TOKEN_DENYLIST,
      useFactory: (redis: RedisClient) =>
        redis ? new RedisTokenDenylist(redis) : new InMemoryTokenDenylist(),
      inject: [REDIS_CLIENT],
    },
    {
      provide: REFRESH_TOKEN_STORE,
      useFactory: (redis: RedisClient) =>
        redis
          ? new RedisRefreshTokenStore(redis)
          : new InMemoryRefreshTokenStore(),
      inject: [REDIS_CLIENT],
    },
    {
      provide: LOGIN_ATTEMPT_STORE,
      useFactory: (redis: RedisClient) =>
        redis
          ? new RedisLoginAttemptStore(redis)
          : new InMemoryLoginAttemptStore(),
      inject: [REDIS_CLIENT],
    },
    {
      provide: EMAIL_VERIFICATION_STORE,
      useFactory: (redis: RedisClient) =>
        redis
          ? new RedisEmailVerificationStore(redis)
          : new InMemoryEmailVerificationStore(),
      inject: [REDIS_CLIENT],
    },
    {
      provide: PHONE_OTP_STORE,
      useFactory: (redis: RedisClient) =>
        redis
          ? new RedisPhoneOtpStore(redis)
          : new InMemoryPhoneOtpStore(),
      inject: [REDIS_CLIENT],
    },
    {
      provide: TEMP_AUTH_STORE,
      useFactory: (redis: RedisClient) =>
        redis ? new RedisTempAuthStore(redis) : new InMemoryTempAuthStore(),
      inject: [REDIS_CLIENT],
    },
    {
      provide: MAILER,
      useFactory: () =>
        useSmtpMailer() ? new SmtpMailerAdapter() : new ConsoleMailerAdapter(),
    },
  ],
  exports: [
    RegisterUserUseCase,
    LoginUserUseCase,
    TOKEN_SERVICE,
    AuthGuard,
  ],
})
export class IdentityModule {}
