export const MAILER = Symbol('MAILER');

export interface PasswordResetMail {
  email: string;
  username: string;
  token: string;
}

export interface Mailer {
  sendPasswordReset(mail: PasswordResetMail): Promise<void>;
}
