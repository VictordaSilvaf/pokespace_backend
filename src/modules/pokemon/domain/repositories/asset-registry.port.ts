import type { DexId } from '../value-objects/dex-id.vo.js';
import type { PokemonAssetsResult } from '../../application/dto/pokemon.dto.js';

export const ASSET_REGISTRY = Symbol('ASSET_REGISTRY');

export interface AssetRegistry {
  findVisualsByDexId(dexId: DexId): Promise<PokemonAssetsResult | null>;
  upsertSpriteAsset(asset: {
    assetKey: string;
    path: string;
    frameWidth: number;
    frameHeight: number;
    frameCount: number;
  }): Promise<void>;
  linkPokemonVisual(link: {
    dexId: number;
    visualType: 'portrait' | 'walk' | 'shiny_walk' | 'mega_walk';
    assetKey: string;
  }): Promise<void>;
  listMissingRequired(dexIds: number[]): Promise<
    Array<{ dexId: number; missing: string[] }>
  >;
}
