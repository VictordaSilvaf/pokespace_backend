import { randomBytes } from 'node:crypto';
import { Inject, Injectable } from '@nestjs/common';
import type { UseCase } from '../../../../shared/application/use-case.js';
import {
  EVENT_PUBLISHER,
  type EventPublisher,
} from '../../../../shared/application/ports/event-publisher.port.js';
import type { AuthResult, RegisterResult, RegisterUserCommand } from '../dto/auth.dto.js';
import {
  getVerifyEmailTtlSeconds,
  shouldExposeVerifyEmailToken,
} from '../auth.config.js';
import {
  EMAIL_VERIFICATION_STORE,
  type EmailVerificationStore,
} from '../ports/email-verification-store.port.js';
import {
  PASSWORD_HASHER,
  type PasswordHasher,
} from '../ports/password-hasher.port.js';
import { MAILER, type Mailer } from '../ports/mailer.port.js';
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
import { AuthTokenIssuer } from '../services/auth-token-issuer.service.js';

@Injectable()
export class RegisterUserUseCase
  implements UseCase<RegisterUserCommand, RegisterResult>
{
  constructor(
    @Inject(USER_REPOSITORY)
    private readonly users: UserRepository,
    @Inject(PASSWORD_HASHER)
    private readonly hasher: PasswordHasher,
    private readonly tokenIssuer: AuthTokenIssuer,
    @Inject(EMAIL_VERIFICATION_STORE)
    private readonly emailVerification: EmailVerificationStore,
    @Inject(MAILER)
    private readonly mailer: Mailer,
    @Inject(EVENT_PUBLISHER)
    private readonly events: EventPublisher,
  ) {}

  async execute(command: RegisterUserCommand): Promise<RegisterResult> {
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

    const verifyToken = randomBytes(32).toString('hex');
    await this.emailVerification.save(
      verifyToken,
      user.id,
      getVerifyEmailTtlSeconds(),
    );
    await this.mailer.sendEmailVerification({
      email: user.email.value,
      username: user.username.value,
      token: verifyToken,
    });

    if (shouldExposeVerifyEmailToken()) {
      return {
        ...(await this.tokenIssuer.issueForUser({
          userId: user.id,
          email: user.email.value,
          phone: user.phone.value,
          username: user.username.value,
        })),
        verifyToken,
      };
    }

    return this.tokenIssuer.issueForUser({
      userId: user.id,
      email: user.email.value,
      phone: user.phone.value,
      username: user.username.value,
    });
  }
}
