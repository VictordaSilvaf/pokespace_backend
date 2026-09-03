import type { Redis } from 'ioredis';
import { Injectable } from '@nestjs/common';
import type {
  RefreshSession,
  RefreshTokenStore,
  RotateRefreshResult,
  SaveRefreshSessionInput,
  SessionInfo,
} from '../../application/ports/refresh-token-store.port.js';
import { getRedisKeyPrefix } from '../../../../shared/infrastructure/redis/redis.client.port.js';
import { hashToken } from '../../../../shared/infrastructure/redis/token-hash.js';

interface StoredSession extends RefreshSession {
  status: 'active' | 'revoked';
}

@Injectable()
export class RedisRefreshTokenStore implements RefreshTokenStore {
  private readonly prefix: string;

  constructor(private readonly redis: Redis) {
    this.prefix = getRedisKeyPrefix();
  }

  private tokenKey(token: string): string {
    return `${this.prefix}refresh:${hashToken(token)}`;
  }

  private sessionKey(sessionId: string): string {
    return `${this.prefix}session:${sessionId}`;
  }

  private userKey(userId: string): string {
    return `${this.prefix}user-sessions:${userId}`;
  }

  private familyKey(familyId: string): string {
    return `${this.prefix}session-family:${familyId}`;
  }

  async saveSession(input: SaveRefreshSessionInput): Promise<void> {
    const session: StoredSession = {
      sessionId: input.sessionId,
      userId: input.userId,
      familyId: input.familyId,
      metadata: input.metadata ?? {},
      createdAt: new Date().toISOString(),
      status: 'active',
    };

    const pipeline = this.redis.pipeline();
    pipeline.set(
      this.tokenKey(input.refreshToken),
      JSON.stringify(session),
      'EX',
      input.ttlSeconds,
    );
    pipeline.set(
      this.sessionKey(input.sessionId),
      input.refreshToken,
      'EX',
      input.ttlSeconds,
    );
    pipeline.sadd(this.userKey(input.userId), input.sessionId);
    pipeline.expire(this.userKey(input.userId), input.ttlSeconds);
    pipeline.sadd(this.familyKey(input.familyId), input.sessionId);
    pipeline.expire(this.familyKey(input.familyId), input.ttlSeconds);
    await pipeline.exec();
  }

  async rotate(refreshToken: string): Promise<RotateRefreshResult> {
    const key = this.tokenKey(refreshToken);
    const raw = await this.redis.get(key);
    if (!raw) {
      return { type: 'not_found' };
    }

    const session = JSON.parse(raw) as StoredSession;
    if (session.status === 'revoked') {
      return { type: 'reuse', session };
    }

    session.status = 'revoked';
    const ttl = await this.redis.ttl(key);
    if (ttl > 0) {
      await this.redis.set(key, JSON.stringify(session), 'EX', ttl);
    }

    return { type: 'ok', session };
  }

  async revokeSession(sessionId: string, userId: string): Promise<void> {
    const refreshToken = await this.redis.get(this.sessionKey(sessionId));
    if (!refreshToken) {
      return;
    }

    const raw = await this.redis.get(this.tokenKey(refreshToken));
    if (!raw) {
      return;
    }

    const session = JSON.parse(raw) as StoredSession;
    if (session.userId !== userId) {
      return;
    }

    await this.removeSession(session, refreshToken);
  }

  async revokeAllForUser(userId: string): Promise<void> {
    const sessionIds = await this.redis.smembers(this.userKey(userId));
    for (const sessionId of sessionIds) {
      await this.revokeSession(sessionId, userId);
    }
  }

  async revokeFamily(familyId: string): Promise<void> {
    const sessionIds = await this.redis.smembers(this.familyKey(familyId));
    for (const sessionId of sessionIds) {
      const refreshToken = await this.redis.get(this.sessionKey(sessionId));
      if (!refreshToken) {
        continue;
      }

      const raw = await this.redis.get(this.tokenKey(refreshToken));
      if (!raw) {
        continue;
      }

      const session = JSON.parse(raw) as StoredSession;
      await this.removeSession(session, refreshToken);
    }
  }

  async listSessions(
    userId: string,
    currentSessionId?: string,
  ): Promise<SessionInfo[]> {
    const sessionIds = await this.redis.smembers(this.userKey(userId));
    const sessions: SessionInfo[] = [];

    for (const sessionId of sessionIds) {
      const refreshToken = await this.redis.get(this.sessionKey(sessionId));
      if (!refreshToken) {
        continue;
      }

      const raw = await this.redis.get(this.tokenKey(refreshToken));
      if (!raw) {
        continue;
      }

      const session = JSON.parse(raw) as StoredSession;
      if (session.status !== 'active') {
        continue;
      }

      sessions.push({
        sessionId: session.sessionId,
        familyId: session.familyId,
        userAgent: session.metadata.userAgent,
        ip: session.metadata.ip,
        createdAt: session.createdAt,
        current: sessionId === currentSessionId,
      });
    }

    return sessions.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }

  async revoke(refreshToken: string): Promise<void> {
    const raw = await this.redis.get(this.tokenKey(refreshToken));
    if (!raw) {
      return;
    }

    const session = JSON.parse(raw) as StoredSession;
    await this.removeSession(session, refreshToken);
  }

  private async removeSession(
    session: StoredSession,
    refreshToken: string,
  ): Promise<void> {
    const pipeline = this.redis.pipeline();
    pipeline.del(this.tokenKey(refreshToken));
    pipeline.del(this.sessionKey(session.sessionId));
    pipeline.srem(this.userKey(session.userId), session.sessionId);
    pipeline.srem(this.familyKey(session.familyId), session.sessionId);
    await pipeline.exec();
  }
}
