import {
  Global,
  Inject,
  Injectable,
  Module,
  OnModuleDestroy,
  type Provider,
} from '@nestjs/common';
import { Pool } from 'pg';
import { EVENT_PUBLISHER } from './application/ports/event-publisher.port.js';
import { InMemoryEventPublisher } from './infrastructure/messaging/in-memory-event-publisher.js';
import { DATABASE_POOL, useInMemoryUserRepository } from './infrastructure/database/database.pool.port.js';
import { MigrationRunner } from './infrastructure/database/migration.runner.js';

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

@Injectable()
class DatabaseLifecycle implements OnModuleDestroy {
  constructor(
    @Inject(DATABASE_POOL)
    private readonly pool: Pool | null,
  ) {}

  async onModuleDestroy(): Promise<void> {
    await this.pool?.end();
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
    {
      provide: MigrationRunner,
      useFactory: (pool: Pool | null) => (pool ? new MigrationRunner(pool) : null),
      inject: [DATABASE_POOL],
    },
    DatabaseLifecycle,
  ],
  exports: [EVENT_PUBLISHER, DATABASE_POOL, MigrationRunner],
})
export class SharedModule {}
