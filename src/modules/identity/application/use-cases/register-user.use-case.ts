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
import { Email } from '../../domain/value-objects/email.vo.js';
import { HashedPassword } from '../../domain/value-objects/hashed-password.vo.js';
import { User } from '../../domain/entities/user.entity.js';
import { EmailAlreadyRegisteredError } from '../../domain/errors/identity.errors.js';

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
    HashedPassword.assertPlainPasswordStrength(command.password);

    const existing = await this.users.findByEmail(email);
    if (existing) {
      throw new EmailAlreadyRegisteredError(email.value);
    }

    const hash = await this.hasher.hash(command.password);
    const user = User.register(email, HashedPassword.fromHash(hash));

    await this.users.save(user);
    await this.events.publish(user.pullDomainEvents());

    const accessToken = await this.tokens.sign({
      sub: user.id,
      email: user.email.value,
    });

    return {
      userId: user.id,
      email: user.email.value,
      accessToken,
    };
  }
}
