import { Injectable } from '@nestjs/common';
import { I18nService } from 'nestjs-i18n';
import nodemailer from 'nodemailer';
import type {
  EmailVerificationMail,
  Mailer,
  PasswordResetMail,
  PhoneOtpMail,
} from '../../application/ports/mailer.port.js';
import { translateWith } from '../../../../shared/infrastructure/i18n/translate.js';

@Injectable()
export class SmtpMailerAdapter implements Mailer {
  private readonly transporter;
  private readonly from: string;
  private readonly lang: string;

  constructor(private readonly i18n: I18nService) {
    const host = process.env.SMTP_HOST ?? 'localhost';
    const port = Number(process.env.SMTP_PORT ?? 1025);
    const user = process.env.SMTP_USER;
    const pass = process.env.SMTP_PASS;

    this.from = process.env.SMTP_FROM ?? 'noreply@poke.space';
    this.lang = process.env.DEFAULT_LOCALE ?? 'en';
    this.transporter = nodemailer.createTransport({
      host,
      port,
      secure: port === 465,
      auth: user && pass ? { user, pass } : undefined,
    });
  }

  async sendPasswordReset(mail: PasswordResetMail): Promise<void> {
    await this.transporter.sendMail({
      from: this.from,
      to: mail.email,
      subject: translateWith(
        this.i18n,
        'identity.mail.PASSWORD_RESET_SUBJECT',
        this.lang,
      ),
      text: translateWith(
        this.i18n,
        'identity.mail.PASSWORD_RESET_BODY',
        this.lang,
        { username: mail.username, token: mail.token },
      ),
    });
  }

  async sendEmailVerification(mail: EmailVerificationMail): Promise<void> {
    await this.transporter.sendMail({
      from: this.from,
      to: mail.email,
      subject: translateWith(
        this.i18n,
        'identity.mail.VERIFY_EMAIL_SUBJECT',
        this.lang,
      ),
      text: translateWith(
        this.i18n,
        'identity.mail.VERIFY_EMAIL_BODY',
        this.lang,
        { username: mail.username, token: mail.token },
      ),
    });
  }

  async sendPhoneOtp(mail: PhoneOtpMail): Promise<void> {
    await this.transporter.sendMail({
      from: this.from,
      to: mail.email,
      subject: translateWith(
        this.i18n,
        'identity.mail.PHONE_OTP_SUBJECT',
        this.lang,
      ),
      text: translateWith(
        this.i18n,
        'identity.mail.PHONE_OTP_BODY',
        this.lang,
        { username: mail.username, code: mail.code },
      ),
    });
  }
}
