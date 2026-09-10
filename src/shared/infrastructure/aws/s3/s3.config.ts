export interface S3Config {
  region: string;
  bucket: string;
  /** Custom endpoint (LocalStack, MinIO, R2). Omit for real AWS. */
  endpoint?: string;
  /** Required for LocalStack / MinIO path-style addressing. */
  forcePathStyle: boolean;
  /**
   * Public base URL for browser-facing assets (CDN or bucket website).
   * Example: `https://cdn.pokenaut.victorsf.com` or LocalStack
   * `http://localhost:4566/pokespace-dev-assets`.
   */
  publicBaseUrl?: string;
}

export function getS3Config(): S3Config {
  // R2 uses `auto`; fall back to shared AWS_REGION, then sa-east-1.
  const region =
    process.env.S3_REGION?.trim() ||
    process.env.AWS_REGION?.trim() ||
    'sa-east-1';
  const bucket =
    process.env.S3_BUCKET?.trim() || 'pokespace-dev-assets';
  const endpoint = process.env.S3_ENDPOINT?.trim() || undefined;
  const forcePathStyle = process.env.S3_FORCE_PATH_STYLE === 'true';
  const publicBaseUrl =
    process.env.S3_PUBLIC_BASE_URL?.trim().replace(/\/+$/, '') ||
    undefined;

  return {
    region,
    bucket,
    endpoint,
    forcePathStyle,
    publicBaseUrl,
  };
}

export function getS3Bucket(): string {
  return getS3Config().bucket;
}

/**
 * Turn a registry-relative path (`sprites/creature/376.png`) into an absolute
 * public URL when `S3_PUBLIC_BASE_URL` is set; otherwise returns the path as-is.
 *
 * Ignores S3 API endpoints (`*.r2.cloudflarestorage.com`) — those are not
 * browser-CDN URLs. Use r2.dev or a custom domain instead.
 */
export function resolveS3PublicUrl(path: string): string {
  const cleaned = path.replace(/^\/+/, '');
  const { publicBaseUrl } = getS3Config();
  if (!publicBaseUrl || isS3ApiEndpoint(publicBaseUrl)) {
    return cleaned;
  }
  return `${publicBaseUrl}/${cleaned}`;
}

function isS3ApiEndpoint(url: string): boolean {
  try {
    const host = new URL(url).hostname.toLowerCase();
    return host.endsWith('.r2.cloudflarestorage.com');
  } catch {
    return false;
  }
}
