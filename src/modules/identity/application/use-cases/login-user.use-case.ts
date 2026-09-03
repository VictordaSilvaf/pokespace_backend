import { Inject, Injectable } from '@nestjs/common';
import type { UseCase } from '../../../../shared/application/use-case.js';
import {
  EVENT_PUBLISHER,
  type EventPublisher,
} from '../../../../shared/application/ports/event-publisher.port.js';
import type { LoginResult, LoginUserCommand } from '../dto/auth.dto.js';
import {
  getLockoutTtlSeconds,
  shouldRequireEmailVerified,
} from '../auth.config.js';
import {
  LOGIN_ATTEMPT_STORE,
  type LoginAttemptStore,
} from '../ports/login-attempt-store.port.js';
import {
  PASSWORD_HASHER,
  type PasswordHasher,
} from '../ports/password-hasher.port.js';
import {
  TEMP_AUTH_STORE,
  type TempAuthStore,
} from '../ports/temp-auth-store.port.js';
import {
  USER_REPOSITORY,
  type UserRepository,
} from '../../domain/repositories/user.repository.js';
import { Email } from '../../domain/value-objects/email.vo.js';
import { Username } from '../../domain/value-objects/username.vo.js';
import {
  AccountDeactivatedError,
  AccountLockedError,
  EmailNotVerifiedError,
  InvalidCredentialsError,
} from '../../domain/errors/identity.errors.js';
import {
  AuthTokenIssuer,
  generateTempToken,
} from '../services/auth-token-issuer.service.js';
import { getTempAuthTtlSeconds } from '../auth.config.js';

@Injectable()
export class LoginUserUseCase implements UseCase<LoginUserCommand, LoginResult> {
  constructor(
    @Inject(USER_REPOSITORY)
    private readonly users: UserRepository,
    @Inject(PASSWORD_HASHER)
    private readonly hasher: PasswordHasher,
    private readonly tokenIssuer: AuthTokenIssuer,
    @Inject(LOGIN_ATTEMPT_STORE)
    private readonly loginAttempts: LoginAttemptStore,
    @Inject(TEMP_AUTH_STORE)
    private readonly tempAuth: TempAuthStore,
    @Inject(EVENT_PUBLISHER)
    private readonly events: EventPublisher,
  ) {}

  async execute(command: LoginUserCommand): Promise<LoginResult> {
    const identifier = command.identifier.trim().toLowerCase();

    if (await this.loginAttempts.isLocked(identifier)) {
      throw new AccountLockedError();
    }

    let user;
    try {
      user = identifier.includes('@')
        ? await this.users.findByEmail(Email.create(identifier))
        : await this.users.findByUsername(Username.create(identifier));
    } catch {
      await this.loginAttempts.recordFailure(
        identifier,
        getLockoutTtlSeconds(),
      );
      throw new InvalidCredentialsError();
    }

    if (!user) {
      await this.loginAttempts.recordFailure(
        identifier,
        getLockoutTtlSeconds(),
      );
      throw new InvalidCredentialsError();
    }

    user.assertActive();

    if (shouldRequireEmailVerified() && !user.emailVerifiedAt) {
      throw new EmailNotVerifiedError();
    }

    const matches = await this.hasher.compare(
      command.password,
      user.passwordHash,
    );

    if (!matches) {
      await this.loginAttempts.recordFailure(
        identifier,
        getLockoutTtlSeconds(),
      );
      throw new InvalidCredentialsError();
    }

    await this.loginAttempts.clearFailures(identifier);
    user.markLoggedIn();
    await this.events.publish(user.pullDomainEvents());

    if (user.twoFactorEnabled && user.totpSecret) {
      const tempToken = generateTempToken();
      await this.tempAuth.save(
        tempToken,
        user.id,
        getTempAuthTtlSeconds(),
      );
      return { requires2fa: true, tempToken };
    }

    return this.tokenIssuer.issueForUser(
      {
        userId: user.id,
        email: user.email.value,
        phone: user.phone.value,
        username: user.username.value,
      },
      { metadata: command.metadata },
    );
  }
}
