import {
  Global,
  Inject,
  Injectable,
  Module,
  OnModuleDestroy,
  type Provider,
} from '@nestjs/common';
import { Redis } from 'ioredis';
import { Pool } from 'pg';
import { EVENT_PUBLISHER } from './application/ports/event-publisher.port.js';
import { InMemoryEventPublisher } from './infrastructure/messaging/in-memory-event-publisher.js';
import { DATABASE_POOL, useInMemoryUserRepository } from './infrastructure/database/database.pool.port.js';
import { MigrationRunner } from './infrastructure/database/migration.runner.js';
import {
  REDIS_CLIENT,
  useInMemoryRedis,
  type RedisClient,
} from './infrastructure/redis/redis.client.port.js';
import {
  DYNAMODB_CLIENT,
  useInMemoryDynamoDb,
  type DynamoDbClient,
} from './infrastructure/aws/dynamodb/dynamodb.client.port.js';
import { createDynamoDbDocumentClient } from './infrastructure/aws/dynamodb/dynamodb.document-client.js';

const databasePoolProvider: Provider = {
  provide: DATABASE_POOL,
  useFactory: (): Pool | null => {
    if (useInMemoryUserRepository()) {
      return null;
    }

    const connectionString = process.env.DATABASE_URL;
    if (!connectionString) {
      throw new Error('DATABASE_URL is required when using Postgres persistence');
    }

    return new Pool({ connectionString });
  },
};

const redisClientProvider: Provider = {
  provide: REDIS_CLIENT,
  useFactory: (): RedisClient => {
    if (useInMemoryRedis()) {
      return null;
    }

    return new Redis(process.env.REDIS_URL!, {
      maxRetriesPerRequest: 3,
      lazyConnect: true,
    });
  },
};

const dynamoDbClientProvider: Provider = {
  provide: DYNAMODB_CLIENT,
  useFactory: (): DynamoDbClient => {
    if (useInMemoryDynamoDb()) {
      return null;
    }
    return createDynamoDbDocumentClient();
  },
};

@Injectable()
class DatabaseLifecycle implements OnModuleDestroy {
  constructor(
    @Inject(DATABASE_POOL)
    private readonly pool: Pool | null,
    @Inject(REDIS_CLIENT)
    private readonly redis: RedisClient,
    @Inject(DYNAMODB_CLIENT)
    private readonly dynamo: DynamoDbClient,
  ) {}

  async onModuleDestroy(): Promise<void> {
    await this.pool?.end();
    await this.redis?.quit();
    this.dynamo?.destroy();
  }
}

@Global()
@Module({
  providers: [
    {
      provide: EVENT_PUBLISHER,
      useClass: InMemoryEventPublisher,
    },
    databasePoolProvider,
    redisClientProvider,
    dynamoDbClientProvider,
    {
      provide: MigrationRunner,
      useFactory: (pool: Pool | null) => (pool ? new MigrationRunner(pool) : null),
      inject: [DATABASE_POOL],
    },
    DatabaseLifecycle,
  ],
  exports: [
    EVENT_PUBLISHER,
    DATABASE_POOL,
    REDIS_CLIENT,
    DYNAMODB_CLIENT,
    MigrationRunner,
  ],
})
export class SharedModule {}
