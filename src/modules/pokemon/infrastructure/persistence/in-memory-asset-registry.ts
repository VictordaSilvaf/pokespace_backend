import { Injectable } from '@nestjs/common';
import type { AssetRegistry } from '../../domain/repositories/asset-registry.port.js';
import type { DexId } from '../../domain/value-objects/dex-id.vo.js';
import type {
  PokemonAssetsResult,
  SpriteAssetResult,
} from '../../application/dto/pokemon.dto.js';

type VisualType = 'portrait' | 'walk' | 'shiny_walk' | 'mega_walk';

interface StoredSprite {
  assetKey: string;
  path: string;
  frameWidth: number;
  frameHeight: number;
  frameCount: number;
}

const VISUAL_RESULT_KEY: Record<VisualType, keyof PokemonAssetsResult> = {
  portrait: 'portrait',
  walk: 'walk',
  shiny_walk: 'shinyWalk',
  mega_walk: 'megaWalk',
};

@Injectable()
export class InMemoryAssetRegistry implements AssetRegistry {
  private readonly sprites = new Map<string, StoredSprite>();
  /** key: `${dexId}:${visualType}` → assetKey */
  private readonly links = new Map<string, string>();

  constructor() {
    for (const dexId of [1, 4, 7, 16, 19, 25]) {
      this.seedDex(dexId);
    }
  }

  private seedDex(dexId: number): void {
    const portraitKey = `pokemon/${dexId}/portrait`;
    const walkKey = `pokemon/${dexId}/walk`;
    this.sprites.set(portraitKey, {
      assetKey: portraitKey,
      path: `sprites/pokemon/${dexId}/portrait.png`,
      frameWidth: 64,
      frameHeight: 64,
      frameCount: 1,
    });
    this.sprites.set(walkKey, {
      assetKey: walkKey,
      path: `sprites/pokemon/${dexId}/walk.png`,
      frameWidth: 32,
      frameHeight: 32,
      frameCount: 4,
    });
    this.links.set(`${dexId}:portrait`, portraitKey);
    this.links.set(`${dexId}:walk`, walkKey);
  }

  async findVisualsByDexId(dexId: DexId): Promise<PokemonAssetsResult | null> {
    const result: PokemonAssetsResult = {};
    let found = false;
    for (const visualType of Object.keys(VISUAL_RESULT_KEY) as VisualType[]) {
      const assetKey = this.links.get(`${dexId.value}:${visualType}`);
      if (!assetKey) continue;
      const sprite = this.sprites.get(assetKey);
      if (!sprite) continue;
      found = true;
      result[VISUAL_RESULT_KEY[visualType]] = toResult(sprite);
    }
    return found ? result : null;
  }

  async upsertSpriteAsset(asset: StoredSprite): Promise<void> {
    this.sprites.set(asset.assetKey, { ...asset });
  }

  async linkPokemonVisual(link: {
    dexId: number;
    visualType: VisualType;
    assetKey: string;
  }): Promise<void> {
    this.links.set(`${link.dexId}:${link.visualType}`, link.assetKey);
  }

  async listMissingRequired(
    dexIds: number[],
  ): Promise<Array<{ dexId: number; missing: string[] }>> {
    const out: Array<{ dexId: number; missing: string[] }> = [];
    for (const dexId of dexIds) {
      const missing: string[] = [];
      for (const required of ['portrait', 'walk'] as const) {
        if (!this.links.has(`${dexId}:${required}`)) {
          missing.push(required);
        }
      }
      if (missing.length > 0) {
        out.push({ dexId, missing });
      }
    }
    return out;
  }
}

function toResult(sprite: StoredSprite): SpriteAssetResult {
  return {
    assetKey: sprite.assetKey,
    path: sprite.path,
    frameWidth: sprite.frameWidth,
    frameHeight: sprite.frameHeight,
    frameCount: sprite.frameCount,
  };
}
