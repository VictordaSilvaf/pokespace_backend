import { Inject, Injectable } from '@nestjs/common';
import type { UseCase } from '../../../../shared/application/use-case.js';
import {
  EVENT_PUBLISHER,
  type EventPublisher,
} from '../../../../shared/application/ports/event-publisher.port.js';
import type { AuthResult, RegisterUserCommand } from '../dto/auth.dto.js';
import {
  PASSWORD_HASHER,
  type PasswordHasher,
} from '../ports/password-hasher.port.js';
import {
  TOKEN_SERVICE,
  type TokenService,
} from '../ports/token-service.port.js';
import {
  USER_REPOSITORY,
  type UserRepository,
} from '../../domain/repositories/user.repository.js';
import { MAX_ACCOUNTS_PER_CONTACT } from '../../domain/account-limits.js';
import { Email } from '../../domain/value-objects/email.vo.js';
import { PhoneNumber } from '../../domain/value-objects/phone-number.vo.js';
import { Username } from '../../domain/value-objects/username.vo.js';
import { HashedPassword } from '../../domain/value-objects/hashed-password.vo.js';
import { User } from '../../domain/entities/user.entity.js';
import {
  AccountLimitReachedError,
  UsernameAlreadyTakenError,
} from '../../domain/errors/identity.errors.js';

@Injectable()
export class RegisterUserUseCase
  implements UseCase<RegisterUserCommand, AuthResult>
{
  constructor(
    @Inject(USER_REPOSITORY)
    private readonly users: UserRepository,
    @Inject(PASSWORD_HASHER)
    private readonly hasher: PasswordHasher,
    @Inject(TOKEN_SERVICE)
    private readonly tokens: TokenService,
    @Inject(EVENT_PUBLISHER)
    private readonly events: EventPublisher,
  ) {}

  async execute(command: RegisterUserCommand): Promise<AuthResult> {
    const email = Email.create(command.email);
    const phone = PhoneNumber.create(command.phone);
    const username = Username.create(command.username);
    HashedPassword.assertPlainPasswordStrength(command.password);

    const existingUsername = await this.users.findByUsername(username);
    if (existingUsername) {
      throw new UsernameAlreadyTakenError(username.value);
    }

    const emailCount = await this.users.countByEmail(email);
    if (emailCount >= MAX_ACCOUNTS_PER_CONTACT) {
      throw new AccountLimitReachedError('email', email.value);
    }

    const phoneCount = await this.users.countByPhone(phone);
    if (phoneCount >= MAX_ACCOUNTS_PER_CONTACT) {
      throw new AccountLimitReachedError('phone', phone.value);
    }

    const hash = await this.hasher.hash(command.password);
    const user = User.register(
      email,
      phone,
      username,
      HashedPassword.fromHash(hash),
    );

    await this.users.save(user);
    await this.events.publish(user.pullDomainEvents());

    const accessToken = await this.tokens.sign({
      sub: user.id,
      email: user.email.value,
      username: user.username.value,
    });

    return {
      userId: user.id,
      email: user.email.value,
      phone: user.phone.value,
      username: user.username.value,
      accessToken,
    };
  }
}
