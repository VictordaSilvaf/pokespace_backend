import { Module } from '@nestjs/common';
import { USER_REPOSITORY } from './domain/repositories/user.repository.js';
import { PASSWORD_HASHER } from './application/ports/password-hasher.port.js';
import { TOKEN_SERVICE } from './application/ports/token-service.port.js';
import { PASSWORD_RESET_STORE } from './application/ports/password-reset-store.port.js';
import { TOKEN_DENYLIST } from './application/ports/token-denylist.port.js';
import { MAILER } from './application/ports/mailer.port.js';
import { RegisterUserUseCase } from './application/use-cases/register-user.use-case.js';
import { LoginUserUseCase } from './application/use-cases/login-user.use-case.js';
import { RequestPasswordResetUseCase } from './application/use-cases/request-password-reset.use-case.js';
import { ResetPasswordUseCase } from './application/use-cases/reset-password.use-case.js';
import { GetCurrentUserUseCase } from './application/use-cases/get-current-user.use-case.js';
import { LogoutUserUseCase } from './application/use-cases/logout-user.use-case.js';
import { ChangePasswordUseCase } from './application/use-cases/change-password.use-case.js';
import { AuthController } from './infrastructure/http/auth.controller.js';
import { AuthGuard } from './infrastructure/http/auth.guard.js';
import { InMemoryUserRepository } from './infrastructure/persistence/in-memory-user.repository.js';
import { ScryptPasswordHasher } from './infrastructure/adapters/scrypt-password-hasher.adapter.js';
import { HmacTokenService } from './infrastructure/adapters/hmac-token.adapter.js';
import { InMemoryPasswordResetStore } from './infrastructure/adapters/in-memory-password-reset.store.js';
import { InMemoryTokenDenylist } from './infrastructure/adapters/in-memory-token-denylist.js';
import { ConsoleMailerAdapter } from './infrastructure/adapters/console-mailer.adapter.js';

@Module({
  controllers: [AuthController],
  providers: [
    RegisterUserUseCase,
    LoginUserUseCase,
    RequestPasswordResetUseCase,
    ResetPasswordUseCase,
    GetCurrentUserUseCase,
    LogoutUserUseCase,
    ChangePasswordUseCase,
    AuthGuard,
    {
      provide: USER_REPOSITORY,
      useClass: InMemoryUserRepository,
    },
    {
      provide: PASSWORD_HASHER,
      useClass: ScryptPasswordHasher,
    },
    {
      provide: TOKEN_SERVICE,
      useClass: HmacTokenService,
    },
    {
      provide: PASSWORD_RESET_STORE,
      useClass: InMemoryPasswordResetStore,
    },
    {
      provide: TOKEN_DENYLIST,
      useClass: InMemoryTokenDenylist,
    },
    {
      provide: MAILER,
      useClass: ConsoleMailerAdapter,
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
