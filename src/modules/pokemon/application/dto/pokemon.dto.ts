export interface SpriteAssetResult {
  assetKey: string;
  path: string;
  frameWidth: number;
  frameHeight: number;
  frameCount: number;
  lookType?: number;
}

export interface PokemonAssetsResult {
  portrait?: SpriteAssetResult;
  walk?: SpriteAssetResult;
  shinyWalk?: SpriteAssetResult;
  megaWalk?: SpriteAssetResult;
}

export interface PokemonListItem {
  dexId: number;
  name: string;
  types: string[];
  status: string;
  lookType: number | null;
  assets?: PokemonAssetsResult;
}

export interface PokemonListResult {
  items: PokemonListItem[];
  total: number;
  limit: number;
  offset: number;
}

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
  lookType: number | null;
  portraitId: number | null;
  flags: {
    hasShiny: boolean;
    hasMega: boolean;
  };
  ot: {
    hp: number | null;
    speed: number | null;
    experience: number | null;
  };
  source: string;
  assets?: PokemonAssetsResult;
}

export type ListPokemonResult = PokemonResult[];

export interface GetPokemonByDexIdQuery {
  dexId: number;
}

export interface ListPokemonQueryDto {
  q?: string;
  type?: string;
  limit?: number;
  offset?: number;
}

import type { Pokemon } from '../../domain/entities/pokemon.entity.js';
import { resolveS3PublicUrl } from '../../../../shared/infrastructure/aws/s3/s3.config.js';

/** Apply CDN/public base to sprite paths for HTTP responses (DB stays relative). */
export function publicizeSpriteAssets(
  assets?: PokemonAssetsResult,
): PokemonAssetsResult | undefined {
  if (!assets) return undefined;
  const map = (sprite?: SpriteAssetResult): SpriteAssetResult | undefined => {
    if (!sprite) return undefined;
    return {
      ...sprite,
      path: resolveS3PublicUrl(sprite.path),
    };
  };
  const next: PokemonAssetsResult = {};
  const portrait = map(assets.portrait);
  const walk = map(assets.walk);
  const shinyWalk = map(assets.shinyWalk);
  const megaWalk = map(assets.megaWalk);
  if (portrait) next.portrait = portrait;
  if (walk) next.walk = walk;
  if (shinyWalk) next.shinyWalk = shinyWalk;
  if (megaWalk) next.megaWalk = megaWalk;
  return Object.keys(next).length > 0 ? next : undefined;
}

export function toPokemonListItem(
  pokemon: Pokemon,
  assets?: PokemonAssetsResult,
): PokemonListItem {
  const publicAssets = publicizeSpriteAssets(assets);
  return {
    dexId: pokemon.dexId.value,
    name: pokemon.name,
    types: pokemon.types.map((t) => t.value),
    status: pokemon.status.value,
    lookType: pokemon.lookType,
    ...(publicAssets ? { assets: publicAssets } : {}),
  };
}

export function toPokemonResult(
  pokemon: Pokemon,
  assets?: PokemonAssetsResult,
): PokemonResult {
  const publicAssets = publicizeSpriteAssets(assets);
  return {
    id: pokemon.id,
    dexId: pokemon.dexId.value,
    name: pokemon.name,
    types: pokemon.types.map((t) => t.value),
    baseStats: pokemon.baseStats.toJSON(),
    status: pokemon.status.value,
    lookType: pokemon.lookType,
    portraitId: pokemon.portraitId,
    flags: {
      hasShiny: pokemon.hasShiny,
      hasMega: pokemon.hasMega,
    },
    ot: {
      hp: pokemon.otHp,
      speed: pokemon.otSpeed,
      experience: pokemon.experience,
    },
    source: pokemon.source,
    ...(publicAssets ? { assets: publicAssets } : {}),
  };
}
