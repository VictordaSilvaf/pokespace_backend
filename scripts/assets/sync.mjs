#!/usr/bin/env node
import {
  createSeedRegistry,
  entriesFromVisualsFile,
  REGISTRY_PATH,
  resolvePackRoot,
  scanPack,
  upsertRegistryToDb,
  writeRegistry,
} from './registry-lib.mjs';

async function main() {
  const packRoot = resolvePackRoot();
  let entries = scanPack(packRoot);
  let packLabel = packRoot;

  if (entries.length === 0) {
    entries = entriesFromVisualsFile();
    packLabel = '(pokemon-visuals.json)';
  }

  if (entries.length === 0) {
    console.warn('[assets:sync] No pack/visuals; writing fallback seed registry.');
    const seed = createSeedRegistry();
    entries = seed.entries;
    packLabel = seed.packRoot;
  }

  const registry = {
    generatedAt: new Date().toISOString(),
    packRoot: packLabel,
    entries,
  };

  writeRegistry(registry);
  console.log(
    `[assets:sync] Wrote ${entries.length} entries → ${REGISTRY_PATH}`,
  );

  if (process.env.DATABASE_URL) {
    const count = await upsertRegistryToDb(registry);
    console.log(`[assets:sync] Upserted ${count} rows into database`);
  } else {
    console.log(
      '[assets:sync] DATABASE_URL not set; skipped DB upsert (JSON only)',
    );
  }
}

main().catch((error) => {
  console.error('[assets:sync] failed:', error.message);
  process.exit(1);
});
