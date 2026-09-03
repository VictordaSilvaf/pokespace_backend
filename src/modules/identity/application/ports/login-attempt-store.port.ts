export const LOGIN_ATTEMPT_STORE = Symbol('LOGIN_ATTEMPT_STORE');

export interface LoginAttemptStore {
  recordFailure(identifier: string, lockoutTtlSeconds: number): Promise<number>;
  clearFailures(identifier: string): Promise<void>;
  isLocked(identifier: string): Promise<boolean>;
}
