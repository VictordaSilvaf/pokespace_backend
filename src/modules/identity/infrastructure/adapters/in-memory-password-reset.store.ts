import { Injectable } from '@nestjs/common';
import type { PasswordResetStore } from '../../application/ports/password-reset-store.port.js';

interface ResetEntry {
  userId: string;
  expiresAt: number;
}

@Injectable()
export class InMemoryPasswordResetStore implements PasswordResetStore {
  private readonly entries = new Map<string, ResetEntry>();

  async save(token: string, userId: string, ttlSeconds: number): Promise<void> {
    this.purgeExpired();
    this.entries.set(token, {
      userId,
      expiresAt: Date.now() + ttlSeconds * 1000,
    });
  }

  async consume(token: string): Promise<string | null> {
    this.purgeExpired();
    const entry = this.entries.get(token);
    if (!entry) {
      return null;
    }

    if (entry.expiresAt < Date.now()) {
      this.entries.delete(token);
      return null;
    }

    this.entries.delete(token);
    return entry.userId;
  }

  private purgeExpired(): void {
    const now = Date.now();
    for (const [token, entry] of this.entries) {
      if (entry.expiresAt < now) {
        this.entries.delete(token);
      }
    }
  }
}
