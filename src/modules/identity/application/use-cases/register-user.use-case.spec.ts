import { describe, expect, it, beforeEach } from 'vitest';
import { RegisterUserUseCase } from './register-user.use-case.js';
import { InMemoryUserRepository } from '../../infrastructure/persistence/in-memory-user.repository.js';
import { ScryptPasswordHasher } from '../../infrastructure/adapters/scrypt-password-hasher.adapter.js';
import { HmacTokenService } from '../../infrastructure/adapters/hmac-token.adapter.js';
import type { DomainEvent } from '../../../../shared/domain/domain-event.js';
import type { EventPublisher } from '../../../../shared/application/ports/event-publisher.port.js';
import { EmailAlreadyRegisteredError } from '../../domain/errors/identity.errors.js';

class SilentEventPublisher implements EventPublisher {
  readonly published: DomainEvent[] = [];

  async publish(events: DomainEvent[]): Promise<void> {
    this.published.push(...events);
  }
}

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
      email: 'ash@poke.space',
      password: 'pikachu123',
    });

    expect(result.email).toBe('ash@poke.space');
    expect(result.userId).toBeTruthy();
    expect(result.accessToken).toContain('.');
    expect(events.published).toHaveLength(1);
  });

  it('rejects duplicated email', async () => {
    await useCase.execute({
      email: 'ash@poke.space',
      password: 'pikachu123',
    });

    await expect(
      useCase.execute({
        email: 'ash@poke.space',
        password: 'pikachu123',
      }),
    ).rejects.toBeInstanceOf(EmailAlreadyRegisteredError);
  });
});
