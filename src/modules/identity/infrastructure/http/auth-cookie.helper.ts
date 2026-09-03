import type { Response } from 'express';
import {
  shouldUseRefreshCookie,
  getRefreshTokenTtlSeconds,
} from '../../application/auth.config.js';

const REFRESH_COOKIE_NAME = 'refreshToken';

export function setRefreshTokenCookie(
  res: Response,
  refreshToken: string,
): void {
  if (!shouldUseRefreshCookie()) {
    return;
  }

  res.cookie(REFRESH_COOKIE_NAME, refreshToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: getRefreshTokenTtlSeconds() * 1000,
    path: '/api/v1/auth',
  });
}

export function clearRefreshTokenCookie(res: Response): void {
  if (!shouldUseRefreshCookie()) {
    return;
  }

  res.clearCookie(REFRESH_COOKIE_NAME, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/api/v1/auth',
  });
}

export function getRefreshTokenFromCookie(
  cookies: Record<string, string | undefined>,
): string | undefined {
  return cookies[REFRESH_COOKIE_NAME];
}

export { REFRESH_COOKIE_NAME };
