import { mkdirSync, readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { dirname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import pg from 'pg';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '../..');
export const REGISTRY_PATH = join(ROOT, 'assets', 'registry', 'pokemon-sprites.json');

const VISUAL_DIRS = {
  portrait: 'portrait',
  walk: 'walk',
  shiny_walk: 'shiny_walk',
  mega_walk: 'mega_walk',
};

export function resolvePackRoot() {
  return (
    process.env.POKESPACE_ASSET_PACK_ROOT ??
    join(ROOT, 'assets', 'packs', 'pokemon')
  );
}

function inferGeometry(visualType) {
  if (visualType === 'portrait') {
    return { frameWidth: 64, frameHeight: 64, frameCount: 1 };
  }
  return { frameWidth: 32, frameHeight: 32, frameCount: 4 };
}

export function scanPack(packRoot) {
  const entries = [];
  let dexDirs = [];
  try {
    dexDirs = readdirSync(packRoot).filter((name) => {
      try {
        return statSync(join(packRoot, name)).isDirectory() && /^\d+$/.test(name);
      } catch {
        return false;
      }
    });
  } catch {
    return entries;
  }

  for (const dexDir of dexDirs) {
    const dexId = Number(dexDir);
    const base = join(packRoot, dexDir);
    for (const [folder, visualType] of Object.entries(VISUAL_DIRS)) {
      const folderPath = join(base, folder);
      let files = [];
      try {
        files = readdirSync(folderPath).filter((f) =>
          /\.(png|webp|gif)$/i.test(f),
        );
      } catch {
        continue;
      }
      if (files.length === 0) continue;
      const filePath = join(folderPath, files[0]);
      const relativePath = relative(ROOT, filePath).replaceAll('\\', '/');
      const meta = inferGeometry(visualType);
      entries.push({
        dexId,
        visualType,
        assetKey: `pokemon/${dexId}/${visualType}`,
        path: relativePath,
        ...meta,
      });
    }
  }

  return entries.sort(
    (a, b) => a.dexId - b.dexId || a.visualType.localeCompare(b.visualType),
  );
}

export function writeRegistry(registry) {
  mkdirSync(dirname(REGISTRY_PATH), { recursive: true });
  writeFileSync(REGISTRY_PATH, `${JSON.stringify(registry, null, 2)}\n`, 'utf8');
}

export function readRegistry() {
  try {
    return JSON.parse(readFileSync(REGISTRY_PATH, 'utf8'));
  } catch {
    return null;
  }
}

export function validateRegistry(registry) {
  const errors = [];
  const seenKeys = new Set();
  const byDex = new Map();

  for (const entry of registry.entries) {
    if (seenKeys.has(entry.assetKey)) {
      errors.push(`duplicate assetKey: ${entry.assetKey}`);
    }
    seenKeys.add(entry.assetKey);

    if (entry.frameWidth < 1 || entry.frameHeight < 1 || entry.frameCount < 1) {
      errors.push(`invalid geometry for ${entry.assetKey}`);
    }

    const set = byDex.get(entry.dexId) ?? new Set();
    if (set.has(entry.visualType)) {
      errors.push(`duplicate visual ${entry.visualType} for dex ${entry.dexId}`);
    }
    set.add(entry.visualType);
    byDex.set(entry.dexId, set);
  }

  for (const [dexId, visuals] of byDex) {
    for (const required of ['portrait', 'walk']) {
      if (!visuals.has(required)) {
        errors.push(`dex ${dexId} missing required visual: ${required}`);
      }
    }
  }

  return { ok: errors.length === 0, errors };
}

export async function upsertRegistryToDb(registry) {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error('DATABASE_URL is required to upsert asset registry');
  }

  const pool = new pg.Pool({ connectionString: databaseUrl });
  try {
    let count = 0;
    for (const entry of registry.entries) {
      await pool.query(
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
          entry.assetKey,
          entry.path,
          entry.frameWidth,
          entry.frameHeight,
          entry.frameCount,
        ],
      );
      await pool.query(
        `INSERT INTO pokemon_visual_assets (dex_id, visual_type, asset_key)
         VALUES ($1, $2, $3)
         ON CONFLICT (dex_id, visual_type) DO UPDATE SET
           asset_key = EXCLUDED.asset_key`,
        [entry.dexId, entry.visualType, entry.assetKey],
      );
      count += 1;
    }
    return count;
  } finally {
    await pool.end();
  }
}

/** Minimal seed registry used when no pack is present (MVP unlock). */
export function createSeedRegistry() {
  const entries = [];
  for (const dexId of [1, 4, 7, 16, 19, 25]) {
    entries.push(
      {
        dexId,
        visualType: 'portrait',
        assetKey: `pokemon/${dexId}/portrait`,
        path: `sprites/pokemon/${dexId}/portrait.png`,
        frameWidth: 64,
        frameHeight: 64,
        frameCount: 1,
      },
      {
        dexId,
        visualType: 'walk',
        assetKey: `pokemon/${dexId}/walk`,
        path: `sprites/pokemon/${dexId}/walk.png`,
        frameWidth: 32,
        frameHeight: 32,
        frameCount: 4,
      },
    );
  }
  return {
    generatedAt: new Date().toISOString(),
    packRoot: '(seed)',
    entries,
  };
}
