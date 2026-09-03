import type { Redis } from 'ioredis';
import { Injectable } from '@nestjs/common';
import type { EmailVerificationStore } from '../../application/ports/email-verification-store.port.js';
import { getRedisKeyPrefix } from '../../../../shared/infrastructure/redis/redis.client.port.js';
import { hashToken } from '../../../../shared/infrastructure/redis/token-hash.js';

@Injectable()
export class RedisEmailVerificationStore implements EmailVerificationStore {
  private readonly prefix: string;

  constructor(private readonly redis: Redis) {
    this.prefix = getRedisKeyPrefix();
  }

  async save(token: string, userId: string, ttlSeconds: number): Promise<void> {
    await this.redis.set(
      `${this.prefix}verify-email:${hashToken(token)}`,
      userId,
      'EX',
      ttlSeconds,
    );
  }

  async consume(token: string): Promise<string | null> {
    const key = `${this.prefix}verify-email:${hashToken(token)}`;
    const userId = await this.redis.get(key);
    if (!userId) {
      return null;
    }

    await this.redis.del(key);
    return userId;
  }
}
