import { Module } from '@nestjs/common';
import { WorldController } from './infrastructure/http/world.controller.js';
import { GetWorldUseCase } from './application/use-cases/get-world.use-case.js';
import { ListWorldsUseCase } from './application/use-cases/list-worlds.use-case.js';
import { WORLD_REPOSITORY } from './domain/repositories/world.repository.js';
import { Pool } from 'pg';
import { DATABASE_POOL, useInMemoryUserRepository } from '../../shared/infrastructure/database/database.pool.port.js';
import { PostgresWorldRepository } from './infrastructure/persistence/postgres-world.repository.js';
import { InMemoryWorldRepository } from './infrastructure/persistence/in-memory-world.repository.js';

@Module({
  imports: [
  ],
  controllers: [
    WorldController,
  ],
  providers: [
    ListWorldsUseCase,
    GetWorldUseCase,
    {
      provide: WORLD_REPOSITORY,
      useFactory: (pool: Pool | null) => {
        if (useInMemoryUserRepository() || !pool) {
          return new InMemoryWorldRepository();
        }
        return new PostgresWorldRepository(pool);
      },
      inject: [DATABASE_POOL],
    }
  ],
  exports: [
    WORLD_REPOSITORY,
    ListWorldsUseCase,
    GetWorldUseCase,
  ],
})
export class WorldModule {}
