import type { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb';

export const DYNAMODB_CLIENT = Symbol('DYNAMODB_CLIENT');

export type DynamoDbClient = DynamoDBDocumentClient | null;

/**
 * Prefer in-memory adapters unless DYNAMODB_DRIVER=dynamodb is set explicitly.
 * Mirrors REDIS_DRIVER / USER_REPOSITORY_DRIVER safety for tests and local defaults.
 */
export function useInMemoryDynamoDb(): boolean {
  return process.env.DYNAMODB_DRIVER !== 'dynamodb';
}
