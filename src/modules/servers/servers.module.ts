import { Module } from '@nestjs/common';
import { ServerController } from './infrastructure/http/server.controller.js';
import { GetServerUseCase } from './application/use-cases/get-server.use-case.js';
import { ListServersUseCase } from './application/use-cases/list-servers.use-case.js';
import { SERVER_REPOSITORY } from './domain/repositories/server.repository.js';
import { Pool } from 'pg';
import { DATABASE_POOL, useInMemoryUserRepository } from '../../shared/infrastructure/database/database.pool.port.js';
import { PostgresServerRepository } from './infrastructure/persistence/postgres-server.repository.js';
import { InMemoryServerRepository } from './infrastructure/persistence/in-memory-server.repository.js';

@Module({
  imports: [
  ],
  controllers: [
    ServerController,
  ],
  providers: [
    ListServersUseCase,
    GetServerUseCase,
    {
      provide: SERVER_REPOSITORY,
      useFactory: (pool: Pool | null) => {
        if (useInMemoryUserRepository() || !pool) {
          return new InMemoryServerRepository();
        }
        return new PostgresServerRepository(pool);
      },
      inject: [DATABASE_POOL],
    }
  ],
  exports: [SERVER_REPOSITORY, GetServerUseCase, ListServersUseCase],
})
export class ServersModule {}
