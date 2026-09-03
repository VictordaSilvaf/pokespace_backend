export const MAILER = Symbol('MAILER');

export interface PasswordResetMail {
  email: string;
  username: string;
  token: string;
}

export interface EmailVerificationMail {
  email: string;
  username: string;
  token: string;
}

export interface PhoneOtpMail {
  email: string;
  username: string;
  code: string;
}

export interface Mailer {
  sendPasswordReset(mail: PasswordResetMail): Promise<void>;
  sendEmailVerification(mail: EmailVerificationMail): Promise<void>;
  sendPhoneOtp(mail: PhoneOtpMail): Promise<void>;
}
