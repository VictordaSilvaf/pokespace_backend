import { Inject, Injectable } from '@nestjs/common';
import type { UseCase } from '../../../../shared/application/use-case.js';
import type { AuthResult, RefreshTokenCommand } from '../dto/auth.dto.js';
import {
  REFRESH_TOKEN_STORE,
  type RefreshTokenStore,
} from '../ports/refresh-token-store.port.js';
import {
  USER_REPOSITORY,
  type UserRepository,
} from '../../domain/repositories/user.repository.js';
import { InvalidRefreshTokenError } from '../../domain/errors/identity.errors.js';
import { AuthTokenIssuer } from '../services/auth-token-issuer.service.js';
import { SessionRevoker } from '../services/session-revoker.service.js';

@Injectable()
export class RefreshAccessTokenUseCase
  implements UseCase<RefreshTokenCommand, AuthResult>
{
  constructor(
    @Inject(REFRESH_TOKEN_STORE)
    private readonly refreshStore: RefreshTokenStore,
    @Inject(USER_REPOSITORY)
    private readonly users: UserRepository,
    private readonly tokenIssuer: AuthTokenIssuer,
    private readonly sessions: SessionRevoker,
  ) {}

  async execute(command: RefreshTokenCommand): Promise<AuthResult> {
    const rotation = await this.refreshStore.rotate(command.refreshToken);

    if (rotation.type === 'not_found') {
      throw new InvalidRefreshTokenError();
    }

    if (rotation.type === 'reuse') {
      await this.sessions.revokeFamily(rotation.session.familyId);
      await this.sessions.revokeAllForUser(rotation.session.userId);
      throw new InvalidRefreshTokenError();
    }

    const user = await this.users.findById(rotation.session.userId);
    if (!user) {
      throw new InvalidRefreshTokenError();
    }

    user.assertActive();

    return this.tokenIssuer.issueForUser(
      {
        userId: user.id,
        email: user.email.value,
        phone: user.phone.value,
        username: user.username.value,
      },
      {
        metadata: command.metadata,
        familyId: rotation.session.familyId,
      },
    );
  }
}
