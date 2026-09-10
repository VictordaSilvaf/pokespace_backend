import { afterEach, describe, expect, it } from 'vitest';
import { getS3Config, resolveS3PublicUrl } from './s3.config.js';

const KEYS = [
  'AWS_REGION',
  'S3_REGION',
  'S3_BUCKET',
  'S3_ENDPOINT',
  'S3_FORCE_PATH_STYLE',
  'S3_PUBLIC_BASE_URL',
] as const;

describe('getS3Config', () => {
  const previous = new Map<string, string | undefined>();

  afterEach(() => {
    for (const key of KEYS) {
      const value = previous.get(key);
      if (value === undefined) {
        delete process.env[key];
      } else {
        process.env[key] = value;
      }
    }
    previous.clear();
  });

  function setEnv(partial: Partial<Record<(typeof KEYS)[number], string>>) {
    for (const key of KEYS) {
      previous.set(key, process.env[key]);
      if (key in partial) {
        process.env[key] = partial[key];
      } else {
        delete process.env[key];
      }
    }
  }

  it('defaults for local/dev without endpoint', () => {
    setEnv({ AWS_REGION: 'sa-east-1' });

    expect(getS3Config()).toEqual({
      region: 'sa-east-1',
      bucket: 'pokespace-dev-assets',
      endpoint: undefined,
      forcePathStyle: false,
      publicBaseUrl: undefined,
    });
  });

  it('enables path-style only when S3_FORCE_PATH_STYLE=true', () => {
    setEnv({
      AWS_REGION: 'sa-east-1',
      S3_BUCKET: 'pokespace-dev-assets',
      S3_ENDPOINT: 'http://localhost:4566',
      S3_FORCE_PATH_STYLE: 'true',
      S3_PUBLIC_BASE_URL: 'http://localhost:4566/pokespace-dev-assets',
    });

    const config = getS3Config();
    expect(config.forcePathStyle).toBe(true);
    expect(config.endpoint).toBe('http://localhost:4566');
    expect(config.publicBaseUrl).toBe(
      'http://localhost:4566/pokespace-dev-assets',
    );
  });

  it('prefers S3_REGION (R2 auto) over AWS_REGION', () => {
    setEnv({
      AWS_REGION: 'sa-east-1',
      S3_REGION: 'auto',
      S3_BUCKET: 'pokespace',
    });

    expect(getS3Config().region).toBe('auto');
  });

  it('strips trailing slash from public base URL', () => {
    setEnv({
      S3_PUBLIC_BASE_URL: 'https://cdn.example.com/assets/',
    });

    expect(getS3Config().publicBaseUrl).toBe('https://cdn.example.com/assets');
  });
});

describe('resolveS3PublicUrl', () => {
  const previous = process.env.S3_PUBLIC_BASE_URL;

  afterEach(() => {
    if (previous === undefined) {
      delete process.env.S3_PUBLIC_BASE_URL;
    } else {
      process.env.S3_PUBLIC_BASE_URL = previous;
    }
  });

  it('returns cleaned path when public base is unset', () => {
    delete process.env.S3_PUBLIC_BASE_URL;
    expect(resolveS3PublicUrl('/sprites/creature/1.png')).toBe(
      'sprites/creature/1.png',
    );
  });

  it('prefixes public base when set', () => {
    process.env.S3_PUBLIC_BASE_URL = 'https://cdn.example.com';
    expect(resolveS3PublicUrl('sprites/creature/1.png')).toBe(
      'https://cdn.example.com/sprites/creature/1.png',
    );
  });

  it('ignores R2 S3 API endpoints as public base', () => {
    process.env.S3_PUBLIC_BASE_URL =
      'https://abc123.r2.cloudflarestorage.com/pokespace';
    expect(resolveS3PublicUrl('sprites/creature/1.png')).toBe(
      'sprites/creature/1.png',
    );
  });
});
