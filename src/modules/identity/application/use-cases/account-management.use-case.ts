import { Inject, Injectable } from '@nestjs/common';
import type { UseCase } from '../../../../shared/application/use-case.js';
import type {
  DeactivateAccountCommand,
  DeleteAccountCommand,
  UpdateProfileCommand,
  MessageResult,
} from '../dto/auth.dto.js';
import {
  ACCOUNT_DEACTIVATED_MESSAGE,
  ACCOUNT_DELETED_MESSAGE,
} from '../auth.config.js';
import {
  USER_REPOSITORY,
  type UserRepository,
} from '../../domain/repositories/user.repository.js';
import {
  PASSWORD_HASHER,
  type PasswordHasher,
} from '../ports/password-hasher.port.js';
import { Email } from '../../domain/value-objects/email.vo.js';
import { PhoneNumber } from '../../domain/value-objects/phone-number.vo.js';
import {
  InvalidCredentialsError,
  UserNotFoundError,
} from '../../domain/errors/identity.errors.js';
import { SessionRevoker } from '../services/session-revoker.service.js';
import {
  EVENT_PUBLISHER,
  type EventPublisher,
} from '../../../../shared/application/ports/event-publisher.port.js';

@Injectable()
export class UpdateProfileUseCase
  implements UseCase<UpdateProfileCommand, MessageResult>
{
  constructor(
    @Inject(USER_REPOSITORY)
    private readonly users: UserRepository,
  ) {}

  async execute(command: UpdateProfileCommand): Promise<MessageResult> {
    const user = await this.users.findById(command.userId);
    if (!user) {
      throw new UserNotFoundError(command.userId);
    }

    if (command.email) {
      user.updateEmail(Email.create(command.email));
    }

    if (command.phone) {
      user.updatePhone(PhoneNumber.create(command.phone));
    }

    await this.users.update(user);
    return { message: 'Profile updated' };
  }
}

@Injectable()
export class DeactivateAccountUseCase
  implements UseCase<DeactivateAccountCommand, MessageResult>
{
  constructor(
    @Inject(USER_REPOSITORY)
    private readonly users: UserRepository,
    private readonly sessions: SessionRevoker,
    @Inject(EVENT_PUBLISHER)
    private readonly events: EventPublisher,
  ) {}

  async execute(command: DeactivateAccountCommand): Promise<MessageResult> {
    const user = await this.users.findById(command.userId);
    if (!user) {
      throw new UserNotFoundError(command.userId);
    }

    user.deactivate();
    await this.users.update(user);
    await this.sessions.revokeAllForUser(command.userId, command.accessToken);
    await this.events.publish(user.pullDomainEvents());

    return { message: ACCOUNT_DEACTIVATED_MESSAGE };
  }
}

@Injectable()
export class DeleteAccountUseCase
  implements UseCase<DeleteAccountCommand, MessageResult>
{
  constructor(
    @Inject(USER_REPOSITORY)
    private readonly users: UserRepository,
    @Inject(PASSWORD_HASHER)
    private readonly hasher: PasswordHasher,
    private readonly sessions: SessionRevoker,
  ) {}

  async execute(command: DeleteAccountCommand): Promise<MessageResult> {
    const user = await this.users.findById(command.userId);
    if (!user) {
      throw new UserNotFoundError(command.userId);
    }

    const matches = await this.hasher.compare(
      command.password,
      user.passwordHash,
    );
    if (!matches) {
      throw new InvalidCredentialsError();
    }

    await this.sessions.revokeAllForUser(command.userId, command.accessToken);
    await this.users.delete(command.userId);

    return { message: ACCOUNT_DELETED_MESSAGE };
  }
}
