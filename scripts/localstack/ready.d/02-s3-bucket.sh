#!/usr/bin/env sh
# LocalStack ready hook — create the S3 bucket used for asset objects.
set -eu

ENDPOINT="${LOCALSTACK_HOSTNAME:-localhost}"
export AWS_ACCESS_KEY_ID=test
export AWS_SECRET_ACCESS_KEY=test
export AWS_DEFAULT_REGION="${AWS_REGION:-sa-east-1}"
export S3_BUCKET="${S3_BUCKET:-pokespace-dev-assets}"

awslocal s3 mb "s3://${S3_BUCKET}" 2>/dev/null || true
awslocal s3api put-bucket-cors --bucket "${S3_BUCKET}" --cors-configuration '{
  "CORSRules": [
    {
      "AllowedOrigins": ["*"],
      "AllowedMethods": ["GET", "HEAD"],
      "AllowedHeaders": ["*"],
      "MaxAgeSeconds": 3600
    }
  ]
}' 2>/dev/null || true

echo "localstack s3 bucket initialized: ${S3_BUCKET}"
