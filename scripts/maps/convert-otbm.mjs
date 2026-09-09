#!/usr/bin/env node
/**
 * OTBM / Tiled → PokeSpace map chunks.
 *
 * Usage:
 *   pnpm maps:convert [mapId]
 *   OTBM_PATH=/path/to/file.otbm pnpm maps:convert laboratory
 *
 * When OTBM_PATH is set, attempts to shell out to the frontend OTBM crop
 * exporter if POKESPACE_FRONTEND tools are available; otherwise keeps Tiled path.
 *
 * Output:
 *   maps/<mapId>/chunks/{cx}_{cy}_z{z}.json
 *   maps/<mapId>/metadata.json (enriched)
 */
import {
  mkdirSync,
  readFileSync,
  writeFileSync,
  existsSync,
  readdirSync,
  unlinkSync,
} from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '../..');
const mapId = process.argv[2] ?? 'laboratory';
const mapDir = join(ROOT, 'maps', mapId);
const metaPath = join(mapDir, 'metadata.json');
const tiledPath = join(mapDir, `${mapId}.json`);
const floorZ = Number(process.env.MAP_Z ?? 0);

if (!existsSync(metaPath)) {
  console.error(`[maps:convert] missing ${metaPath}`);
  process.exit(1);
}

const meta = JSON.parse(readFileSync(metaPath, 'utf8'));
/** Roadmap default 32; laboratory may keep 16 until regenerated. */
const chunkSize = Number(meta.chunkSize ?? 32);

if (process.env.OTBM_PATH) {
  const feExporter = join(
    ROOT,
    '../pokespace_frontend/tools/ot-pipeline/export-pokespace-world.mjs',
  );
  if (existsSync(feExporter)) {
    console.log(`[maps:convert] OTBM_PATH set — delegating to FE exporter`);
    const result = spawnSync(
      process.execPath,
      [
        feExporter,
        '--otbm',
        process.env.OTBM_PATH,
        '--out',
        mapDir,
        '--map-id',
        mapId,
        '--chunk',
        String(chunkSize),
        '--z',
        String(process.env.MAP_Z ?? 7),
      ],
      { stdio: 'inherit' },
    );
    if (result.status !== 0) {
      console.warn(
        '[maps:convert] FE OTBM export failed; falling back to Tiled if present',
      );
    } else {
      console.log('[maps:convert] OTBM export done');
      process.exit(0);
    }
  } else {
    console.warn(
      `[maps:convert] OTBM_PATH=${process.env.OTBM_PATH} but FE exporter missing at ${feExporter}`,
    );
  }
}

if (!existsSync(tiledPath)) {
  console.error(`[maps:convert] missing tiled map ${tiledPath}`);
  process.exit(1);
}

const tiled = JSON.parse(readFileSync(tiledPath, 'utf8'));
const collision = tiled.layers?.find(
  (l) => l.type === 'tilelayer' && String(l.name).toLowerCase() === 'collision',
);
const ground = tiled.layers?.find(
  (l) => l.type === 'tilelayer' && String(l.name).toLowerCase() === 'ground',
);

const chunksDir = join(mapDir, 'chunks');
mkdirSync(chunksDir, { recursive: true });

// Remove legacy cx_cy.json without z if regenerating
for (const name of readdirSync(chunksDir)) {
  if (/^\d+_\d+\.json$/.test(name)) {
    unlinkSync(join(chunksDir, name));
  }
}

const width = tiled.width;
const height = tiled.height;
let chunkCount = 0;

for (let cy = 0; cy * chunkSize < height; cy++) {
  for (let cx = 0; cx * chunkSize < width; cx++) {
    const tiles = [];
    for (let y = 0; y < chunkSize; y++) {
      const gy = cy * chunkSize + y;
      if (gy >= height) break;
      for (let x = 0; x < chunkSize; x++) {
        const gx = cx * chunkSize + x;
        if (gx >= width) break;
        const idx = gy * width + gx;
        const blocked = collision?.data?.[idx] ? 1 : 0;
        const groundGid = ground?.data?.[idx] ?? 0;
        tiles.push({
          x: gx,
          y: gy,
          z: floorZ,
          groundId: groundGid || null,
          objects: [],
          walkable: !blocked,
          elevation: 0,
          blocked,
        });
      }
    }
    const out = {
      mapId,
      chunkX: cx,
      chunkY: cy,
      floor: floorZ,
      chunkSize,
      tiles,
    };
    writeFileSync(
      join(chunksDir, `${cx}_${cy}_z${floorZ}.json`),
      `${JSON.stringify(out)}\n`,
      'utf8',
    );
    chunkCount += 1;
  }
}

const enriched = {
  ...meta,
  width,
  height,
  tileSize: tiled.tilewidth ?? meta.tileSize ?? 32,
  chunkSize,
  chunks: {
    count: chunkCount,
    pathPattern: 'chunks/{cx}_{cy}_z{z}.json',
  },
  tilesets:
    meta.tilesets ??
    (tiled.tilesets ?? []).map((t) => ({
      name: t.name,
      firstGid: t.firstgid,
      image: t.image,
      tileWidth: t.tilewidth,
      tileHeight: t.tileheight,
    })),
};

writeFileSync(metaPath, `${JSON.stringify(enriched, null, 2)}\n`, 'utf8');
console.log(
  `[maps:convert] ${mapId}: wrote ${chunkCount} chunks (size=${chunkSize}, z=${floorZ}) + updated metadata`,
);
