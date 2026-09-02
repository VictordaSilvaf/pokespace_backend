export const FORGOT_PASSWORD_MESSAGE =
  'If the account exists, reset instructions were sent';

export const PASSWORD_UPDATED_MESSAGE = 'Password updated';

export function getAuthTokenTtlSeconds(): number {
  return Number(process.env.AUTH_TOKEN_TTL ?? 3600);
}

export function getResetTokenTtlSeconds(): number {
  return Number(process.env.AUTH_RESET_TOKEN_TTL ?? 900);
}

export function shouldExposeResetToken(): boolean {
  return process.env.AUTH_EXPOSE_RESET_TOKEN === 'true';
}
