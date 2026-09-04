import type {
  IdempotencyFailurePayload,
  IdempotencyRecord,
  IdempotencyResultPayload,
} from '../entities/idempotency-record.entity.js';

export const IDEMPOTENCY_REPOSITORY = Symbol('IDEMPOTENCY_REPOSITORY');

export interface IdempotencyResult {
  response: IdempotencyResultPayload;
}

export interface IdempotencyFailure {
  failure: IdempotencyFailurePayload;
}

export interface IdempotencyRepository {
  find(
    key: string,
    opts?: { consistent?: boolean },
  ): Promise<IdempotencyRecord | null>;

  createProcessing(
    record: IdempotencyRecord,
  ): Promise<'created' | 'conflict'>;

  complete(key: string, result: IdempotencyResult): Promise<void>;

  fail(key: string, error: IdempotencyFailure): Promise<void>;

  reclaimExpiredProcessing(
    key: string,
    record: IdempotencyRecord,
  ): Promise<'reclaimed' | 'conflict'>;
}
