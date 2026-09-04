import { describe, expect, it } from 'vitest';
import { InMemoryIdempotencyRepository } from '../../infrastructure/persistence/in-memory-idempotency.repository.js';
import {
  IdempotencyInProgressError,
  IdempotencyKeyMismatchError,
} from '../../domain/errors/idempotency.errors.js';
import { IdempotencyService } from './idempotency.service.js';
import { hashIdempotencyRequest } from '../idempotency-hash.js';

describe('IdempotencyService', () => {
  it('executes once and returns cached result on replay', async () => {
    const repo = new InMemoryIdempotencyRepository();
    const service = new IdempotencyService(repo);
    let runs = 0;

    const first = await service.run({
      key: 'char-create-1',
      requestHash: hashIdempotencyRequest({ name: 'Ash' }),
      execute: async () => {
        runs += 1;
        return { id: 'c1' };
      },
    });

    const second = await service.run({
      key: 'char-create-1',
      requestHash: hashIdempotencyRequest({ name: 'Ash' }),
      execute: async () => {
        runs += 1;
        return { id: 'c2' };
      },
    });

    expect(first).toEqual({ id: 'c1' });
    expect(second).toEqual({ id: 'c1' });
    expect(runs).toBe(1);
    expect(service.getMetrics().hits).toBe(1);
    expect(service.getMetrics().executes).toBe(1);
  });

  it('rejects same key with different request hash', async () => {
    const repo = new InMemoryIdempotencyRepository();
    const service = new IdempotencyService(repo);

    await service.run({
      key: 'k1',
      requestHash: hashIdempotencyRequest({ a: 1 }),
      execute: async () => ({ ok: true }),
    });

    await expect(
      service.run({
        key: 'k1',
        requestHash: hashIdempotencyRequest({ a: 2 }),
        execute: async () => ({ ok: false }),
      }),
    ).rejects.toBeInstanceOf(IdempotencyKeyMismatchError);
  });

  it('raises in-progress when processing and not expired', async () => {
    const repo = new InMemoryIdempotencyRepository();
    const service = new IdempotencyService(repo);

    let release!: () => void;
    const gate = new Promise<void>((resolve) => {
      release = resolve;
    });

    const pending = service.run({
      key: 'busy',
      requestHash: 'hash',
      execute: async () => {
        await gate;
        return { done: true };
      },
    });

    // Wait until PROCESSING is persisted
    await new Promise((r) => setTimeout(r, 10));

    await expect(
      service.run({
        key: 'busy',
        requestHash: 'hash',
        execute: async () => ({ done: false }),
      }),
    ).rejects.toBeInstanceOf(IdempotencyInProgressError);

    release();
    await pending;
  });

  it('reclaims expired processing and executes again', async () => {
    const repo = new InMemoryIdempotencyRepository();
    const service = new IdempotencyService(repo);

    await repo.createProcessing(
      (
        await import('../../domain/entities/idempotency-record.entity.js')
      ).IdempotencyRecord.createProcessing({
        key: 'stale',
        requestHash: 'hash',
        ttlSeconds: 3600,
        processingTimeoutSeconds: 1,
      }),
    );
    repo.expireProcessing('stale');

    let runs = 0;
    const result = await service.run({
      key: 'stale',
      requestHash: 'hash',
      execute: async () => {
        runs += 1;
        return { reclaimed: true };
      },
    });

    expect(result).toEqual({ reclaimed: true });
    expect(runs).toBe(1);
  });

  it('only one of many concurrent requests executes', async () => {
    const repo = new InMemoryIdempotencyRepository();
    const service = new IdempotencyService(repo);
    let runs = 0;

    const results = await Promise.all(
      Array.from({ length: 100 }, () =>
        service
          .run({
            key: 'concurrent',
            requestHash: 'same',
            execute: async () => {
              runs += 1;
              await new Promise((r) => setTimeout(r, 5));
              return { value: 42 };
            },
          })
          .catch((error: unknown) => error),
      ),
    );

    const successes = results.filter(
      (r) => !(r instanceof Error) && (r as { value: number }).value === 42,
    );
    const inProgress = results.filter(
      (r) => r instanceof IdempotencyInProgressError,
    );

    expect(runs).toBe(1);
    expect(successes.length + inProgress.length).toBe(100);
    expect(successes.length).toBeGreaterThanOrEqual(1);
  });
});
