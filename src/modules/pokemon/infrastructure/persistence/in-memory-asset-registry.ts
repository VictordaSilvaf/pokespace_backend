import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
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
  lookType?: number;
}

const VISUAL_RESULT_KEY: Record<VisualType, keyof PokemonAssetsResult> = {
  portrait: 'portrait',
  walk: 'walk',
  shiny_walk: 'shinyWalk',
  mega_walk: 'megaWalk',
};

const MODULE_DIR = dirname(fileURLToPath(import.meta.url));

function resolveSpritesRegistryPath(): string {
  const candidates = [
    join(process.cwd(), 'assets/registry/pokemon-sprites.json'),
    join(MODULE_DIR, '../../../../../assets/registry/pokemon-sprites.json'),
  ];
  for (const candidate of candidates) {
    try {
      readFileSync(candidate, 'utf8');
      return candidate;
    } catch {
      // next
    }
  }
  return candidates[0]!;
}

function resolveVisualsPath(): string {
  const candidates = [
    join(process.cwd(), 'assets/registry/pokemon-visuals.json'),
    join(MODULE_DIR, '../../../../../assets/registry/pokemon-visuals.json'),
  ];
  for (const candidate of candidates) {
    try {
      readFileSync(candidate, 'utf8');
      return candidate;
    } catch {
      // next
    }
  }
  return candidates[0]!;
}

@Injectable()
export class InMemoryAssetRegistry implements AssetRegistry {
  private readonly sprites = new Map<string, StoredSprite>();
  private readonly links = new Map<string, string>();

  constructor() {
    this.loadFromDisk();
  }

  private loadFromDisk(): void {
    try {
      const registry = JSON.parse(
        readFileSync(resolveSpritesRegistryPath(), 'utf8'),
      ) as {
        entries?: Array<{
          dexId: number;
          visualType: VisualType;
          assetKey: string;
          path: string;
          frameWidth: number;
          frameHeight: number;
          frameCount: number;
          lookType?: number;
        }>;
      };
      if (registry.entries?.length) {
        for (const entry of registry.entries) {
          this.sprites.set(entry.assetKey, {
            assetKey: entry.assetKey,
            path: entry.path,
            frameWidth: entry.frameWidth,
            frameHeight: entry.frameHeight,
            frameCount: entry.frameCount,
            lookType: entry.lookType,
          });
          this.links.set(`${entry.dexId}:${entry.visualType}`, entry.assetKey);
        }
        return;
      }
    } catch {
      // fall through to visuals
    }

    try {
      const doc = JSON.parse(readFileSync(resolveVisualsPath(), 'utf8')) as {
        visuals?: Array<{
          dexId: number;
          portrait?: { id: number };
          walk?: { id: number };
          shinyWalk?: { id: number } | null;
        }>;
      };
      for (const visual of doc.visuals ?? []) {
        this.linkFromLook(visual.dexId, 'portrait', visual.portrait?.id);
        this.linkFromLook(visual.dexId, 'walk', visual.walk?.id);
        if (visual.shinyWalk?.id) {
          this.linkFromLook(visual.dexId, 'shiny_walk', visual.shinyWalk.id);
        }
      }
    } catch {
      // empty registry
    }
  }

  private linkFromLook(
    dexId: number,
    visualType: VisualType,
    lookType: number | undefined,
  ): void {
    if (lookType == null) return;
    const assetKey = `pokemon/${dexId}/${visualType}`;
    this.sprites.set(assetKey, {
      assetKey,
      path: `sprites/creature/${lookType}.png`,
      frameWidth: visualType === 'portrait' ? 64 : 32,
      frameHeight: visualType === 'portrait' ? 64 : 32,
      frameCount: visualType === 'portrait' ? 1 : 4,
      lookType,
    });
    this.links.set(`${dexId}:${visualType}`, assetKey);
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
    ...(sprite.lookType != null ? { lookType: sprite.lookType } : {}),
  };
}
