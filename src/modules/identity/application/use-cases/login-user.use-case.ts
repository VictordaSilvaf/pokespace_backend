import { Inject, Injectable } from '@nestjs/common';
import type { UseCase } from '../../../../shared/application/use-case.js';
import {
  EVENT_PUBLISHER,
  type EventPublisher,
} from '../../../../shared/application/ports/event-publisher.port.js';
import type { AuthResult, LoginUserCommand } from '../dto/auth.dto.js';
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
import { InvalidCredentialsError } from '../../domain/errors/identity.errors.js';

@Injectable()
export class LoginUserUseCase implements UseCase<LoginUserCommand, AuthResult> {
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

  async execute(command: LoginUserCommand): Promise<AuthResult> {
    const email = Email.create(command.email);
    const user = await this.users.findByEmail(email);

    if (!user) {
      throw new InvalidCredentialsError();
    }

    const matches = await this.hasher.compare(
      command.password,
      user.passwordHash,
    );

    if (!matches) {
      throw new InvalidCredentialsError();
    }

    user.markLoggedIn();
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
