import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import type { AuthenticatedUser } from '../../application/dto/auth.dto.js';
import { REQUEST_ACCESS_TOKEN_KEY, REQUEST_USER_KEY } from './auth.guard.js';

export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): AuthenticatedUser => {
    const request = ctx.switchToHttp().getRequest<{
      [REQUEST_USER_KEY]: AuthenticatedUser;
    }>();
    return request[REQUEST_USER_KEY];
  },
);

export const AccessToken = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): string => {
    const request = ctx.switchToHttp().getRequest<{
      [REQUEST_ACCESS_TOKEN_KEY]: string;
    }>();
    return request[REQUEST_ACCESS_TOKEN_KEY];
  },
);
