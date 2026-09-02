import { Injectable } from '@nestjs/common';
import type { TokenDenylist } from '../../application/ports/token-denylist.port.js';

interface DenyEntry {
  expiresAt: number;
}

@Injectable()
export class InMemoryTokenDenylist implements TokenDenylist {
  private readonly entries = new Map<string, DenyEntry>();

  async revoke(token: string, ttlSeconds: number): Promise<void> {
    this.purgeExpired();
    this.entries.set(token, {
      expiresAt: Date.now() + ttlSeconds * 1000,
    });
  }

  async isRevoked(token: string): Promise<boolean> {
    this.purgeExpired();
    const entry = this.entries.get(token);
    if (!entry) {
      return false;
    }

    if (entry.expiresAt < Date.now()) {
      this.entries.delete(token);
      return false;
    }

    return true;
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
