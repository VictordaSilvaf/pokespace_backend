export const TOKEN_DENYLIST = Symbol('TOKEN_DENYLIST');

export interface TokenDenylist {
  revoke(token: string, ttlSeconds: number): Promise<void>;
  isRevoked(token: string): Promise<boolean>;
}
