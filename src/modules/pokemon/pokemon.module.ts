import { Module } from '@nestjs/common';
import type { Pool } from 'pg';
import {
  DATABASE_POOL,
  useInMemoryUserRepository,
} from '../../shared/infrastructure/database/database.pool.port.js';
import { POKEMON_REPOSITORY } from './domain/repositories/pokemon.repository.js';
import { ASSET_REGISTRY } from './domain/repositories/asset-registry.port.js';
import { InMemoryPokemonRepository } from './infrastructure/persistence/in-memory-pokemon.repository.js';
import { PostgresPokemonRepository } from './infrastructure/persistence/postgres-pokemon.repository.js';
import { InMemoryAssetRegistry } from './infrastructure/persistence/in-memory-asset-registry.js';
import { PostgresAssetRegistry } from './infrastructure/persistence/postgres-asset-registry.js';
import { ListPokemonUseCase } from './application/use-cases/list-pokemon.use-case.js';
import { GetPokemonByDexIdUseCase } from './application/use-cases/get-pokemon-by-dex-id.use-case.js';
import { PokemonController } from './infrastructure/http/pokemon.controller.js';

@Module({
  controllers: [PokemonController],
  providers: [
    ListPokemonUseCase,
    GetPokemonByDexIdUseCase,
    {
      provide: POKEMON_REPOSITORY,
      useFactory: (pool: Pool | null) => {
        if (useInMemoryUserRepository() || !pool) {
          return new InMemoryPokemonRepository();
        }
        return new PostgresPokemonRepository(pool);
      },
      inject: [DATABASE_POOL],
    },
    {
      provide: ASSET_REGISTRY,
      useFactory: (pool: Pool | null) => {
        if (useInMemoryUserRepository() || !pool) {
          return new InMemoryAssetRegistry();
        }
        return new PostgresAssetRegistry(pool);
      },
      inject: [DATABASE_POOL],
    },
  ],
  exports: [
    POKEMON_REPOSITORY,
    ASSET_REGISTRY,
    ListPokemonUseCase,
    GetPokemonByDexIdUseCase,
  ],
})
export class PokemonModule {}
