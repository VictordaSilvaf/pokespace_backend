import { Inject, Injectable } from '@nestjs/common';
import { getAuthTokenTtlSeconds } from '../auth.config.js';
import {
  REFRESH_TOKEN_STORE,
  type RefreshTokenStore,
} from '../ports/refresh-token-store.port.js';
import {
  TOKEN_DENYLIST,
  type TokenDenylist,
} from '../ports/token-denylist.port.js';

@Injectable()
export class SessionRevoker {
  constructor(
    @Inject(TOKEN_DENYLIST)
    private readonly denylist: TokenDenylist,
    @Inject(REFRESH_TOKEN_STORE)
    private readonly refreshStore: RefreshTokenStore,
  ) {}

  async revokeAccessToken(accessToken: string): Promise<void> {
    await this.denylist.revoke(accessToken, getAuthTokenTtlSeconds());
  }

  async revokeRefreshToken(refreshToken: string): Promise<void> {
    await this.refreshStore.revoke(refreshToken);
  }

  async revokeSession(sessionId: string, userId: string): Promise<void> {
    await this.refreshStore.revokeSession(sessionId, userId);
  }

  async revokeAllForUser(
    userId: string,
    currentAccessToken?: string,
  ): Promise<void> {
    if (currentAccessToken) {
      await this.revokeAccessToken(currentAccessToken);
    }

    await this.refreshStore.revokeAllForUser(userId);
  }

  async revokeFamily(familyId: string): Promise<void> {
    await this.refreshStore.revokeFamily(familyId);
  }
}
