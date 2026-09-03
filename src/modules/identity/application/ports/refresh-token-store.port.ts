export const REFRESH_TOKEN_STORE = Symbol('REFRESH_TOKEN_STORE');

export interface SessionMetadata {
  userAgent?: string;
  ip?: string;
}

export interface SessionInfo {
  sessionId: string;
  familyId: string;
  userAgent?: string;
  ip?: string;
  createdAt: string;
  current: boolean;
}

export interface RefreshSession {
  sessionId: string;
  userId: string;
  familyId: string;
  metadata: SessionMetadata;
  createdAt: string;
}

export type RotateRefreshResult =
  | { type: 'ok'; session: RefreshSession }
  | { type: 'not_found' }
  | { type: 'reuse'; session: RefreshSession };

export interface SaveRefreshSessionInput {
  refreshToken: string;
  userId: string;
  sessionId: string;
  familyId: string;
  ttlSeconds: number;
  metadata?: SessionMetadata;
}

export interface RefreshTokenStore {
  saveSession(input: SaveRefreshSessionInput): Promise<void>;
  rotate(refreshToken: string): Promise<RotateRefreshResult>;
  revokeSession(sessionId: string, userId: string): Promise<void>;
  revokeAllForUser(userId: string): Promise<void>;
  revokeFamily(familyId: string): Promise<void>;
  listSessions(userId: string, currentSessionId?: string): Promise<SessionInfo[]>;
  revoke(refreshToken: string): Promise<void>;
}
