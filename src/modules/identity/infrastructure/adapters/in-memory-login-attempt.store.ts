import { Injectable } from '@nestjs/common';
import type { LoginAttemptStore } from '../../application/ports/login-attempt-store.port.js';

interface AttemptEntry {
  count: number;
  lockedUntil?: number;
}

@Injectable()
export class InMemoryLoginAttemptStore implements LoginAttemptStore {
  private readonly entries = new Map<string, AttemptEntry>();

  async recordFailure(
    identifier: string,
    lockoutTtlSeconds: number,
  ): Promise<number> {
    const entry = this.entries.get(identifier) ?? { count: 0 };
    entry.count += 1;

    if (entry.count >= Number(process.env.AUTH_MAX_LOGIN_ATTEMPTS ?? 5)) {
      entry.lockedUntil = Date.now() + lockoutTtlSeconds * 1000;
    }

    this.entries.set(identifier, entry);
    return entry.count;
  }

  async clearFailures(identifier: string): Promise<void> {
    this.entries.delete(identifier);
  }

  async isLocked(identifier: string): Promise<boolean> {
    const entry = this.entries.get(identifier);
    if (!entry?.lockedUntil) {
      return false;
    }

    if (entry.lockedUntil < Date.now()) {
      this.entries.delete(identifier);
      return false;
    }

    return true;
  }
}
