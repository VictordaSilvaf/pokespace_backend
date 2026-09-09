import { Inject, Injectable } from '@nestjs/common';
import type { UseCase } from '../../../../shared/application/use-case.js';
import {
  POKEDEX_PROGRESS_REPOSITORY,
  type PokedexProgressRepository,
} from '../../domain/repositories/pokedex-progress.repository.js';
import { GetCharacterForAccountUseCase } from '../../../character/application/use-cases/get-character-for-account.use-case.js';
import { DexId } from '../../domain/value-objects/dex-id.vo.js';
import {
  POKEMON_REPOSITORY,
  type PokemonRepository,
} from '../../domain/repositories/pokemon.repository.js';
import { PokemonNotFoundError } from '../../domain/errors/pokemon.errors.js';

export interface GetCharacterPokedexEntryQuery {
  characterId: string;
  accountId: string;
  dexId: number;
}

export interface MarkPokemonSeenCommand {
  characterId: string;
  accountId?: string;
  dexIds: number[];
}

export interface MarkPokemonCaughtCommand {
  characterId: string;
  accountId?: string;
  dexId: number;
}

@Injectable()
export class GetCharacterPokedexEntryUseCase
  implements
    UseCase<
      GetCharacterPokedexEntryQuery,
      {
        dexId: number;
        seenAt: string | null;
        caughtAt: string | null;
        discovered: boolean;
      }
    >
{
  constructor(
    private readonly getCharacter: GetCharacterForAccountUseCase,
    @Inject(POKEDEX_PROGRESS_REPOSITORY)
    private readonly progress: PokedexProgressRepository,
    @Inject(POKEMON_REPOSITORY)
    private readonly pokemon: PokemonRepository,
  ) {}

  async execute(query: GetCharacterPokedexEntryQuery) {
    await this.getCharacter.execute({
      characterId: query.characterId,
      accountId: query.accountId,
    });
    const dexId = DexId.create(query.dexId);
    const species = await this.pokemon.findByDexId(dexId);
    if (!species) {
      throw new PokemonNotFoundError(dexId.value);
    }
    const entry = await this.progress.findByCharacterAndDex(
      query.characterId,
      dexId.value,
    );
    return {
      dexId: dexId.value,
      seenAt: entry?.seenAt.toISOString() ?? null,
      caughtAt: entry?.caughtAt?.toISOString() ?? null,
      discovered: Boolean(entry),
    };
  }
}

@Injectable()
export class MarkPokemonSeenUseCase
  implements UseCase<MarkPokemonSeenCommand, void>
{
  constructor(
    @Inject(POKEDEX_PROGRESS_REPOSITORY)
    private readonly progress: PokedexProgressRepository,
  ) {}

  async execute(command: MarkPokemonSeenCommand): Promise<void> {
    const unique = [...new Set(command.dexIds.filter((d) => d >= 1))];
    for (const dexId of unique) {
      try {
        await this.progress.markSeen(command.characterId, dexId);
      } catch {
        // ignore FK misses for unknown dex
      }
    }
  }
}

@Injectable()
export class MarkPokemonCaughtUseCase
  implements UseCase<MarkPokemonCaughtCommand, void>
{
  constructor(
    @Inject(POKEDEX_PROGRESS_REPOSITORY)
    private readonly progress: PokedexProgressRepository,
  ) {}

  async execute(command: MarkPokemonCaughtCommand): Promise<void> {
    if (command.dexId < 1) return;
    try {
      await this.progress.markCaught(command.characterId, command.dexId);
    } catch {
      // ignore FK misses
    }
  }
}
