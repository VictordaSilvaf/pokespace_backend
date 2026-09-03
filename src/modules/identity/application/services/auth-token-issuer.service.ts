import { randomUUID } from 'node:crypto';
import { Inject, Injectable } from '@nestjs/common';
import type { AuthResult } from '../dto/auth.dto.js';
import { getRefreshTokenTtlSeconds } from '../auth.config.js';
import {
  REFRESH_TOKEN_STORE,
  type RefreshTokenStore,
  type SessionMetadata,
} from '../ports/refresh-token-store.port.js';
import {
  TOKEN_SERVICE,
  type TokenService,
} from '../ports/token-service.port.js';
import { generateRefreshToken } from './refresh-token.generator.js';
import { createSessionIds } from './session-id.util.js';

export interface AuthUserSnapshot {
  userId: string;
  email: string;
  phone: string;
  username: string;
}

export interface IssueTokensOptions {
  metadata?: SessionMetadata;
  familyId?: string;
}

@Injectable()
export class AuthTokenIssuer {
  constructor(
    @Inject(TOKEN_SERVICE)
    private readonly tokens: TokenService,
    @Inject(REFRESH_TOKEN_STORE)
    private readonly refreshStore: RefreshTokenStore,
  ) {}

  async issueForUser(
    user: AuthUserSnapshot,
    options: IssueTokensOptions = {},
  ): Promise<AuthResult> {
    const accessToken = await this.tokens.sign({
      sub: user.userId,
      email: user.email,
      username: user.username,
    });

    const refreshToken = generateRefreshToken();
    const { sessionId, familyId } = createSessionIds();

    await this.refreshStore.saveSession({
      refreshToken,
      userId: user.userId,
      sessionId,
      familyId: options.familyId ?? familyId,
      ttlSeconds: getRefreshTokenTtlSeconds(),
      metadata: options.metadata,
    });

    return {
      ...user,
      accessToken,
      refreshToken,
      sessionId,
    };
  }
}

export function generateTempToken(): string {
  return randomUUID();
}
