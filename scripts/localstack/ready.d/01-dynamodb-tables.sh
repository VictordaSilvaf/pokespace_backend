#!/usr/bin/env sh
# LocalStack ready hook — create DynamoDB tables used by the API.
set -eu

ENDPOINT="${LOCALSTACK_HOSTNAME:-localhost}"
export DYNAMODB_ENDPOINT="http://${ENDPOINT}:4566"
export AWS_ACCESS_KEY_ID=test
export AWS_SECRET_ACCESS_KEY=test
export AWS_DEFAULT_REGION="${AWS_REGION:-sa-east-1}"
export DYNAMODB_TABLE_IDEMPOTENCY="${DYNAMODB_TABLE_IDEMPOTENCY:-game-dev-idempotency}"
export DYNAMODB_TABLE_PLAYER_HISTORY="${DYNAMODB_TABLE_PLAYER_HISTORY:-game-dev-player-history}"

awslocal dynamodb create-table \
  --table-name "${DYNAMODB_TABLE_IDEMPOTENCY}" \
  --attribute-definitions AttributeName=PK,AttributeType=S \
  --key-schema AttributeName=PK,KeyType=HASH \
  --billing-mode PAY_PER_REQUEST \
  2>/dev/null || true

awslocal dynamodb update-time-to-live \
  --table-name "${DYNAMODB_TABLE_IDEMPOTENCY}" \
  --time-to-live-specification "Enabled=true,AttributeName=expiresAt" \
  2>/dev/null || true

awslocal dynamodb create-table \
  --table-name "${DYNAMODB_TABLE_PLAYER_HISTORY}" \
  --attribute-definitions \
    AttributeName=PK,AttributeType=S \
    AttributeName=SK,AttributeType=S \
  --key-schema \
    AttributeName=PK,KeyType=HASH \
    AttributeName=SK,KeyType=RANGE \
  --billing-mode PAY_PER_REQUEST \
  2>/dev/null || true

echo "localstack dynamodb tables initialized"
