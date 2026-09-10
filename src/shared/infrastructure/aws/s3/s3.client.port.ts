import type { S3Client } from '@aws-sdk/client-s3';

export const S3_CLIENT = Symbol('S3_CLIENT');

export type S3ClientPort = S3Client | null;

/**
 * Prefer no S3 client unless S3_DRIVER=s3 is set explicitly.
 * Mirrors DYNAMODB_DRIVER / REDIS_DRIVER for tests and local defaults.
 */
export function useInMemoryS3(): boolean {
  return process.env.S3_DRIVER !== 's3';
}
