import { describe, expect, it } from 'vitest';
import {
  assertValidIdempotencyKey,
  hashIdempotencyRequest,
} from './idempotency-hash.js';

describe('idempotency-hash', () => {
  it('hashes objects stably regardless of key order', () => {
    const a = hashIdempotencyRequest({ b: 2, a: 1 });
    const b = hashIdempotencyRequest({ a: 1, b: 2 });
    expect(a).toBe(b);
  });

  it('validates key format', () => {
    expect(assertValidIdempotencyKey('abc-123')).toBe(true);
    expect(assertValidIdempotencyKey('')).toBe(false);
    expect(assertValidIdempotencyKey('has space')).toBe(false);
    expect(assertValidIdempotencyKey('a'.repeat(129))).toBe(false);
  });
});
