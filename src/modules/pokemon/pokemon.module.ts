import { Module } from '@nestjs/common';
import type { Pool } from 'pg';
import {
  DATABASE_POOL,
  useInMemoryUserRepository,
} from '../../shared/infrastructure/database/database.pool.port.js';
import { IdentityModule } from '../identity/identity.module.js';
import { CharacterModule } from '../character/character.module.js';
import { POKEMON_REPOSITORY } from './domain/repositories/pokemon.repository.js';
import { ASSET_REGISTRY } from './domain/repositories/asset-registry.port.js';
import { POKEDEX_PROGRESS_REPOSITORY } from './domain/repositories/pokedex-progress.repository.js';
import { InMemoryPokemonRepository } from './infrastructure/persistence/in-memory-pokemon.repository.js';
import { PostgresPokemonRepository } from './infrastructure/persistence/postgres-pokemon.repository.js';
import { InMemoryAssetRegistry } from './infrastructure/persistence/in-memory-asset-registry.js';
import { PostgresAssetRegistry } from './infrastructure/persistence/postgres-asset-registry.js';
import { InMemoryPokedexProgressRepository } from './infrastructure/persistence/in-memory-pokedex-progress.repository.js';
import { PostgresPokedexProgressRepository } from './infrastructure/persistence/postgres-pokedex-progress.repository.js';
import { ListPokemonUseCase } from './application/use-cases/list-pokemon.use-case.js';
import { GetPokemonByDexIdUseCase } from './application/use-cases/get-pokemon-by-dex-id.use-case.js';
import { GetCharacterPokedexUseCase } from './application/use-cases/get-character-pokedex.use-case.js';
import {
  GetCharacterPokedexEntryUseCase,
  MarkPokemonCaughtUseCase,
  MarkPokemonSeenUseCase,
} from './application/use-cases/pokedex-progress.use-cases.js';
import { PokemonController } from './infrastructure/http/pokemon.controller.js';
import { CharacterPokedexController } from './infrastructure/http/character-pokedex.controller.js';

@Module({
  imports: [IdentityModule, CharacterModule],
  controllers: [PokemonController, CharacterPokedexController],
  providers: [
    ListPokemonUseCase,
    GetPokemonByDexIdUseCase,
    GetCharacterPokedexUseCase,
    GetCharacterPokedexEntryUseCase,
    MarkPokemonSeenUseCase,
    MarkPokemonCaughtUseCase,
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
    {
      provide: POKEDEX_PROGRESS_REPOSITORY,
      useFactory: (pool: Pool | null) => {
        if (useInMemoryUserRepository() || !pool) {
          return new InMemoryPokedexProgressRepository();
        }
        return new PostgresPokedexProgressRepository(pool);
      },
      inject: [DATABASE_POOL],
    },
  ],
  exports: [
    POKEMON_REPOSITORY,
    ASSET_REGISTRY,
    POKEDEX_PROGRESS_REPOSITORY,
    ListPokemonUseCase,
    GetPokemonByDexIdUseCase,
    MarkPokemonSeenUseCase,
    MarkPokemonCaughtUseCase,
  ],
})
export class PokemonModule {}
