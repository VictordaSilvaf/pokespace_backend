import { Injectable } from '@nestjs/common';
import type {
  RefreshSession,
  RefreshTokenStore,
  RotateRefreshResult,
  SaveRefreshSessionInput,
  SessionInfo,
} from '../../application/ports/refresh-token-store.port.js';

interface SessionEntry {
  session: RefreshSession;
  refreshToken: string;
  status: 'active' | 'revoked';
  expiresAt: number;
}

@Injectable()
export class InMemoryRefreshTokenStore implements RefreshTokenStore {
  private readonly byToken = new Map<string, SessionEntry>();
  private readonly bySessionId = new Map<string, string>();
  private readonly byUser = new Map<string, Set<string>>();
  private readonly byFamily = new Map<string, Set<string>>();

  async saveSession(input: SaveRefreshSessionInput): Promise<void> {
    this.purgeExpired();
    const entry: SessionEntry = {
      session: {
        sessionId: input.sessionId,
        userId: input.userId,
        familyId: input.familyId,
        metadata: input.metadata ?? {},
        createdAt: new Date().toISOString(),
      },
      refreshToken: input.refreshToken,
      status: 'active',
      expiresAt: Date.now() + input.ttlSeconds * 1000,
    };

    this.byToken.set(input.refreshToken, entry);
    this.bySessionId.set(input.sessionId, input.refreshToken);

    const userSessions = this.byUser.get(input.userId) ?? new Set<string>();
    userSessions.add(input.sessionId);
    this.byUser.set(input.userId, userSessions);

    const familySessions = this.byFamily.get(input.familyId) ?? new Set<string>();
    familySessions.add(input.sessionId);
    this.byFamily.set(input.familyId, familySessions);
  }

  async rotate(refreshToken: string): Promise<RotateRefreshResult> {
    this.purgeExpired();
    const entry = this.byToken.get(refreshToken);
    if (!entry) {
      return { type: 'not_found' };
    }

    if (entry.status === 'revoked') {
      return { type: 'reuse', session: entry.session };
    }

    entry.status = 'revoked';
    this.byToken.set(refreshToken, entry);
    return { type: 'ok', session: entry.session };
  }

  async revokeSession(sessionId: string, userId: string): Promise<void> {
    const token = this.bySessionId.get(sessionId);
    if (!token) {
      return;
    }

    const entry = this.byToken.get(token);
    if (!entry || entry.session.userId !== userId) {
      return;
    }

    await this.removeSession(entry);
  }

  async revokeAllForUser(userId: string): Promise<void> {
    const sessionIds = this.byUser.get(userId);
    if (!sessionIds) {
      return;
    }

    for (const sessionId of [...sessionIds]) {
      const token = this.bySessionId.get(sessionId);
      if (!token) {
        continue;
      }

      const entry = this.byToken.get(token);
      if (entry) {
        await this.removeSession(entry);
      }
    }
  }

  async revokeFamily(familyId: string): Promise<void> {
    const sessionIds = this.byFamily.get(familyId);
    if (!sessionIds) {
      return;
    }

    for (const sessionId of [...sessionIds]) {
      const token = this.bySessionId.get(sessionId);
      if (!token) {
        continue;
      }

      const entry = this.byToken.get(token);
      if (entry) {
        await this.removeSession(entry);
      }
    }
  }

  async listSessions(
    userId: string,
    currentSessionId?: string,
  ): Promise<SessionInfo[]> {
    this.purgeExpired();
    const sessionIds = this.byUser.get(userId);
    if (!sessionIds) {
      return [];
    }

    const sessions: SessionInfo[] = [];
    for (const sessionId of sessionIds) {
      const token = this.bySessionId.get(sessionId);
      if (!token) {
        continue;
      }

      const entry = this.byToken.get(token);
      if (!entry || entry.status !== 'active') {
        continue;
      }

      sessions.push({
        sessionId: entry.session.sessionId,
        familyId: entry.session.familyId,
        userAgent: entry.session.metadata.userAgent,
        ip: entry.session.metadata.ip,
        createdAt: entry.session.createdAt,
        current: sessionId === currentSessionId,
      });
    }

    return sessions.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }

  async revoke(refreshToken: string): Promise<void> {
    const entry = this.byToken.get(refreshToken);
    if (entry) {
      await this.removeSession(entry);
    }
  }

  private async removeSession(entry: SessionEntry): Promise<void> {
    this.byToken.delete(entry.refreshToken);
    this.bySessionId.delete(entry.session.sessionId);
    this.byUser.get(entry.session.userId)?.delete(entry.session.sessionId);
    this.byFamily.get(entry.session.familyId)?.delete(entry.session.sessionId);
  }

  private purgeExpired(): void {
    const now = Date.now();
    for (const [token, entry] of this.byToken) {
      if (entry.expiresAt < now) {
        void this.removeSession(entry);
        this.byToken.delete(token);
      }
    }
  }
}
