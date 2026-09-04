import { createHash } from 'node:crypto';

/** Stable SHA-256 hash of a request payload for idempotency mismatch detection. */
export function hashIdempotencyRequest(payload: unknown): string {
  const normalized = stableStringify(payload);
  return createHash('sha256').update(normalized).digest('hex');
}

function stableStringify(value: unknown): string {
  if (value === null || typeof value !== 'object') {
    return JSON.stringify(value);
  }
  if (Array.isArray(value)) {
    return `[${value.map((item) => stableStringify(item)).join(',')}]`;
  }
  const entries = Object.entries(value as Record<string, unknown>).sort(
    ([a], [b]) => a.localeCompare(b),
  );
  return `{${entries
    .map(([key, val]) => `${JSON.stringify(key)}:${stableStringify(val)}`)
    .join(',')}}`;
}

const KEY_PATTERN = /^[\x21-\x7E]{1,128}$/;

export function assertValidIdempotencyKey(key: string): boolean {
  return KEY_PATTERN.test(key);
}
