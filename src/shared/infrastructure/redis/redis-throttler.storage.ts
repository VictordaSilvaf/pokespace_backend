import { Injectable } from '@nestjs/common';
import type { ThrottlerStorage } from '@nestjs/throttler';
import type { ThrottlerStorageRecord } from '@nestjs/throttler/dist/throttler-storage-record.interface.js';
import type { Redis } from 'ioredis';
import { getRedisKeyPrefix } from './redis.client.port.js';

@Injectable()
export class RedisThrottlerStorage implements ThrottlerStorage {
  constructor(private readonly redis: Redis) {}

  private key(throttlerName: string, key: string): string {
    return `${getRedisKeyPrefix()}throttle:${throttlerName}:${key}`;
  }

  async increment(
    key: string,
    ttl: number,
    limit: number,
    blockDuration: number,
    throttlerName: string,
  ): Promise<ThrottlerStorageRecord> {
    const redisKey = this.key(throttlerName, key);
    const totalHits = await this.redis.incr(redisKey);

    if (totalHits === 1) {
      await this.redis.pexpire(redisKey, ttl);
    }

    const timeToExpire = await this.redis.pttl(redisKey);
    const isBlocked = totalHits > limit;
    const timeToBlockExpire = isBlocked ? blockDuration : 0;

    if (isBlocked && blockDuration > 0) {
      await this.redis.pexpire(redisKey, blockDuration);
    }

    return {
      totalHits,
      timeToExpire: Math.max(timeToExpire, 0),
      isBlocked,
      timeToBlockExpire,
    };
  }
}
