export interface DynamoDbConfig {
  region: string;
  endpoint?: string;
  idempotencyTable: string;
  playerHistoryTable?: string;
}

export function getDynamoDbConfig(): DynamoDbConfig {
  const region = process.env.AWS_REGION ?? 'sa-east-1';
  const endpoint = process.env.DYNAMODB_ENDPOINT?.trim() || undefined;
  const idempotencyTable =
    process.env.DYNAMODB_TABLE_IDEMPOTENCY?.trim() || 'game-dev-idempotency';
  const playerHistoryTable =
    process.env.DYNAMODB_TABLE_PLAYER_HISTORY?.trim() || undefined;

  return {
    region,
    endpoint,
    idempotencyTable,
    playerHistoryTable,
  };
}

export function getIdempotencyTableName(): string {
  return getDynamoDbConfig().idempotencyTable;
}
