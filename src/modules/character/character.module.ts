import { Module } from '@nestjs/common';
import type { Pool } from 'pg';
import {
  DATABASE_POOL,
  useInMemoryUserRepository,
} from '../../shared/infrastructure/database/database.pool.port.js';
import { IdentityModule } from '../identity/identity.module.js';
import { ServersModule } from '../servers/servers.module.js';
import { WorldModule } from '../world/world.module.js';
import { IdempotencyModule } from '../idempotency/idempotency.module.js';
import { CHARACTER_REPOSITORY } from './domain/repositories/character.repository.js';
import { InMemoryCharacterRepository } from './infrastructure/persistence/in-memory-character.repository.js';
import { PostgresCharacterRepository } from './infrastructure/persistence/postgres-character.repository.js';
import { CreateCharacterUseCase } from './application/use-cases/create-character.use-case.js';
import { GetCharacterForAccountUseCase } from './application/use-cases/get-character-for-account.use-case.js';
import { CharacterController } from './infrastructure/http/character.controller.js';

@Module({
  imports: [IdentityModule, ServersModule, WorldModule, IdempotencyModule],
  controllers: [CharacterController],
  providers: [
    CreateCharacterUseCase,
    GetCharacterForAccountUseCase,
    {
      provide: CHARACTER_REPOSITORY,
      useFactory: (pool: Pool | null) => {
        if (useInMemoryUserRepository() || !pool) {
          return new InMemoryCharacterRepository();
        }
        return new PostgresCharacterRepository(pool);
      },
      inject: [DATABASE_POOL],
    },
  ],
  exports: [CHARACTER_REPOSITORY, GetCharacterForAccountUseCase],
})
export class CharacterModule {}
