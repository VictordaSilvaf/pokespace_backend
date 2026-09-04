import {
  ConditionalCheckFailedException,
} from '@aws-sdk/client-dynamodb';
import {
  GetCommand,
  PutCommand,
  UpdateCommand,
  type DynamoDBDocumentClient,
} from '@aws-sdk/lib-dynamodb';
import { Logger } from '@nestjs/common';
import {
  IdempotencyRecord,
  type IdempotencyFailurePayload,
  type IdempotencyResultPayload,
  type IdempotencyStatus,
} from '../../../domain/entities/idempotency-record.entity.js';
import type {
  IdempotencyFailure,
  IdempotencyRepository,
  IdempotencyResult,
} from '../../../domain/repositories/idempotency.repository.js';

const PK_PREFIX = 'IDEMPOTENCY#';

interface DynamoIdempotencyItem {
  PK: string;
  status: IdempotencyStatus;
  requestHash: string;
  response?: IdempotencyResultPayload | null;
  failure?: IdempotencyFailurePayload | null;
  createdAt: string;
  expiresAt: number;
  processingExpiresAt: string;
}

export class DynamoDbIdempotencyRepository implements IdempotencyRepository {
  private readonly logger = new Logger(DynamoDbIdempotencyRepository.name);

  constructor(
    private readonly client: DynamoDBDocumentClient,
    private readonly tableName: string,
  ) {}

  async find(
    key: string,
    opts?: { consistent?: boolean },
  ): Promise<IdempotencyRecord | null> {
    const started = Date.now();
    try {
      const result = await this.client.send(
        new GetCommand({
          TableName: this.tableName,
          Key: { PK: this.pk(key) },
          ConsistentRead: opts?.consistent ?? false,
        }),
      );
      this.logOp('GetItem', started, true);
      if (!result.Item) {
        return null;
      }
      return this.fromItem(result.Item as DynamoIdempotencyItem);
    } catch (error) {
      this.logOp('GetItem', started, false, error);
      throw error;
    }
  }

  async createProcessing(
    record: IdempotencyRecord,
  ): Promise<'created' | 'conflict'> {
    const started = Date.now();
    try {
      await this.client.send(
        new PutCommand({
          TableName: this.tableName,
          Item: this.toItem(record),
          ConditionExpression: 'attribute_not_exists(PK)',
        }),
      );
      this.logOp('PutItem', started, true);
      return 'created';
    } catch (error) {
      if (
        error instanceof ConditionalCheckFailedException ||
        (error instanceof Error &&
          error.name === 'ConditionalCheckFailedException')
      ) {
        this.logOp('PutItem', started, true, undefined, {
          conditionalCheckFailed: true,
        });
        return 'conflict';
      }
      this.logOp('PutItem', started, false, error);
      throw error;
    }
  }

  async complete(key: string, result: IdempotencyResult): Promise<void> {
    const started = Date.now();
    try {
      await this.client.send(
        new UpdateCommand({
          TableName: this.tableName,
          Key: { PK: this.pk(key) },
          UpdateExpression:
            'SET #status = :status, #response = :response, #failure = :failure',
          ExpressionAttributeNames: {
            '#status': 'status',
            '#response': 'response',
            '#failure': 'failure',
          },
          ExpressionAttributeValues: {
            ':status': 'COMPLETED',
            ':response': result.response,
            ':failure': null,
          },
        }),
      );
      this.logOp('UpdateItem', started, true);
    } catch (error) {
      this.logOp('UpdateItem', started, false, error);
      throw error;
    }
  }

  async fail(key: string, errorPayload: IdempotencyFailure): Promise<void> {
    const started = Date.now();
    try {
      await this.client.send(
        new UpdateCommand({
          TableName: this.tableName,
          Key: { PK: this.pk(key) },
          UpdateExpression:
            'SET #status = :status, #failure = :failure, #response = :response',
          ExpressionAttributeNames: {
            '#status': 'status',
            '#failure': 'failure',
            '#response': 'response',
          },
          ExpressionAttributeValues: {
            ':status': 'FAILED',
            ':failure': errorPayload.failure,
            ':response': null,
          },
        }),
      );
      this.logOp('UpdateItem', started, true);
    } catch (error) {
      this.logOp('UpdateItem', started, false, error);
      throw error;
    }
  }

  async reclaimExpiredProcessing(
    key: string,
    record: IdempotencyRecord,
  ): Promise<'reclaimed' | 'conflict'> {
    const started = Date.now();
    const nowIso = new Date().toISOString();
    try {
      await this.client.send(
        new PutCommand({
          TableName: this.tableName,
          Item: this.toItem(record),
          ConditionExpression:
            'attribute_not_exists(PK) OR (#status = :processing AND processingExpiresAt < :now)',
          ExpressionAttributeNames: {
            '#status': 'status',
          },
          ExpressionAttributeValues: {
            ':processing': 'PROCESSING',
            ':now': nowIso,
          },
        }),
      );
      this.logOp('PutItem', started, true, undefined, { reclaim: true });
      return 'reclaimed';
    } catch (error) {
      if (
        error instanceof ConditionalCheckFailedException ||
        (error instanceof Error &&
          error.name === 'ConditionalCheckFailedException')
      ) {
        this.logOp('PutItem', started, true, undefined, {
          conditionalCheckFailed: true,
          reclaim: true,
        });
        return 'conflict';
      }
      this.logOp('PutItem', started, false, error);
      throw error;
    }
  }

  private pk(key: string): string {
    return `${PK_PREFIX}${key}`;
  }

  private toItem(record: IdempotencyRecord): DynamoIdempotencyItem {
    return {
      PK: this.pk(record.key),
      status: record.status,
      requestHash: record.requestHash,
      response: record.response,
      failure: record.failure,
      createdAt: record.createdAt.toISOString(),
      // DynamoDB TTL expects epoch seconds
      expiresAt: Math.floor(record.expiresAt.getTime() / 1000),
      processingExpiresAt: record.processingExpiresAt.toISOString(),
    };
  }

  private fromItem(item: DynamoIdempotencyItem): IdempotencyRecord {
    const expiresAtMs =
      typeof item.expiresAt === 'number'
        ? item.expiresAt * 1000
        : new Date(item.expiresAt).getTime();

    return IdempotencyRecord.rehydrate({
      key: item.PK.startsWith(PK_PREFIX)
        ? item.PK.slice(PK_PREFIX.length)
        : item.PK,
      status: item.status,
      requestHash: item.requestHash,
      response: item.response ?? null,
      failure: item.failure ?? null,
      createdAt: new Date(item.createdAt),
      expiresAt: new Date(expiresAtMs),
      processingExpiresAt: new Date(item.processingExpiresAt),
    });
  }

  private logOp(
    operation: string,
    started: number,
    success: boolean,
    error?: unknown,
    extra?: Record<string, unknown>,
  ): void {
    const payload = {
      event: 'dynamodb.operation',
      table: this.tableName,
      operation,
      durationMs: Date.now() - started,
      success,
      ...extra,
      ...(error instanceof Error ? { errorName: error.name } : {}),
    };
    if (success) {
      this.logger.debug(JSON.stringify(payload));
    } else {
      this.logger.warn(JSON.stringify(payload));
    }
  }
}
