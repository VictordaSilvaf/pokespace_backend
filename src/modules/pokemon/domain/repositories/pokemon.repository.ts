import type { Pokemon } from '../entities/pokemon.entity.js';
import type { DexId } from '../value-objects/dex-id.vo.js';

export const POKEMON_REPOSITORY = Symbol('POKEMON_REPOSITORY');

export interface ListPokemonQuery {
  q?: string;
  type?: string;
  limit: number;
  offset: number;
}

export interface ListPokemonPage {
  items: Pokemon[];
  total: number;
}

export interface PokemonRepository {
  findByDexId(dexId: DexId): Promise<Pokemon | null>;
  listActive(): Promise<Pokemon[]>;
  listActivePage(query: ListPokemonQuery): Promise<ListPokemonPage>;
  countActive(): Promise<number>;
}
