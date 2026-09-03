import { Injectable } from '@nestjs/common';
import nodemailer from 'nodemailer';
import type {
  EmailVerificationMail,
  Mailer,
  PasswordResetMail,
  PhoneOtpMail,
} from '../../application/ports/mailer.port.js';

@Injectable()
export class SmtpMailerAdapter implements Mailer {
  private readonly transporter;
  private readonly from: string;

  constructor() {
    const host = process.env.SMTP_HOST ?? 'localhost';
    const port = Number(process.env.SMTP_PORT ?? 1025);
    const user = process.env.SMTP_USER;
    const pass = process.env.SMTP_PASS;

    this.from = process.env.SMTP_FROM ?? 'noreply@poke.space';
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
      subject: 'PokeSpace — Password reset',
      text: `Hi ${mail.username},\n\nUse this token to reset your password: ${mail.token}`,
    });
  }

  async sendEmailVerification(mail: EmailVerificationMail): Promise<void> {
    await this.transporter.sendMail({
      from: this.from,
      to: mail.email,
      subject: 'PokeSpace — Verify your email',
      text: `Hi ${mail.username},\n\nUse this token to verify your email: ${mail.token}`,
    });
  }

  async sendPhoneOtp(mail: PhoneOtpMail): Promise<void> {
    await this.transporter.sendMail({
      from: this.from,
      to: mail.email,
      subject: 'PokeSpace — Phone verification code',
      text: `Hi ${mail.username},\n\nYour phone verification code: ${mail.code}`,
    });
  }
}
