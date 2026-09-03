import { Inject, Injectable } from '@nestjs/common';
import type { UseCase } from '../../../../shared/application/use-case.js';
import {
  EVENT_PUBLISHER,
  type EventPublisher,
} from '../../../../shared/application/ports/event-publisher.port.js';
import type {
  ChangePasswordCommand,
  MessageResult,
} from '../dto/auth.dto.js';
import { PASSWORD_UPDATED_MESSAGE } from '../auth.config.js';
import {
  PASSWORD_HASHER,
  type PasswordHasher,
} from '../ports/password-hasher.port.js';
import {
  USER_REPOSITORY,
  type UserRepository,
} from '../../domain/repositories/user.repository.js';
import { HashedPassword } from '../../domain/value-objects/hashed-password.vo.js';
import {
  InvalidCredentialsError,
  UserNotFoundError,
} from '../../domain/errors/identity.errors.js';
import { SessionRevoker } from '../services/session-revoker.service.js';

@Injectable()
export class ChangePasswordUseCase
  implements UseCase<ChangePasswordCommand, MessageResult>
{
  constructor(
    @Inject(USER_REPOSITORY)
    private readonly users: UserRepository,
    @Inject(PASSWORD_HASHER)
    private readonly hasher: PasswordHasher,
    private readonly sessions: SessionRevoker,
    @Inject(EVENT_PUBLISHER)
    private readonly events: EventPublisher,
  ) {}

  async execute(command: ChangePasswordCommand): Promise<MessageResult> {
    HashedPassword.assertPlainPasswordStrength(command.newPassword);

    const user = await this.users.findById(command.userId);
    if (!user) {
      throw new UserNotFoundError(command.userId);
    }

    const matches = await this.hasher.compare(
      command.currentPassword,
      user.passwordHash,
    );
    if (!matches) {
      throw new InvalidCredentialsError();
    }

    const hash = await this.hasher.hash(command.newPassword);
    user.changePassword(HashedPassword.fromHash(hash));
    await this.users.updatePassword(user.id, hash);
    await this.sessions.revokeAllForUser(user.id, command.accessToken);
    await this.events.publish(user.pullDomainEvents());

    return { message: PASSWORD_UPDATED_MESSAGE };
  }
}
