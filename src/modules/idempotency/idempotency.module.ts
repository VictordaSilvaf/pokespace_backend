import { Module } from '@nestjs/common';
import {
  DYNAMODB_CLIENT,
  useInMemoryDynamoDb,
  type DynamoDbClient,
} from '../../shared/infrastructure/aws/dynamodb/dynamodb.client.port.js';
import { getIdempotencyTableName } from '../../shared/infrastructure/aws/dynamodb/dynamodb.config.js';
import { IDEMPOTENCY_REPOSITORY } from './domain/repositories/idempotency.repository.js';
import { IdempotencyService } from './application/services/idempotency.service.js';
import { InMemoryIdempotencyRepository } from './infrastructure/persistence/in-memory-idempotency.repository.js';
import { DynamoDbIdempotencyRepository } from './infrastructure/persistence/dynamodb/dynamodb-idempotency.repository.js';

@Module({
  providers: [
    IdempotencyService,
    {
      provide: IDEMPOTENCY_REPOSITORY,
      useFactory: (client: DynamoDbClient) => {
        if (useInMemoryDynamoDb() || !client) {
          return new InMemoryIdempotencyRepository();
        }
        return new DynamoDbIdempotencyRepository(
          client,
          getIdempotencyTableName(),
        );
      },
      inject: [DYNAMODB_CLIENT],
    },
  ],
  exports: [IdempotencyService, IDEMPOTENCY_REPOSITORY],
})
export class IdempotencyModule {}
