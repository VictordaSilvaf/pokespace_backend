export const TEMP_AUTH_STORE = Symbol('TEMP_AUTH_STORE');

export interface TempAuthStore {
  save(tempToken: string, userId: string, ttlSeconds: number): Promise<void>;
  consume(tempToken: string): Promise<string | null>;
}
