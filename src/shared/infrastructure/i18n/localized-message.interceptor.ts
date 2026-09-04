import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { map, type Observable } from 'rxjs';
import { translate } from './translate.js';

function isI18nKey(value: string): boolean {
  return /^(common|identity|world|character)\./.test(value);
}

@Injectable()
export class LocalizedMessageInterceptor implements NestInterceptor {
  intercept(_context: ExecutionContext, next: CallHandler): Observable<unknown> {
    return next.handle().pipe(
      map((data: unknown) => {
        if (
          data &&
          typeof data === 'object' &&
          'message' in data &&
          typeof (data as { message: unknown }).message === 'string' &&
          isI18nKey((data as { message: string }).message)
        ) {
          return {
            ...(data as Record<string, unknown>),
            message: translate((data as { message: string }).message),
          };
        }
        return data;
      }),
    );
  }
}
