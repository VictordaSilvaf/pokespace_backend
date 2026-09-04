import { describe, expect, it, vi } from 'vitest';
import { ConditionalCheckFailedException } from '@aws-sdk/client-dynamodb';
import type { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb';
import { IdempotencyRecord } from '../../../domain/entities/idempotency-record.entity.js';
import { DynamoDbIdempotencyRepository } from './dynamodb-idempotency.repository.js';

function mockClient(handler: (command: unknown) => Promise<unknown>) {
  return {
    send: vi.fn(handler),
  } as unknown as DynamoDBDocumentClient;
}

describe('DynamoDbIdempotencyRepository', () => {
  it('find returns null when missing', async () => {
    const client = mockClient(async () => ({ Item: undefined }));
    const repo = new DynamoDbIdempotencyRepository(client, 'game-dev-idempotency');
    expect(await repo.find('k')).toBeNull();
  });

  it('find rehydrates existing item', async () => {
    const client = mockClient(async () => ({
      Item: {
        PK: 'IDEMPOTENCY#k1',
        status: 'COMPLETED',
        requestHash: 'h',
        response: { body: { ok: true } },
        failure: null,
        createdAt: '2026-09-04T00:00:00.000Z',
        expiresAt: Math.floor(Date.now() / 1000) + 3600,
        processingExpiresAt: '2026-09-04T00:00:30.000Z',
      },
    }));
    const repo = new DynamoDbIdempotencyRepository(client, 't');
    const found = await repo.find('k1');
    expect(found?.status).toBe('COMPLETED');
    expect(found?.response?.body).toEqual({ ok: true });
  });

  it('createProcessing returns conflict on ConditionalCheckFailed', async () => {
    const client = mockClient(async () => {
      throw new ConditionalCheckFailedException({
        message: 'conditional',
        $metadata: {},
      });
    });
    const repo = new DynamoDbIdempotencyRepository(client, 't');
    const record = IdempotencyRecord.createProcessing({
      key: 'k',
      requestHash: 'h',
      ttlSeconds: 60,
      processingTimeoutSeconds: 10,
    });
    expect(await repo.createProcessing(record)).toBe('conflict');
  });

  it('createProcessing returns created on success', async () => {
    const client = mockClient(async () => ({}));
    const repo = new DynamoDbIdempotencyRepository(client, 't');
    const record = IdempotencyRecord.createProcessing({
      key: 'k',
      requestHash: 'h',
      ttlSeconds: 60,
      processingTimeoutSeconds: 10,
    });
    expect(await repo.createProcessing(record)).toBe('created');
  });

  it('propagates unexpected DynamoDB errors', async () => {
    const client = mockClient(async () => {
      throw new Error('boom');
    });
    const repo = new DynamoDbIdempotencyRepository(client, 't');
    await expect(repo.find('k')).rejects.toThrow('boom');
  });
});
