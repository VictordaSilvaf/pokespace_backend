import { Injectable } from '@nestjs/common';
import type { EmailVerificationStore } from '../../application/ports/email-verification-store.port.js';

interface Entry {
  userId: string;
  expiresAt: number;
}

@Injectable()
export class InMemoryEmailVerificationStore implements EmailVerificationStore {
  private readonly entries = new Map<string, Entry>();

  async save(token: string, userId: string, ttlSeconds: number): Promise<void> {
    this.entries.set(token, {
      userId,
      expiresAt: Date.now() + ttlSeconds * 1000,
    });
  }

  async consume(token: string): Promise<string | null> {
    const entry = this.entries.get(token);
    if (!entry) {
      return null;
    }

    this.entries.delete(token);
    if (entry.expiresAt < Date.now()) {
      return null;
    }

    return entry.userId;
  }
}
