import { Injectable } from '@nestjs/common';
import type { TempAuthStore } from '../../application/ports/temp-auth-store.port.js';

interface Entry {
  userId: string;
  expiresAt: number;
}

@Injectable()
export class InMemoryTempAuthStore implements TempAuthStore {
  private readonly entries = new Map<string, Entry>();

  async save(tempToken: string, userId: string, ttlSeconds: number): Promise<void> {
    this.entries.set(tempToken, {
      userId,
      expiresAt: Date.now() + ttlSeconds * 1000,
    });
  }

  async consume(tempToken: string): Promise<string | null> {
    const entry = this.entries.get(tempToken);
    if (!entry) {
      return null;
    }

    this.entries.delete(tempToken);
    if (entry.expiresAt < Date.now()) {
      return null;
    }

    return entry.userId;
  }
}
