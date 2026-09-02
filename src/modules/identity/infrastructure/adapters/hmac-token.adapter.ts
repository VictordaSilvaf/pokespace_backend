import { createHmac, timingSafeEqual } from 'node:crypto';
import { Injectable } from '@nestjs/common';
import type {
  AuthTokenPayload,
  TokenService,
} from '../../application/ports/token-service.port.js';

/**
 * Token HMAC simples para bootstrap.
 * Substituir por JWT (@nestjs/jwt) quando a feature amadurecer.
 */
@Injectable()
export class HmacTokenService implements TokenService {
  private readonly secret =
    process.env.AUTH_TOKEN_SECRET ?? 'dev-only-change-me';

  private readonly ttlSeconds = Number(process.env.AUTH_TOKEN_TTL ?? 3600);

  async sign(payload: AuthTokenPayload): Promise<string> {
    const body = {
      ...payload,
      exp: Math.floor(Date.now() / 1000) + this.ttlSeconds,
    };
    const encoded = Buffer.from(JSON.stringify(body)).toString('base64url');
    const signature = this.signRaw(encoded);
    return `${encoded}.${signature}`;
  }

  async verify(token: string): Promise<AuthTokenPayload> {
    const [encoded, signature] = token.split('.');
    if (!encoded || !signature) {
      throw new Error('Invalid token');
    }

    const expected = this.signRaw(encoded);
    const a = Buffer.from(signature);
    const b = Buffer.from(expected);

    if (a.length !== b.length || !timingSafeEqual(a, b)) {
      throw new Error('Invalid token signature');
    }

    const payload = JSON.parse(
      Buffer.from(encoded, 'base64url').toString('utf8'),
    ) as AuthTokenPayload & { exp: number };

    if (payload.exp < Math.floor(Date.now() / 1000)) {
      throw new Error('Token expired');
    }

    return { sub: payload.sub, email: payload.email, username: payload.username };
  }

  private signRaw(encoded: string): string {
    return createHmac('sha256', this.secret).update(encoded).digest('base64url');
  }
}
