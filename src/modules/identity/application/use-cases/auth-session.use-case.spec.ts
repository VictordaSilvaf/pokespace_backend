import { describe, expect, it, beforeEach } from 'vitest';
import { Test } from '@nestjs/testing';
import { JwtModule } from '@nestjs/jwt';
import { LoginUserUseCase } from './login-user.use-case.js';
import { RefreshAccessTokenUseCase } from './refresh-access-token.use-case.js';
import { LogoutUserUseCase } from './logout-user.use-case.js';
import { RegisterUserUseCase } from './register-user.use-case.js';
import { InMemoryUserRepository } from '../../infrastructure/persistence/in-memory-user.repository.js';
import { ScryptPasswordHasher } from '../../infrastructure/adapters/scrypt-password-hasher.adapter.js';
import { InMemoryRefreshTokenStore } from '../../infrastructure/adapters/in-memory-refresh-token.store.js';
import { InMemoryTokenDenylist } from '../../infrastructure/adapters/in-memory-token-denylist.js';
import { InMemoryLoginAttemptStore } from '../../infrastructure/adapters/in-memory-login-attempt.store.js';
import { InMemoryTempAuthStore } from '../../infrastructure/adapters/in-memory-temp-auth.store.js';
import { InMemoryEmailVerificationStore } from '../../infrastructure/adapters/in-memory-email-verification.store.js';
import { ConsoleMailerAdapter } from '../../infrastructure/adapters/console-mailer.adapter.js';
import { AuthTokenIssuer } from '../services/auth-token-issuer.service.js';
import { SessionRevoker } from '../services/session-revoker.service.js';
import { JwtTokenService } from '../../infrastructure/adapters/jwt-token.adapter.js';
import type { EventPublisher } from '../../../../shared/application/ports/event-publisher.port.js';
import type { DomainEvent } from '../../../../shared/domain/domain-event.js';
import { InvalidRefreshTokenError } from '../../domain/errors/identity.errors.js';

class SilentEventPublisher implements EventPublisher {
  async publish(_events: DomainEvent[]): Promise<void> {}
}

describe('Auth session flow', () => {
  let login: LoginUserUseCase;
  let refresh: RefreshAccessTokenUseCase;
  let logout: LogoutUserUseCase;
  let refreshStore: InMemoryRefreshTokenStore;
  let denylist: InMemoryTokenDenylist;

  beforeEach(async () => {
    const users = new InMemoryUserRepository();
    const hasher = new ScryptPasswordHasher();
    refreshStore = new InMemoryRefreshTokenStore();
    denylist = new InMemoryTokenDenylist();
    const events = new SilentEventPublisher();

    const moduleRef = await Test.createTestingModule({
      imports: [JwtModule.register({ secret: 'test-secret' })],
      providers: [JwtTokenService],
    }).compile();
    const jwt = moduleRef.get(JwtTokenService);
    const tokenIssuer = new AuthTokenIssuer(jwt, refreshStore);
    const sessions = new SessionRevoker(denylist, refreshStore);

    const register = new RegisterUserUseCase(
      users,
      hasher,
      tokenIssuer,
      new InMemoryEmailVerificationStore(),
      new ConsoleMailerAdapter(),
      events,
    );
    await register.execute({
      email: 'ash@poke.space',
      phone: '11999998888',
      username: 'ash_ketchum',
      password: 'pikachu123',
    });

    login = new LoginUserUseCase(
      users,
      hasher,
      tokenIssuer,
      new InMemoryLoginAttemptStore(),
      new InMemoryTempAuthStore(),
      events,
    );
    refresh = new RefreshAccessTokenUseCase(
      refreshStore,
      users,
      tokenIssuer,
      sessions,
    );
    logout = new LogoutUserUseCase(sessions, events);
  });

  it('login, refresh rotation, logout', async () => {
    const auth = await login.execute({
      identifier: 'ash_ketchum',
      password: 'pikachu123',
    });
    if ('requires2fa' in auth) {
      throw new Error('unexpected 2fa');
    }

    const rotated = await refresh.execute({ refreshToken: auth.refreshToken });
    expect(rotated.refreshToken).not.toBe(auth.refreshToken);

    await expect(
      refresh.execute({ refreshToken: auth.refreshToken }),
    ).rejects.toBeInstanceOf(InvalidRefreshTokenError);

    await logout.execute({
      userId: rotated.userId,
      accessToken: rotated.accessToken,
      refreshToken: rotated.refreshToken,
    });
  });
});
