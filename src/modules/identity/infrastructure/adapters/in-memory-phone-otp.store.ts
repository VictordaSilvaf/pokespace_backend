import { Injectable } from '@nestjs/common';
import type { PhoneOtpStore } from '../../application/ports/phone-otp-store.port.js';

interface Entry {
  code: string;
  expiresAt: number;
}

@Injectable()
export class InMemoryPhoneOtpStore implements PhoneOtpStore {
  private readonly entries = new Map<string, Entry>();

  async save(userId: string, code: string, ttlSeconds: number): Promise<void> {
    this.entries.set(userId, {
      code,
      expiresAt: Date.now() + ttlSeconds * 1000,
    });
  }

  async consume(userId: string, code: string): Promise<boolean> {
    const entry = this.entries.get(userId);
    if (!entry || entry.code !== code || entry.expiresAt < Date.now()) {
      return false;
    }

    this.entries.delete(userId);
    return true;
  }
}
