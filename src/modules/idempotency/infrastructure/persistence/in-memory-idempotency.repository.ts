import {
  IdempotencyRecord,
  type IdempotencyFailurePayload,
  type IdempotencyResultPayload,
  type IdempotencyStatus,
} from '../../domain/entities/idempotency-record.entity.js';
import type {
  IdempotencyFailure,
  IdempotencyRepository,
  IdempotencyResult,
} from '../../domain/repositories/idempotency.repository.js';

interface StoredRecord {
  key: string;
  status: IdempotencyStatus;
  requestHash: string;
  response: IdempotencyResultPayload | null;
  failure: IdempotencyFailurePayload | null;
  createdAt: Date;
  expiresAt: Date;
  processingExpiresAt: Date;
}

export class InMemoryIdempotencyRepository implements IdempotencyRepository {
  private readonly store = new Map<string, StoredRecord>();

  async find(
    key: string,
    _opts?: { consistent?: boolean },
  ): Promise<IdempotencyRecord | null> {
    const row = this.store.get(key);
    if (!row) {
      return null;
    }
    if (row.expiresAt.getTime() <= Date.now()) {
      this.store.delete(key);
      return null;
    }
    return IdempotencyRecord.rehydrate({ ...row });
  }

  async createProcessing(
    record: IdempotencyRecord,
  ): Promise<'created' | 'conflict'> {
    const existing = this.store.get(record.key);
    if (existing && existing.expiresAt.getTime() > Date.now()) {
      return 'conflict';
    }
    this.store.set(record.key, this.toStored(record));
    return 'created';
  }

  async complete(key: string, result: IdempotencyResult): Promise<void> {
    const row = this.store.get(key);
    if (!row) {
      return;
    }
    row.status = 'COMPLETED';
    row.response = result.response;
    row.failure = null;
  }

  async fail(key: string, error: IdempotencyFailure): Promise<void> {
    const row = this.store.get(key);
    if (!row) {
      return;
    }
    row.status = 'FAILED';
    row.failure = error.failure;
    row.response = null;
  }

  async reclaimExpiredProcessing(
    key: string,
    record: IdempotencyRecord,
  ): Promise<'reclaimed' | 'conflict'> {
    const row = this.store.get(key);
    if (!row) {
      this.store.set(key, this.toStored(record));
      return 'reclaimed';
    }
    if (
      row.status === 'PROCESSING' &&
      row.processingExpiresAt.getTime() <= Date.now()
    ) {
      this.store.set(key, this.toStored(record));
      return 'reclaimed';
    }
    return 'conflict';
  }

  /** Test helper: force processing expiry. */
  expireProcessing(key: string): void {
    const row = this.store.get(key);
    if (row) {
      row.processingExpiresAt = new Date(Date.now() - 1);
    }
  }

  clear(): void {
    this.store.clear();
  }

  private toStored(record: IdempotencyRecord): StoredRecord {
    return {
      key: record.key,
      status: record.status,
      requestHash: record.requestHash,
      response: record.response,
      failure: record.failure,
      createdAt: record.createdAt,
      expiresAt: record.expiresAt,
      processingExpiresAt: record.processingExpiresAt,
    };
  }
}
