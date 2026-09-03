export const FORGOT_PASSWORD_MESSAGE =
  'If the account exists, reset instructions were sent';

export const PASSWORD_UPDATED_MESSAGE = 'Password updated';

export const EMAIL_VERIFIED_MESSAGE = 'Email verified successfully';

export const PHONE_VERIFIED_MESSAGE = 'Phone verified successfully';

export const ACCOUNT_DEACTIVATED_MESSAGE = 'Account deactivated';

export const ACCOUNT_DELETED_MESSAGE = 'Account deleted';

export function getAuthTokenTtlSeconds(): number {
  return Number(process.env.AUTH_TOKEN_TTL ?? 900);
}

export function getRefreshTokenTtlSeconds(): number {
  return Number(process.env.AUTH_REFRESH_TOKEN_TTL ?? 604_800);
}

export function getResetTokenTtlSeconds(): number {
  return Number(process.env.AUTH_RESET_TOKEN_TTL ?? 900);
}

export function getVerifyEmailTtlSeconds(): number {
  return Number(process.env.AUTH_VERIFY_EMAIL_TTL ?? 86_400);
}

export function getPhoneOtpTtlSeconds(): number {
  return Number(process.env.AUTH_PHONE_OTP_TTL ?? 300);
}

export function getTempAuthTtlSeconds(): number {
  return Number(process.env.AUTH_TEMP_TOKEN_TTL ?? 300);
}

export function getMaxLoginAttempts(): number {
  return Number(process.env.AUTH_MAX_LOGIN_ATTEMPTS ?? 5);
}

export function getLockoutTtlSeconds(): number {
  return Number(process.env.AUTH_LOCKOUT_TTL ?? 900);
}

export function shouldExposeResetToken(): boolean {
  return process.env.AUTH_EXPOSE_RESET_TOKEN === 'true';
}

export function shouldExposePhoneOtp(): boolean {
  return process.env.AUTH_EXPOSE_PHONE_OTP === 'true';
}

export function shouldExposeVerifyEmailToken(): boolean {
  return process.env.AUTH_EXPOSE_VERIFY_EMAIL_TOKEN === 'true';
}

export function shouldRequireEmailVerified(): boolean {
  return process.env.AUTH_REQUIRE_EMAIL_VERIFIED === 'true';
}

export function shouldUseRefreshCookie(): boolean {
  return process.env.AUTH_REFRESH_COOKIE === 'true';
}

export function getTwoFactorIssuer(): string {
  return process.env.AUTH_2FA_ISSUER ?? 'PokeSpace';
}

export function useSmtpMailer(): boolean {
  return Boolean(process.env.SMTP_HOST);
}
