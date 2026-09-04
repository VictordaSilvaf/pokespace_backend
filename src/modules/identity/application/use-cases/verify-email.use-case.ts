import { randomBytes } from 'node:crypto';
import { Inject, Injectable } from '@nestjs/common';
import type { UseCase } from '../../../../shared/application/use-case.js';
import type {
  MessageResult,
  ResendVerificationCommand,
  VerifyEmailCommand,
  VerifyEmailResult,
} from '../dto/auth.dto.js';
import {
  EMAIL_ALREADY_VERIFIED_MESSAGE,
  EMAIL_VERIFIED_MESSAGE,
  getVerifyEmailTtlSeconds,
  shouldExposeVerifyEmailToken,
  VERIFICATION_EMAIL_SENT_MESSAGE,
} from '../auth.config.js';
import {
  EMAIL_VERIFICATION_STORE,
  type EmailVerificationStore,
} from '../ports/email-verification-store.port.js';
import { MAILER, type Mailer } from '../ports/mailer.port.js';
import {
  USER_REPOSITORY,
  type UserRepository,
} from '../../domain/repositories/user.repository.js';
import {
  InvalidResetTokenError,
  UserNotFoundError,
} from '../../domain/errors/identity.errors.js';

@Injectable()
export class VerifyEmailUseCase
  implements UseCase<VerifyEmailCommand, MessageResult>
{
  constructor(
    @Inject(EMAIL_VERIFICATION_STORE)
    private readonly emailVerification: EmailVerificationStore,
    @Inject(USER_REPOSITORY)
    private readonly users: UserRepository,
  ) {}

  async execute(command: VerifyEmailCommand): Promise<MessageResult> {
    const userId = await this.emailVerification.consume(command.token);
    if (!userId) {
      throw new InvalidResetTokenError();
    }

    const user = await this.users.findById(userId);
    if (!user) {
      throw new UserNotFoundError(userId);
    }

    user.verifyEmail();
    await this.users.update(user);

    return { message: EMAIL_VERIFIED_MESSAGE };
  }
}

@Injectable()
export class ResendVerificationUseCase
  implements UseCase<ResendVerificationCommand, VerifyEmailResult>
{
  constructor(
    @Inject(USER_REPOSITORY)
    private readonly users: UserRepository,
    @Inject(EMAIL_VERIFICATION_STORE)
    private readonly emailVerification: EmailVerificationStore,
    @Inject(MAILER)
    private readonly mailer: Mailer,
  ) {}

  async execute(command: ResendVerificationCommand): Promise<VerifyEmailResult> {
    const user = await this.users.findById(command.userId);
    if (!user) {
      throw new UserNotFoundError(command.userId);
    }

    if (user.emailVerifiedAt) {
      return { message: EMAIL_ALREADY_VERIFIED_MESSAGE };
    }

    const token = randomBytes(32).toString('hex');
    await this.emailVerification.save(
      token,
      user.id,
      getVerifyEmailTtlSeconds(),
    );
    await this.mailer.sendEmailVerification({
      email: user.email.value,
      username: user.username.value,
      token,
    });

    const result: VerifyEmailResult = {
      message: VERIFICATION_EMAIL_SENT_MESSAGE,
    };
    if (shouldExposeVerifyEmailToken()) {
      result.verifyToken = token;
    }

    return result;
  }
}
