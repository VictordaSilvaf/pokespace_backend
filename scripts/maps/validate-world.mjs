#!/usr/bin/env node
/**
 * Validate PokeSpace world map folders under maps/
 *
 *   pnpm world:validate
 */
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '../..');
const mapsRoot = join(ROOT, 'maps');
const errors = [];

const mapIds = readdirSync(mapsRoot, { withFileTypes: true })
  .filter((d) => d.isDirectory())
  .map((d) => d.name);

for (const mapId of mapIds) {
  const dir = join(mapsRoot, mapId);
  const metaPath = join(dir, 'metadata.json');
  if (!existsSync(metaPath)) {
    errors.push(`${mapId}: missing metadata.json`);
    continue;
  }
  const meta = JSON.parse(readFileSync(metaPath, 'utf8'));
  if (!meta.mapId) errors.push(`${mapId}: metadata.mapId missing`);
  if (!meta.chunkSize) errors.push(`${mapId}: chunkSize missing`);

  const tiled = join(dir, `${mapId}.json`);
  if (!existsSync(tiled)) {
    errors.push(`${mapId}: missing ${mapId}.json`);
  } else {
    const map = JSON.parse(readFileSync(tiled, 'utf8'));
    const collision = map.layers?.find(
      (l) => l.type === 'tilelayer' && String(l.name).toLowerCase() === 'collision',
    );
    if (!collision?.data) errors.push(`${mapId}: missing Collision layer`);
    const spawns = map.layers?.find(
      (l) => l.type === 'objectgroup' && String(l.name).toLowerCase() === 'spawns',
    );
    if (!spawns?.objects?.length) errors.push(`${mapId}: no spawn objects`);
  }

  const chunksDir = join(dir, 'chunks');
  if (existsSync(chunksDir)) {
    const files = readdirSync(chunksDir).filter((f) => f.endsWith('.json'));
    if (files.length === 0) errors.push(`${mapId}: empty chunks/`);
    for (const f of files) {
      const chunk = JSON.parse(readFileSync(join(chunksDir, f), 'utf8'));
      if (!Array.isArray(chunk.tiles)) {
        errors.push(`${mapId}/chunks/${f}: missing tiles[]`);
      }
    }
  }
}

if (errors.length) {
  console.error(`[world:validate] FAILED (${errors.length})`);
  for (const e of errors) console.error(`  - ${e}`);
  process.exit(1);
}
console.log(`[world:validate] OK — ${mapIds.length} map(s)`);
