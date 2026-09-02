import { Module } from '@nestjs/common';
import { USER_REPOSITORY } from './domain/repositories/user.repository.js';
import { PASSWORD_HASHER } from './application/ports/password-hasher.port.js';
import { TOKEN_SERVICE } from './application/ports/token-service.port.js';
import { RegisterUserUseCase } from './application/use-cases/register-user.use-case.js';
import { LoginUserUseCase } from './application/use-cases/login-user.use-case.js';
import { AuthController } from './infrastructure/http/auth.controller.js';
import { InMemoryUserRepository } from './infrastructure/persistence/in-memory-user.repository.js';
import { ScryptPasswordHasher } from './infrastructure/adapters/scrypt-password-hasher.adapter.js';
import { HmacTokenService } from './infrastructure/adapters/hmac-token.adapter.js';

@Module({
  controllers: [AuthController],
  providers: [
    RegisterUserUseCase,
    LoginUserUseCase,
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
  ],
  exports: [RegisterUserUseCase, LoginUserUseCase, TOKEN_SERVICE],
})
export class IdentityModule {}
