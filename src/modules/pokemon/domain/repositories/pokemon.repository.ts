import type { Pokemon } from '../entities/pokemon.entity.js';
import type { DexId } from '../value-objects/dex-id.vo.js';

export const POKEMON_REPOSITORY = Symbol('POKEMON_REPOSITORY');

export interface PokemonRepository {
  findByDexId(dexId: DexId): Promise<Pokemon | null>;
  listActive(): Promise<Pokemon[]>;
}
