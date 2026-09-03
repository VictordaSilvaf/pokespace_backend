import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import type {
  AuthTokenPayload,
  TokenService,
} from '../../application/ports/token-service.port.js';
import { getAuthTokenTtlSeconds } from '../../application/auth.config.js';

@Injectable()
export class JwtTokenService implements TokenService {
  constructor(private readonly jwt: JwtService) {}

  async sign(payload: AuthTokenPayload): Promise<string> {
    return this.jwt.signAsync(
      {
        email: payload.email,
        username: payload.username,
      },
      {
        subject: payload.sub,
        expiresIn: getAuthTokenTtlSeconds(),
      },
    );
  }

  async verify(token: string): Promise<AuthTokenPayload> {
    const payload = await this.jwt.verifyAsync<{
      sub: string;
      email: string;
      username: string;
    }>(token);

    return {
      sub: payload.sub,
      email: payload.email,
      username: payload.username,
    };
  }
}
