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
import { DexId } from '../../domain/value-objects/dex-id.vo.js';
import { PokemonNotFoundError } from '../../domain/errors/pokemon.errors.js';
import {
  toPokemonResult,
  type GetPokemonByDexIdQuery,
  type PokemonResult,
} from '../dto/pokemon.dto.js';

@Injectable()
export class GetPokemonByDexIdUseCase
  implements UseCase<GetPokemonByDexIdQuery, PokemonResult>
{
  constructor(
    @Inject(POKEMON_REPOSITORY)
    private readonly pokemonRepository: PokemonRepository,
    @Inject(ASSET_REGISTRY)
    private readonly assets: AssetRegistry,
  ) {}

  async execute(query: GetPokemonByDexIdQuery): Promise<PokemonResult> {
    const dexId = DexId.create(query.dexId);
    const pokemon = await this.pokemonRepository.findByDexId(dexId);
    if (!pokemon) {
      throw new PokemonNotFoundError(dexId.value);
    }

    const assets = await this.assets.findVisualsByDexId(dexId);
    return toPokemonResult(pokemon, assets ?? undefined);
  }
}
