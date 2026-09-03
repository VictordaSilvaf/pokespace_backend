import { describe, expect, it, beforeEach } from 'vitest';
import { RegisterUserUseCase } from './register-user.use-case.js';
import { InMemoryUserRepository } from '../../infrastructure/persistence/in-memory-user.repository.js';
import { ScryptPasswordHasher } from '../../infrastructure/adapters/scrypt-password-hasher.adapter.js';
import { InMemoryRefreshTokenStore } from '../../infrastructure/adapters/in-memory-refresh-token.store.js';
import { InMemoryEmailVerificationStore } from '../../infrastructure/adapters/in-memory-email-verification.store.js';
import { ConsoleMailerAdapter } from '../../infrastructure/adapters/console-mailer.adapter.js';
import { AuthTokenIssuer } from '../services/auth-token-issuer.service.js';
import { JwtTokenService } from '../../infrastructure/adapters/jwt-token.adapter.js';
import { JwtModule } from '@nestjs/jwt';
import { Test } from '@nestjs/testing';
import type { DomainEvent } from '../../../../shared/domain/domain-event.js';
import type { EventPublisher } from '../../../../shared/application/ports/event-publisher.port.js';
import {
  AccountLimitReachedError,
  UsernameAlreadyTakenError,
} from '../../domain/errors/identity.errors.js';

class SilentEventPublisher implements EventPublisher {
  readonly published: DomainEvent[] = [];

  async publish(events: DomainEvent[]): Promise<void> {
    this.published.push(...events);
  }
}

const base = {
  email: 'ash@poke.space',
  phone: '11999998888',
  password: 'pikachu123',
};

describe('RegisterUserUseCase', () => {
  let useCase: RegisterUserUseCase;
  let events: SilentEventPublisher;
  let jwt: JwtTokenService;

  beforeEach(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [
        JwtModule.register({
          secret: 'test-secret',
        }),
      ],
      providers: [JwtTokenService],
    }).compile();

    jwt = moduleRef.get(JwtTokenService);
    events = new SilentEventPublisher();
    const tokenIssuer = new AuthTokenIssuer(
      jwt,
      new InMemoryRefreshTokenStore(),
    );
    useCase = new RegisterUserUseCase(
      new InMemoryUserRepository(),
      new ScryptPasswordHasher(),
      tokenIssuer,
      new InMemoryEmailVerificationStore(),
      new ConsoleMailerAdapter(),
      events,
    );
  });

  it('registers a user and returns tokens', async () => {
    const result = await useCase.execute({
      ...base,
      username: 'ash_ketchum',
    });

    expect(result.email).toBe('ash@poke.space');
    expect(result.username).toBe('ash_ketchum');
    expect(result.accessToken).toBeTruthy();
    expect(result.refreshToken).toBeTruthy();
    expect(result.sessionId).toBeTruthy();
    expect(events.published).toHaveLength(1);
  });

  it('allows up to 4 accounts on the same email and phone', async () => {
    for (let i = 1; i <= 4; i += 1) {
      await useCase.execute({
        ...base,
        username: `trainer_${i}`,
      });
    }

    await expect(
      useCase.execute({
        ...base,
        username: 'trainer_5',
      }),
    ).rejects.toBeInstanceOf(AccountLimitReachedError);
  });

  it('rejects duplicated username', async () => {
    await useCase.execute({
      ...base,
      username: 'ash_ketchum',
    });

    await expect(
      useCase.execute({
        email: 'other@poke.space',
        phone: '11988887777',
        username: 'ash_ketchum',
        password: 'pikachu123',
      }),
    ).rejects.toBeInstanceOf(UsernameAlreadyTakenError);
  });
});
