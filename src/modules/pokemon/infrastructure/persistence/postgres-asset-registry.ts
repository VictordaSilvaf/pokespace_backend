import { Inject, Injectable } from '@nestjs/common';
import type { Pool } from 'pg';
import { DATABASE_POOL } from '../../../../shared/infrastructure/database/database.pool.port.js';
import type { AssetRegistry } from '../../domain/repositories/asset-registry.port.js';
import type { DexId } from '../../domain/value-objects/dex-id.vo.js';
import type {
  PokemonAssetsResult,
  SpriteAssetResult,
} from '../../application/dto/pokemon.dto.js';

type VisualType = 'portrait' | 'walk' | 'shiny_walk' | 'mega_walk';

interface SpriteRow {
  visual_type: VisualType;
  asset_key: string;
  path: string;
  frame_width: number;
  frame_height: number;
  frame_count: number;
}

const VISUAL_RESULT_KEY: Record<VisualType, keyof PokemonAssetsResult> = {
  portrait: 'portrait',
  walk: 'walk',
  shiny_walk: 'shinyWalk',
  mega_walk: 'megaWalk',
};

@Injectable()
export class PostgresAssetRegistry implements AssetRegistry {
  constructor(
    @Inject(DATABASE_POOL)
    private readonly pool: Pool,
  ) {}

  async findVisualsByDexId(dexId: DexId): Promise<PokemonAssetsResult | null> {
    const result = await this.pool.query<SpriteRow>(
      `SELECT pva.visual_type, sa.asset_key, sa.path,
              sa.frame_width, sa.frame_height, sa.frame_count
       FROM pokemon_visual_assets pva
       JOIN sprite_assets sa ON sa.asset_key = pva.asset_key
       WHERE pva.dex_id = $1`,
      [dexId.value],
    );
    if (result.rows.length === 0) {
      return null;
    }

    const assets: PokemonAssetsResult = {};
    for (const row of result.rows) {
      const lookType = parseLookTypeFromPath(row.path);
      const sprite: SpriteAssetResult = {
        assetKey: row.asset_key,
        path: row.path,
        frameWidth: row.frame_width,
        frameHeight: row.frame_height,
        frameCount: row.frame_count,
        ...(lookType != null ? { lookType } : {}),
      };
      assets[VISUAL_RESULT_KEY[row.visual_type]] = sprite;
    }
    return assets;
  }

  async upsertSpriteAsset(asset: {
    assetKey: string;
    path: string;
    frameWidth: number;
    frameHeight: number;
    frameCount: number;
  }): Promise<void> {
    await this.pool.query(
      `INSERT INTO sprite_assets
         (asset_key, path, frame_width, frame_height, frame_count, updated_at)
       VALUES ($1, $2, $3, $4, $5, NOW())
       ON CONFLICT (asset_key) DO UPDATE SET
         path = EXCLUDED.path,
         frame_width = EXCLUDED.frame_width,
         frame_height = EXCLUDED.frame_height,
         frame_count = EXCLUDED.frame_count,
         updated_at = NOW()`,
      [
        asset.assetKey,
        asset.path,
        asset.frameWidth,
        asset.frameHeight,
        asset.frameCount,
      ],
    );
  }

  async linkPokemonVisual(link: {
    dexId: number;
    visualType: VisualType;
    assetKey: string;
  }): Promise<void> {
    await this.pool.query(
      `INSERT INTO pokemon_visual_assets (dex_id, visual_type, asset_key)
       VALUES ($1, $2, $3)
       ON CONFLICT (dex_id, visual_type) DO UPDATE SET
         asset_key = EXCLUDED.asset_key`,
      [link.dexId, link.visualType, link.assetKey],
    );
  }

  async listMissingRequired(
    dexIds: number[],
  ): Promise<Array<{ dexId: number; missing: string[] }>> {
    if (dexIds.length === 0) return [];
    const result = await this.pool.query<{
      dex_id: number;
      visual_type: string;
    }>(
      `SELECT dex_id, visual_type FROM pokemon_visual_assets
       WHERE dex_id = ANY($1::int[])
         AND visual_type IN ('portrait', 'walk')`,
      [dexIds],
    );

    const present = new Map<number, Set<string>>();
    for (const row of result.rows) {
      const set = present.get(row.dex_id) ?? new Set<string>();
      set.add(row.visual_type);
      present.set(row.dex_id, set);
    }

    const out: Array<{ dexId: number; missing: string[] }> = [];
    for (const dexId of dexIds) {
      const have = present.get(dexId) ?? new Set();
      const missing = (['portrait', 'walk'] as const).filter(
        (t) => !have.has(t),
      );
      if (missing.length > 0) {
        out.push({ dexId, missing: [...missing] });
      }
    }
    return out;
  }
}

function parseLookTypeFromPath(path: string): number | null {
  const match = /creature\/(\d+)\./i.exec(path);
  if (!match) return null;
  const n = Number(match[1]);
  return Number.isInteger(n) ? n : null;
}
