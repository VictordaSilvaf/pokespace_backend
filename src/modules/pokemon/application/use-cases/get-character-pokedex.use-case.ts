import { Inject, Injectable } from '@nestjs/common';
import type { UseCase } from '../../../../shared/application/use-case.js';
import {
  POKEDEX_PROGRESS_REPOSITORY,
  type PokedexProgressRepository,
} from '../../domain/repositories/pokedex-progress.repository.js';
import {
  POKEMON_REPOSITORY,
  type PokemonRepository,
} from '../../domain/repositories/pokemon.repository.js';
import { GetCharacterForAccountUseCase } from '../../../character/application/use-cases/get-character-for-account.use-case.js';

export interface GetCharacterPokedexQuery {
  characterId: string;
  accountId: string;
}

export interface CharacterPokedexResult {
  totalCatalog: number;
  seen: number;
  caught: number;
  entries: Array<{
    dexId: number;
    seenAt: string;
    caughtAt: string | null;
  }>;
}

@Injectable()
export class GetCharacterPokedexUseCase
  implements UseCase<GetCharacterPokedexQuery, CharacterPokedexResult>
{
  constructor(
    private readonly getCharacter: GetCharacterForAccountUseCase,
    @Inject(POKEDEX_PROGRESS_REPOSITORY)
    private readonly progress: PokedexProgressRepository,
    @Inject(POKEMON_REPOSITORY)
    private readonly pokemon: PokemonRepository,
  ) {}

  async execute(
    query: GetCharacterPokedexQuery,
  ): Promise<CharacterPokedexResult> {
    await this.getCharacter.execute({
      characterId: query.characterId,
      accountId: query.accountId,
    });

    const [entries, totalCatalog] = await Promise.all([
      this.progress.listByCharacter(query.characterId),
      this.pokemon.countActive(),
    ]);

    const caught = entries.filter((e) => e.caughtAt != null).length;
    return {
      totalCatalog,
      seen: entries.length,
      caught,
      entries: entries.map((e) => ({
        dexId: e.dexId,
        seenAt: e.seenAt.toISOString(),
        caughtAt: e.caughtAt?.toISOString() ?? null,
      })),
    };
  }
}
