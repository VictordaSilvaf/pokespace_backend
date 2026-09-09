export interface PokemonResult {
  id: string;
  dexId: number;
  name: string;
  types: string[];
  baseStats: {
    hp: number;
    attack: number;
    defense: number;
    specialAttack: number;
    specialDefense: number;
    speed: number;
  };
  status: string;
  assets?: PokemonAssetsResult;
}

export interface PokemonAssetsResult {
  portrait?: SpriteAssetResult;
  walk?: SpriteAssetResult;
  shinyWalk?: SpriteAssetResult;
  megaWalk?: SpriteAssetResult;
}

export interface SpriteAssetResult {
  assetKey: string;
  path: string;
  frameWidth: number;
  frameHeight: number;
  frameCount: number;
}

export type ListPokemonResult = PokemonResult[];

export interface GetPokemonByDexIdQuery {
  dexId: number;
}

import type { Pokemon } from '../../domain/entities/pokemon.entity.js';

export function toPokemonResult(
  pokemon: Pokemon,
  assets?: PokemonAssetsResult,
): PokemonResult {
  return {
    id: pokemon.id,
    dexId: pokemon.dexId.value,
    name: pokemon.name,
    types: pokemon.types.map((t) => t.value),
    baseStats: pokemon.baseStats.toJSON(),
    status: pokemon.status.value,
    ...(assets ? { assets } : {}),
  };
}
