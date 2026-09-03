import type { Redis } from 'ioredis';
import { Injectable } from '@nestjs/common';
import type { PasswordResetStore } from '../../application/ports/password-reset-store.port.js';
import { getRedisKeyPrefix } from '../../../../shared/infrastructure/redis/redis.client.port.js';
import { hashToken } from '../../../../shared/infrastructure/redis/token-hash.js';

@Injectable()
export class RedisPasswordResetStore implements PasswordResetStore {
  private readonly prefix: string;

  constructor(private readonly redis: Redis) {
    this.prefix = getRedisKeyPrefix();
  }

  async save(token: string, userId: string, ttlSeconds: number): Promise<void> {
    const key = `${this.prefix}reset:${hashToken(token)}`;
    await this.redis.set(key, userId, 'EX', ttlSeconds);
  }

  async consume(token: string): Promise<string | null> {
    const key = `${this.prefix}reset:${hashToken(token)}`;
    const userId = await this.redis.get(key);
    if (!userId) {
      return null;
    }

    await this.redis.del(key);
    return userId;
  }
}
