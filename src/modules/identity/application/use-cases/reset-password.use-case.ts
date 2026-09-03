import { Inject, Injectable } from '@nestjs/common';
import type { UseCase } from '../../../../shared/application/use-case.js';
import {
  EVENT_PUBLISHER,
  type EventPublisher,
} from '../../../../shared/application/ports/event-publisher.port.js';
import type {
  MessageResult,
  ResetPasswordCommand,
} from '../dto/auth.dto.js';
import { PASSWORD_UPDATED_MESSAGE } from '../auth.config.js';
import {
  PASSWORD_HASHER,
  type PasswordHasher,
} from '../ports/password-hasher.port.js';
import {
  PASSWORD_RESET_STORE,
  type PasswordResetStore,
} from '../ports/password-reset-store.port.js';
import {
  USER_REPOSITORY,
  type UserRepository,
} from '../../domain/repositories/user.repository.js';
import { HashedPassword } from '../../domain/value-objects/hashed-password.vo.js';
import {
  InvalidResetTokenError,
  UserNotFoundError,
} from '../../domain/errors/identity.errors.js';
import { SessionRevoker } from '../services/session-revoker.service.js';

@Injectable()
export class ResetPasswordUseCase
  implements UseCase<ResetPasswordCommand, MessageResult>
{
  constructor(
    @Inject(USER_REPOSITORY)
    private readonly users: UserRepository,
    @Inject(PASSWORD_RESET_STORE)
    private readonly resetStore: PasswordResetStore,
    @Inject(PASSWORD_HASHER)
    private readonly hasher: PasswordHasher,
    private readonly sessions: SessionRevoker,
    @Inject(EVENT_PUBLISHER)
    private readonly events: EventPublisher,
  ) {}

  async execute(command: ResetPasswordCommand): Promise<MessageResult> {
    HashedPassword.assertPlainPasswordStrength(command.newPassword);

    const userId = await this.resetStore.consume(command.token);
    if (!userId) {
      throw new InvalidResetTokenError();
    }

    const user = await this.users.findById(userId);
    if (!user) {
      throw new UserNotFoundError(userId);
    }

    const hash = await this.hasher.hash(command.newPassword);
    user.completePasswordReset(HashedPassword.fromHash(hash));
    await this.users.updatePassword(user.id, hash);
    await this.sessions.revokeAllForUser(user.id);
    await this.events.publish(user.pullDomainEvents());

    return { message: PASSWORD_UPDATED_MESSAGE };
  }
}
