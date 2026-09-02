import { describe, expect, it, beforeEach } from 'vitest';
import { RequestPasswordResetUseCase } from './request-password-reset.use-case.js';
import { ResetPasswordUseCase } from './reset-password.use-case.js';
import { InMemoryUserRepository } from '../../infrastructure/persistence/in-memory-user.repository.js';
import { InMemoryPasswordResetStore } from '../../infrastructure/adapters/in-memory-password-reset.store.js';
import { ConsoleMailerAdapter } from '../../infrastructure/adapters/console-mailer.adapter.js';
import { ScryptPasswordHasher } from '../../infrastructure/adapters/scrypt-password-hasher.adapter.js';
import { RegisterUserUseCase } from './register-user.use-case.js';
import { HmacTokenService } from '../../infrastructure/adapters/hmac-token.adapter.js';
import type { DomainEvent } from '../../../../shared/domain/domain-event.js';
import type { EventPublisher } from '../../../../shared/application/ports/event-publisher.port.js';
import { FORGOT_PASSWORD_MESSAGE } from '../auth.config.js';
import { InvalidResetTokenError } from '../../domain/errors/identity.errors.js';

class SilentEventPublisher implements EventPublisher {
  readonly published: DomainEvent[] = [];

  async publish(events: DomainEvent[]): Promise<void> {
    this.published.push(...events);
  }
}

describe('Password reset flow', () => {
  let users: InMemoryUserRepository;
  let resetStore: InMemoryPasswordResetStore;
  let events: SilentEventPublisher;
  let requestReset: RequestPasswordResetUseCase;
  let resetPassword: ResetPasswordUseCase;

  beforeEach(async () => {
    process.env.AUTH_EXPOSE_RESET_TOKEN = 'true';
    users = new InMemoryUserRepository();
    resetStore = new InMemoryPasswordResetStore();
    events = new SilentEventPublisher();
    const hasher = new ScryptPasswordHasher();

    const register = new RegisterUserUseCase(
      users,
      hasher,
      new HmacTokenService(),
      events,
    );
    await register.execute({
      email: 'ash@poke.space',
      phone: '11999998888',
      username: 'ash_ketchum',
      password: 'pikachu123',
    });

    requestReset = new RequestPasswordResetUseCase(
      users,
      resetStore,
      new ConsoleMailerAdapter(),
      events,
    );
    resetPassword = new ResetPasswordUseCase(
      users,
      resetStore,
      hasher,
      events,
    );
  });

  it('returns generic message for unknown username', async () => {
    const result = await requestReset.execute({ username: 'unknown_user' });
    expect(result.message).toBe(FORGOT_PASSWORD_MESSAGE);
    expect(result.resetToken).toBeUndefined();
  });

  it('issues reset token and allows password change', async () => {
    const forgot = await requestReset.execute({ username: 'ash_ketchum' });
    expect(forgot.resetToken).toBeTruthy();

    const result = await resetPassword.execute({
      token: forgot.resetToken!,
      newPassword: 'newpass123',
    });
    expect(result.message).toBe('Password updated');

    await expect(
      resetPassword.execute({
        token: forgot.resetToken!,
        newPassword: 'another123',
      }),
    ).rejects.toBeInstanceOf(InvalidResetTokenError);
  });
});
