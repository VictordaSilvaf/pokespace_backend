import { authenticator } from 'otplib';
import { getTwoFactorIssuer } from '../auth.config.js';
import { decryptSecret, encryptSecret } from './secret-crypto.js';

export function generateTotpSecret(): string {
  return authenticator.generateSecret();
}

export function buildTotpUri(secret: string, username: string): string {
  return authenticator.keyuri(username, getTwoFactorIssuer(), secret);
}

export function encryptTotpSecret(secret: string): string {
  return encryptSecret(secret);
}

export function decryptTotpSecret(encrypted: string): string {
  return decryptSecret(encrypted);
}

export function verifyTotpCode(secret: string, code: string): boolean {
  return authenticator.verify({ token: code, secret });
}
