import type { Redis } from 'ioredis';
import { Injectable } from '@nestjs/common';
import type { LoginAttemptStore } from '../../application/ports/login-attempt-store.port.js';
import { getRedisKeyPrefix } from '../../../../shared/infrastructure/redis/redis.client.port.js';
import { getMaxLoginAttempts } from '../../application/auth.config.js';

@Injectable()
export class RedisLoginAttemptStore implements LoginAttemptStore {
  private readonly prefix: string;

  constructor(private readonly redis: Redis) {
    this.prefix = getRedisKeyPrefix();
  }

  private failKey(identifier: string): string {
    return `${this.prefix}login:fail:${identifier}`;
  }

  private lockKey(identifier: string): string {
    return `${this.prefix}login:lock:${identifier}`;
  }

  async recordFailure(
    identifier: string,
    lockoutTtlSeconds: number,
  ): Promise<number> {
    const count = await this.redis.incr(this.failKey(identifier));
    await this.redis.expire(this.failKey(identifier), lockoutTtlSeconds);

    if (count >= getMaxLoginAttempts()) {
      await this.redis.set(
        this.lockKey(identifier),
        '1',
        'EX',
        lockoutTtlSeconds,
      );
    }

    return count;
  }

  async clearFailures(identifier: string): Promise<void> {
    await this.redis.del(this.failKey(identifier), this.lockKey(identifier));
  }

  async isLocked(identifier: string): Promise<boolean> {
    const locked = await this.redis.exists(this.lockKey(identifier));
    return locked === 1;
  }
}
