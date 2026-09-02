import { randomBytes } from 'node:crypto';
import { Inject, Injectable } from '@nestjs/common';
import type { UseCase } from '../../../../shared/application/use-case.js';
import {
  EVENT_PUBLISHER,
  type EventPublisher,
} from '../../../../shared/application/ports/event-publisher.port.js';
import type {
  ForgotPasswordCommand,
  ForgotPasswordResult,
} from '../dto/auth.dto.js';
import {
  FORGOT_PASSWORD_MESSAGE,
  getResetTokenTtlSeconds,
  shouldExposeResetToken,
} from '../auth.config.js';
import {
  PASSWORD_RESET_STORE,
  type PasswordResetStore,
} from '../ports/password-reset-store.port.js';
import { MAILER, type Mailer } from '../ports/mailer.port.js';
import {
  USER_REPOSITORY,
  type UserRepository,
} from '../../domain/repositories/user.repository.js';
import { Username } from '../../domain/value-objects/username.vo.js';
import { PasswordResetRequestedEvent } from '../../domain/events/password-reset-requested.event.js';

@Injectable()
export class RequestPasswordResetUseCase
  implements UseCase<ForgotPasswordCommand, ForgotPasswordResult>
{
  constructor(
    @Inject(USER_REPOSITORY)
    private readonly users: UserRepository,
    @Inject(PASSWORD_RESET_STORE)
    private readonly resetStore: PasswordResetStore,
    @Inject(MAILER)
    private readonly mailer: Mailer,
    @Inject(EVENT_PUBLISHER)
    private readonly events: EventPublisher,
  ) {}

  async execute(command: ForgotPasswordCommand): Promise<ForgotPasswordResult> {
    let username: Username;
    try {
      username = Username.create(command.username);
    } catch {
      return { message: FORGOT_PASSWORD_MESSAGE };
    }

    const user = await this.users.findByUsername(username);
    if (!user) {
      return { message: FORGOT_PASSWORD_MESSAGE };
    }

    const token = randomBytes(32).toString('hex');
    const ttl = getResetTokenTtlSeconds();

    await this.resetStore.save(token, user.id, ttl);
    await this.mailer.sendPasswordReset({
      email: user.email.value,
      username: user.username.value,
      token,
    });
    await this.events.publish([
      new PasswordResetRequestedEvent(
        user.id,
        user.email.value,
        user.username.value,
      ),
    ]);

    const result: ForgotPasswordResult = { message: FORGOT_PASSWORD_MESSAGE };
    if (shouldExposeResetToken()) {
      result.resetToken = token;
    }

    return result;
  }
}
