import {
  CanActivate,
  ExecutionContext,
  Inject,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import type { AuthenticatedUser } from '../../application/dto/auth.dto.js';
import {
  TOKEN_DENYLIST,
  type TokenDenylist,
} from '../../application/ports/token-denylist.port.js';
import {
  TOKEN_SERVICE,
  type TokenService,
} from '../../application/ports/token-service.port.js';
import { translate } from '../../../../shared/infrastructure/i18n/translate.js';

export const REQUEST_USER_KEY = 'user';
export const REQUEST_ACCESS_TOKEN_KEY = 'accessToken';

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(
    @Inject(TOKEN_SERVICE)
    private readonly tokens: TokenService,
    @Inject(TOKEN_DENYLIST)
    private readonly denylist: TokenDenylist,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<{
      headers: { authorization?: string };
      [REQUEST_USER_KEY]?: AuthenticatedUser;
      [REQUEST_ACCESS_TOKEN_KEY]?: string;
    }>();

    const authorization = request.headers.authorization;
    if (!authorization?.startsWith('Bearer ')) {
      throw new UnauthorizedException(
        translate('common.errors.MISSING_AUTH_HEADER'),
      );
    }

    const token = authorization.slice('Bearer '.length).trim();
    if (!token) {
      throw new UnauthorizedException(
        translate('common.errors.MISSING_AUTH_HEADER'),
      );
    }

    if (await this.denylist.isRevoked(token)) {
      throw new UnauthorizedException(translate('common.errors.TOKEN_REVOKED'));
    }

    try {
      const payload = await this.tokens.verify(token);
      request[REQUEST_USER_KEY] = {
        userId: payload.sub,
        email: payload.email,
        username: payload.username,
      };
      request[REQUEST_ACCESS_TOKEN_KEY] = token;
      return true;
    } catch {
      throw new UnauthorizedException(
        translate('common.errors.INVALID_OR_EXPIRED_TOKEN'),
      );
    }
  }
}
