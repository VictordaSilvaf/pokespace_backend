import { describe, expect, it, beforeEach } from 'vitest';
import { RegisterUserUseCase } from './register-user.use-case.js';
import { InMemoryUserRepository } from '../../infrastructure/persistence/in-memory-user.repository.js';
import { ScryptPasswordHasher } from '../../infrastructure/adapters/scrypt-password-hasher.adapter.js';
import { HmacTokenService } from '../../infrastructure/adapters/hmac-token.adapter.js';
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
  let users: InMemoryUserRepository;
  let events: SilentEventPublisher;

  beforeEach(() => {
    users = new InMemoryUserRepository();
    events = new SilentEventPublisher();
    useCase = new RegisterUserUseCase(
      users,
      new ScryptPasswordHasher(),
      new HmacTokenService(),
      events,
    );
  });

  it('registers a user and returns an access token', async () => {
    const result = await useCase.execute({
      ...base,
      username: 'ash_ketchum',
    });

    expect(result.email).toBe('ash@poke.space');
    expect(result.phone).toBe('11999998888');
    expect(result.username).toBe('ash_ketchum');
    expect(result.userId).toBeTruthy();
    expect(result.accessToken).toContain('.');
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
