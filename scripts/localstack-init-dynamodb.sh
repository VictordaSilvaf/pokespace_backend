#!/usr/bin/env bash
# Create DynamoDB tables in LocalStack for local development.
set -euo pipefail

ENDPOINT="${DYNAMODB_ENDPOINT:-http://localstack:4566}"
REGION="${AWS_REGION:-sa-east-1}"
IDEMPOTENCY_TABLE="${DYNAMODB_TABLE_IDEMPOTENCY:-game-dev-idempotency}"
HISTORY_TABLE="${DYNAMODB_TABLE_PLAYER_HISTORY:-game-dev-player-history}"

export AWS_ACCESS_KEY_ID="${AWS_ACCESS_KEY_ID:-test}"
export AWS_SECRET_ACCESS_KEY="${AWS_SECRET_ACCESS_KEY:-test}"
export AWS_DEFAULT_REGION="${REGION}"

echo "Waiting for LocalStack DynamoDB at ${ENDPOINT}..."
for i in $(seq 1 60); do
  if awslocal dynamodb list-tables --endpoint-url "${ENDPOINT}" >/dev/null 2>&1 \
    || aws dynamodb list-tables --endpoint-url "${ENDPOINT}" --region "${REGION}" >/dev/null 2>&1; then
    break
  fi
  sleep 1
done

AWS_CMD=(aws)
if command -v awslocal >/dev/null 2>&1; then
  AWS_CMD=(awslocal)
fi

create_idempotency() {
  "${AWS_CMD[@]}" dynamodb create-table \
    --endpoint-url "${ENDPOINT}" \
    --region "${REGION}" \
    --table-name "${IDEMPOTENCY_TABLE}" \
    --attribute-definitions AttributeName=PK,AttributeType=S \
    --key-schema AttributeName=PK,KeyType=HASH \
    --billing-mode PAY_PER_REQUEST \
    2>/dev/null || true

  "${AWS_CMD[@]}" dynamodb update-time-to-live \
    --endpoint-url "${ENDPOINT}" \
    --region "${REGION}" \
    --table-name "${IDEMPOTENCY_TABLE}" \
    --time-to-live-specification "Enabled=true,AttributeName=expiresAt" \
    2>/dev/null || true
}

create_history() {
  "${AWS_CMD[@]}" dynamodb create-table \
    --endpoint-url "${ENDPOINT}" \
    --region "${REGION}" \
    --table-name "${HISTORY_TABLE}" \
    --attribute-definitions \
      AttributeName=PK,AttributeType=S \
      AttributeName=SK,AttributeType=S \
    --key-schema \
      AttributeName=PK,KeyType=HASH \
      AttributeName=SK,KeyType=RANGE \
    --billing-mode PAY_PER_REQUEST \
    2>/dev/null || true
}

create_idempotency
create_history

echo "DynamoDB LocalStack tables ready: ${IDEMPOTENCY_TABLE}, ${HISTORY_TABLE}"
