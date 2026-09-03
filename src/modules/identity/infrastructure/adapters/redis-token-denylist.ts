import type { Redis } from 'ioredis';
import { Injectable } from '@nestjs/common';
import type { TokenDenylist } from '../../application/ports/token-denylist.port.js';
import { getRedisKeyPrefix } from '../../../../shared/infrastructure/redis/redis.client.port.js';
import { hashToken } from '../../../../shared/infrastructure/redis/token-hash.js';

@Injectable()
export class RedisTokenDenylist implements TokenDenylist {
  private readonly prefix: string;

  constructor(private readonly redis: Redis) {
    this.prefix = getRedisKeyPrefix();
  }

  async revoke(token: string, ttlSeconds: number): Promise<void> {
    const key = `${this.prefix}deny:${hashToken(token)}`;
    await this.redis.set(key, '1', 'EX', ttlSeconds);
  }

  async isRevoked(token: string): Promise<boolean> {
    const exists = await this.redis.exists(
      `${this.prefix}deny:${hashToken(token)}`,
    );
    return exists === 1;
  }
}
