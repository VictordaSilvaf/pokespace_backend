import { Inject, Injectable, Optional } from '@nestjs/common';
import {
  REDIS_CLIENT,
  type RedisClient,
} from '../../../../shared/infrastructure/redis/redis.client.port.js';

export interface PresencePayload {
  instanceId: string;
  entityId: string;
  characterId: string;
  position: { x: number; y: number; z: number };
  direction: string;
}

/**
 * Shared presence for multi-replica readiness.
 * Uses Redis when available; otherwise keeps a local Map (single process).
 */
@Injectable()
export class SharedWorldStateService {
  private readonly local = new Map<string, PresencePayload>();

  constructor(
    @Optional()
    @Inject(REDIS_CLIENT)
    private readonly redis: RedisClient | null,
  ) {}

  async publishPresence(payload: PresencePayload): Promise<void> {
    const key = this.key(payload.instanceId, payload.entityId);
    this.local.set(key, payload);
    if (this.redis) {
      try {
        await this.redis.set(
          `world:presence:${key}`,
          JSON.stringify(payload),
          'EX',
          120,
        );
      } catch {
        // best-effort
      }
    }
  }

  async clearPresence(instanceId: string, entityId: string): Promise<void> {
    const key = this.key(instanceId, entityId);
    this.local.delete(key);
    if (this.redis) {
      try {
        await this.redis.del(`world:presence:${key}`);
      } catch {
        // best-effort
      }
    }
  }

  getLocalPresence(instanceId: string): PresencePayload[] {
    return [...this.local.values()].filter((p) => p.instanceId === instanceId);
  }

  private key(instanceId: string, entityId: string): string {
    return `${instanceId}:${entityId}`;
  }
}
