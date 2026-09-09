import { Inject, Injectable } from '@nestjs/common';
import type { UseCase } from '../../../../shared/application/use-case.js';
import {
  POKEMON_REPOSITORY,
  type PokemonRepository,
} from '../../domain/repositories/pokemon.repository.js';
import {
  ASSET_REGISTRY,
  type AssetRegistry,
} from '../../domain/repositories/asset-registry.port.js';
import {
  toPokemonListItem,
  type ListPokemonQueryDto,
  type PokemonListResult,
} from '../dto/pokemon.dto.js';

const DEFAULT_LIMIT = 50;
const MAX_LIMIT = 100;

@Injectable()
export class ListPokemonUseCase
  implements UseCase<ListPokemonQueryDto | void, PokemonListResult>
{
  constructor(
    @Inject(POKEMON_REPOSITORY)
    private readonly pokemonRepository: PokemonRepository,
    @Inject(ASSET_REGISTRY)
    private readonly assets: AssetRegistry,
  ) {}

  async execute(query: ListPokemonQueryDto = {}): Promise<PokemonListResult> {
    const limit = clampLimit(query.limit);
    const offset = Math.max(0, Number(query.offset) || 0);

    const page = await this.pokemonRepository.listActivePage({
      q: query.q,
      type: query.type,
      limit,
      offset,
    });

    const items = await Promise.all(
      page.items.map(async (pokemon) => {
        const assets = await this.assets.findVisualsByDexId(pokemon.dexId);
        return toPokemonListItem(pokemon, assets ?? undefined);
      }),
    );

    return {
      items,
      total: page.total,
      limit,
      offset,
    };
  }
}

function clampLimit(raw: number | undefined): number {
  const n = Number(raw);
  if (!Number.isFinite(n) || n < 1) {
    return DEFAULT_LIMIT;
  }
  return Math.min(MAX_LIMIT, Math.floor(n));
}
