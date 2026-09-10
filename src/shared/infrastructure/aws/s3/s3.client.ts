import { S3Client } from '@aws-sdk/client-s3';
import { getS3Config } from './s3.config.js';

function resolveS3Credentials():
  | { accessKeyId: string; secretAccessKey: string }
  | undefined {
  const accessKeyId =
    process.env.S3_ACCESS_KEY_ID?.trim() ||
    process.env.AWS_ACCESS_KEY_ID?.trim();
  const secretAccessKey =
    process.env.S3_SECRET_ACCESS_KEY?.trim() ||
    process.env.AWS_SECRET_ACCESS_KEY?.trim();

  if (!accessKeyId || !secretAccessKey) {
    return undefined;
  }

  return { accessKeyId, secretAccessKey };
}

export function createS3Client(): S3Client {
  const config = getS3Config();
  const credentials = resolveS3Credentials();

  return new S3Client({
    region: config.region,
    ...(config.endpoint ? { endpoint: config.endpoint } : {}),
    ...(config.forcePathStyle ? { forcePathStyle: true } : {}),
    ...(credentials
      ? { credentials }
      : config.endpoint
        ? {
            // LocalStack / custom endpoint without explicit keys
            credentials: {
              accessKeyId: 'test',
              secretAccessKey: 'test',
            },
          }
        : {}),
  });
}
