export const EMAIL_VERIFICATION_STORE = Symbol('EMAIL_VERIFICATION_STORE');

export interface EmailVerificationStore {
  save(token: string, userId: string, ttlSeconds: number): Promise<void>;
  consume(token: string): Promise<string | null>;
}
