import type { Redis } from 'ioredis';
import { Injectable } from '@nestjs/common';
import type { TempAuthStore } from '../../application/ports/temp-auth-store.port.js';
import { getRedisKeyPrefix } from '../../../../shared/infrastructure/redis/redis.client.port.js';
import { hashToken } from '../../../../shared/infrastructure/redis/token-hash.js';

@Injectable()
export class RedisTempAuthStore implements TempAuthStore {
  private readonly prefix: string;

  constructor(private readonly redis: Redis) {
    this.prefix = getRedisKeyPrefix();
  }

  async save(tempToken: string, userId: string, ttlSeconds: number): Promise<void> {
    await this.redis.set(
      `${this.prefix}temp-auth:${hashToken(tempToken)}`,
      userId,
      'EX',
      ttlSeconds,
    );
  }

  async consume(tempToken: string): Promise<string | null> {
    const key = `${this.prefix}temp-auth:${hashToken(tempToken)}`;
    const userId = await this.redis.get(key);
    if (!userId) {
      return null;
    }

    await this.redis.del(key);
    return userId;
  }
}
