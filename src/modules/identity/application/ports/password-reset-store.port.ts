export const PASSWORD_RESET_STORE = Symbol('PASSWORD_RESET_STORE');

export interface PasswordResetStore {
  save(token: string, userId: string, ttlSeconds: number): Promise<void>;
  consume(token: string): Promise<string | null>;
}
