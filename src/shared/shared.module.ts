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

@Injectable()
class DatabaseLifecycle implements OnModuleDestroy {
  constructor(
    @Inject(DATABASE_POOL)
    private readonly pool: Pool | null,
    @Inject(REDIS_CLIENT)
    private readonly redis: RedisClient,
  ) {}

  async onModuleDestroy(): Promise<void> {
    await this.pool?.end();
    await this.redis?.quit();
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
    {
      provide: MigrationRunner,
      useFactory: (pool: Pool | null) => (pool ? new MigrationRunner(pool) : null),
      inject: [DATABASE_POOL],
    },
    DatabaseLifecycle,
  ],
  exports: [EVENT_PUBLISHER, DATABASE_POOL, REDIS_CLIENT, MigrationRunner],
})
export class SharedModule {}
