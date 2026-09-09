#!/usr/bin/env node
/**
 * OTBM → PokeSpace map pipeline (scaffold).
 *
 * When OT Client map assets are available, point OTBM_PATH / OTBM_DIR at them.
 * This script currently:
 *  1. Validates metadata.json contract used by WorldMap loader
 *  2. Emits chunks/collision summary sidecar when Tiled JSON exists
 *  3. Documents the target PokeSpace map layout for a future OTBM binary parser
 *
 * Target layout per map:
 *   maps/<mapId>/
 *     metadata.json   # mapId, displayName, tilesets, spawnZones, chunkSize
 *     <mapId>.json    # Tiled (or converted) layers: Ground, Collision, Spawns
 *     chunks/         # optional chunk JSON for large maps (cx_cy.json)
 */
import { mkdirSync, readFileSync, writeFileSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '../..');
const mapId = process.argv[2] ?? 'laboratory';
const mapDir = join(ROOT, 'maps', mapId);
const metaPath = join(mapDir, 'metadata.json');
const tiledPath = join(mapDir, `${mapId}.json`);

if (!existsSync(metaPath)) {
  console.error(`[maps:convert] missing ${metaPath}`);
  process.exit(1);
}

const meta = JSON.parse(readFileSync(metaPath, 'utf8'));
const chunkSize = meta.chunkSize ?? 16;

if (process.env.OTBM_PATH) {
  console.warn(
    `[maps:convert] OTBM_PATH=${process.env.OTBM_PATH} set, but binary OTBM parser is not bundled yet.`,
  );
  console.warn(
    '[maps:convert] Keep exporting via Tiled until OT assets + parser land; metadata contract is ready.',
  );
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
        tiles.push({ x: gx, y: gy, ground: groundGid, blocked });
      }
    }
    const out = {
      mapId,
      cx,
      cy,
      chunkSize,
      tiles,
    };
    writeFileSync(
      join(chunksDir, `${cx}_${cy}.json`),
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
    pathPattern: `chunks/{cx}_{cy}.json`,
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
  `[maps:convert] ${mapId}: wrote ${chunkCount} chunks + updated metadata`,
);
