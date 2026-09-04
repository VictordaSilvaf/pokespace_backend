import { randomInt } from 'node:crypto';
import { Inject, Injectable } from '@nestjs/common';
import type { UseCase } from '../../../../shared/application/use-case.js';
import type {
  SendPhoneOtpCommand,
  SendPhoneOtpResult,
  VerifyPhoneCommand,
} from '../dto/auth.dto.js';
import {
  getPhoneOtpTtlSeconds,
  PHONE_VERIFIED_MESSAGE,
  shouldExposePhoneOtp,
  VERIFICATION_CODE_SENT_MESSAGE,
} from '../auth.config.js';
import { MAILER, type Mailer } from '../ports/mailer.port.js';
import {
  PHONE_OTP_STORE,
  type PhoneOtpStore,
} from '../ports/phone-otp-store.port.js';
import {
  USER_REPOSITORY,
  type UserRepository,
} from '../../domain/repositories/user.repository.js';
import {
  InvalidOtpError,
  UserNotFoundError,
} from '../../domain/errors/identity.errors.js';

@Injectable()
export class SendPhoneOtpUseCase
  implements UseCase<SendPhoneOtpCommand, SendPhoneOtpResult>
{
  constructor(
    @Inject(USER_REPOSITORY)
    private readonly users: UserRepository,
    @Inject(PHONE_OTP_STORE)
    private readonly phoneOtp: PhoneOtpStore,
    @Inject(MAILER)
    private readonly mailer: Mailer,
  ) {}

  async execute(command: SendPhoneOtpCommand): Promise<SendPhoneOtpResult> {
    const user = await this.users.findById(command.userId);
    if (!user) {
      throw new UserNotFoundError(command.userId);
    }

    const code = String(randomInt(100_000, 999_999));
    await this.phoneOtp.save(user.id, code, getPhoneOtpTtlSeconds());
    await this.mailer.sendPhoneOtp({
      email: user.email.value,
      username: user.username.value,
      code,
    });

    const result: SendPhoneOtpResult = {
      message: VERIFICATION_CODE_SENT_MESSAGE,
    };
    if (shouldExposePhoneOtp()) {
      result.otp = code;
    }

    return result;
  }
}

@Injectable()
export class VerifyPhoneUseCase
  implements UseCase<VerifyPhoneCommand, { message: string }>
{
  constructor(
    @Inject(USER_REPOSITORY)
    private readonly users: UserRepository,
    @Inject(PHONE_OTP_STORE)
    private readonly phoneOtp: PhoneOtpStore,
  ) {}

  async execute(command: VerifyPhoneCommand): Promise<{ message: string }> {
    const user = await this.users.findById(command.userId);
    if (!user) {
      throw new UserNotFoundError(command.userId);
    }

    const valid = await this.phoneOtp.consume(command.userId, command.code);
    if (!valid) {
      throw new InvalidOtpError();
    }

    user.verifyPhone();
    await this.users.update(user);

    return { message: PHONE_VERIFIED_MESSAGE };
  }
}
