import { describe, expect, it } from 'vitest';
import { IdempotencyRecord } from '../../domain/entities/idempotency-record.entity.js';
import { InMemoryIdempotencyRepository } from './in-memory-idempotency.repository.js';

describe('InMemoryIdempotencyRepository', () => {
  it('finds missing as null', async () => {
    const repo = new InMemoryIdempotencyRepository();
    expect(await repo.find('missing')).toBeNull();
  });

  it('creates and finds existing', async () => {
    const repo = new InMemoryIdempotencyRepository();
    const record = IdempotencyRecord.createProcessing({
      key: 'k1',
      requestHash: 'h1',
      ttlSeconds: 60,
      processingTimeoutSeconds: 10,
    });

    expect(await repo.createProcessing(record)).toBe('created');
    expect(await repo.createProcessing(record)).toBe('conflict');

    const found = await repo.find('k1');
    expect(found?.key).toBe('k1');
    expect(found?.status).toBe('PROCESSING');
  });

  it('completes and fails', async () => {
    const repo = new InMemoryIdempotencyRepository();
    const record = IdempotencyRecord.createProcessing({
      key: 'k2',
      requestHash: 'h2',
      ttlSeconds: 60,
      processingTimeoutSeconds: 10,
    });
    await repo.createProcessing(record);

    await repo.complete('k2', { response: { body: { ok: true } } });
    expect((await repo.find('k2'))?.status).toBe('COMPLETED');
    expect((await repo.find('k2'))?.response?.body).toEqual({ ok: true });

    await repo.fail('k2', { failure: { message: 'boom', code: 'X' } });
    expect((await repo.find('k2'))?.status).toBe('FAILED');
  });

  it('reclaims only when processing expired', async () => {
    const repo = new InMemoryIdempotencyRepository();
    const record = IdempotencyRecord.createProcessing({
      key: 'k3',
      requestHash: 'h3',
      ttlSeconds: 60,
      processingTimeoutSeconds: 10,
    });
    await repo.createProcessing(record);

    const next = IdempotencyRecord.createProcessing({
      key: 'k3',
      requestHash: 'h3',
      ttlSeconds: 60,
      processingTimeoutSeconds: 10,
    });
    expect(await repo.reclaimExpiredProcessing('k3', next)).toBe('conflict');

    repo.expireProcessing('k3');
    expect(await repo.reclaimExpiredProcessing('k3', next)).toBe('reclaimed');
  });
});
