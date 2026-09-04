import { Module } from '@nestjs/common';
import type { Pool } from 'pg';
import {
  DATABASE_POOL,
  useInMemoryUserRepository,
} from '../../shared/infrastructure/database/database.pool.port.js';
import { IdentityModule } from '../identity/identity.module.js';
import { WorldModule } from '../world/world.module.js';
import { CHARACTER_REPOSITORY } from './domain/repositories/character.repository.js';
import { CreateCharacterUseCase } from './application/use-cases/create-character.use-case.js';
import { GetCharacterUseCase } from './application/use-cases/get-character.use-case.js';
import { GetCreationOptionsUseCase } from './application/use-cases/get-creation-options.use-case.js';
import { ListCharactersUseCase } from './application/use-cases/list-characters.use-case.js';
import { CharacterController } from './infrastructure/http/character.controller.js';
import { InMemoryCharacterRepository } from './infrastructure/persistence/in-memory-character.repository.js';
import { PostgresCharacterRepository } from './infrastructure/persistence/postgres-character.repository.js';

@Module({
  imports: [IdentityModule, WorldModule],
  controllers: [CharacterController],
  providers: [
    ListCharactersUseCase,
    CreateCharacterUseCase,
    GetCharacterUseCase,
    GetCreationOptionsUseCase,
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
  exports: [
    CHARACTER_REPOSITORY,
    ListCharactersUseCase,
    CreateCharacterUseCase,
    GetCharacterUseCase,
  ],
})
export class CharacterModule {}
