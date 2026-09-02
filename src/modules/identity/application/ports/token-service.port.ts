export const TOKEN_SERVICE = Symbol('TOKEN_SERVICE');

export interface AuthTokenPayload {
  sub: string;
  email: string;
}

export interface TokenService {
  sign(payload: AuthTokenPayload): Promise<string>;
  verify(token: string): Promise<AuthTokenPayload>;
}
