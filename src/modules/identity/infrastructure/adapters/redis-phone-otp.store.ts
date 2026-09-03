import type { Redis } from 'ioredis';
import { Injectable } from '@nestjs/common';
import type { PhoneOtpStore } from '../../application/ports/phone-otp-store.port.js';
import { getRedisKeyPrefix } from '../../../../shared/infrastructure/redis/redis.client.port.js';

@Injectable()
export class RedisPhoneOtpStore implements PhoneOtpStore {
  private readonly prefix: string;

  constructor(private readonly redis: Redis) {
    this.prefix = getRedisKeyPrefix();
  }

  async save(userId: string, code: string, ttlSeconds: number): Promise<void> {
    await this.redis.set(
      `${this.prefix}phone-otp:${userId}`,
      code,
      'EX',
      ttlSeconds,
    );
  }

  async consume(userId: string, code: string): Promise<boolean> {
    const key = `${this.prefix}phone-otp:${userId}`;
    const stored = await this.redis.get(key);
    if (!stored || stored !== code) {
      return false;
    }

    await this.redis.del(key);
    return true;
  }
}
