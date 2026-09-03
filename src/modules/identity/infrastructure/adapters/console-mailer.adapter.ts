import { Injectable, Logger } from '@nestjs/common';
import type {
  EmailVerificationMail,
  Mailer,
  PasswordResetMail,
  PhoneOtpMail,
} from '../../application/ports/mailer.port.js';

@Injectable()
export class ConsoleMailerAdapter implements Mailer {
  private readonly logger = new Logger(ConsoleMailerAdapter.name);

  async sendPasswordReset(mail: PasswordResetMail): Promise<void> {
    this.logger.log(
      `password reset for ${mail.username} <${mail.email}> token=${mail.token}`,
    );
  }

  async sendEmailVerification(mail: EmailVerificationMail): Promise<void> {
    this.logger.log(
      `email verification for ${mail.username} <${mail.email}> token=${mail.token}`,
    );
  }

  async sendPhoneOtp(mail: PhoneOtpMail): Promise<void> {
    this.logger.log(
      `phone OTP for ${mail.username} <${mail.email}> code=${mail.code}`,
    );
  }
}
