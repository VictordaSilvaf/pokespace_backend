#!/usr/bin/env node
/**
 * Upsert National/OT species catalog from assets/catalog/pokemon-species.json
 * into Postgres when DATABASE_URL is set.
 */
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import pg from 'pg';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '../..');
const SPECIES_PATH = join(ROOT, 'assets', 'catalog', 'pokemon-species.json');

const TYPE_ALIASES = {
  fire2: 'fire',
};

const DEFAULT_BASE = {
  attack: 50,
  defense: 50,
  specialAttack: 50,
  specialDefense: 50,
};

export function normalizeType(raw) {
  const t = String(raw ?? '')
    .trim()
    .toLowerCase();
  return TYPE_ALIASES[t] ?? t;
}

export function loadSpeciesCatalog(path = SPECIES_PATH) {
  const raw = JSON.parse(readFileSync(path, 'utf8'));
  if (!Array.isArray(raw)) {
    throw new Error('pokemon-species.json must be an array');
  }
  return raw;
}

export function mapSpeciesRow(entry) {
  const dexId = Number(entry.dexId);
  const name = String(entry.name ?? '').trim();
  const types = [...new Set((entry.types ?? []).map(normalizeType).filter(Boolean))];
  if (!Number.isInteger(dexId) || dexId < 1 || !name || types.length < 1) {
    return null;
  }

  const lookType =
    entry.lookType != null && Number.isFinite(Number(entry.lookType))
      ? Number(entry.lookType)
      : null;
  const portraitId =
    entry.portraitId != null && Number.isFinite(Number(entry.portraitId))
      ? Number(entry.portraitId)
      : null;

  return {
    id: stableUuid(dexId),
    dexId,
    name: name.slice(0, 64),
    types: types.slice(0, 2),
    // baseStats placeholders — not OT combat values
    hp: 50,
    attack: DEFAULT_BASE.attack,
    defense: DEFAULT_BASE.defense,
    specialAttack: DEFAULT_BASE.specialAttack,
    specialDefense: DEFAULT_BASE.specialDefense,
    speed: 50,
    status: 'active',
    lookType,
    portraitId,
    experience:
      entry.experience != null && Number.isFinite(Number(entry.experience))
        ? Number(entry.experience)
        : null,
    otHp:
      entry.hp != null && Number.isFinite(Number(entry.hp))
        ? Number(entry.hp)
        : null,
    otSpeed:
      entry.speed != null && Number.isFinite(Number(entry.speed))
        ? Number(entry.speed)
        : null,
    hasShiny: Boolean(entry.hasShiny),
    hasMega: Boolean(entry.hasMega),
    source: 'ot-catalog',
  };
}

function stableUuid(dexId) {
  const hex = createHash('sha1')
    .update(`pokespace-pokemon-${dexId}`)
    .digest('hex')
    .slice(0, 32);
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-4${hex.slice(13, 16)}-a${hex.slice(17, 20)}-${hex.slice(20, 32)}`;
}

export async function upsertSpeciesToDb(rows) {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error('DATABASE_URL is required for dex:sync DB upsert');
  }

  const pool = new pg.Pool({ connectionString: databaseUrl });
  let count = 0;
  try {
    for (const row of rows) {
      await pool.query(
        `INSERT INTO pokemon (
           id, dex_id, name, types,
           hp, attack, defense, special_attack, special_defense, speed,
           status, look_type, portrait_id, experience, ot_hp, ot_speed,
           has_shiny, has_mega, source, created_at
         ) VALUES (
           $1,$2,$3,$4,
           $5,$6,$7,$8,$9,$10,
           $11,$12,$13,$14,$15,$16,
           $17,$18,$19, NOW()
         )
         ON CONFLICT (dex_id) DO UPDATE SET
           name = EXCLUDED.name,
           types = EXCLUDED.types,
           hp = EXCLUDED.hp,
           attack = EXCLUDED.attack,
           defense = EXCLUDED.defense,
           special_attack = EXCLUDED.special_attack,
           special_defense = EXCLUDED.special_defense,
           speed = EXCLUDED.speed,
           status = EXCLUDED.status,
           look_type = EXCLUDED.look_type,
           portrait_id = EXCLUDED.portrait_id,
           experience = EXCLUDED.experience,
           ot_hp = EXCLUDED.ot_hp,
           ot_speed = EXCLUDED.ot_speed,
           has_shiny = EXCLUDED.has_shiny,
           has_mega = EXCLUDED.has_mega,
           source = EXCLUDED.source`,
        [
          row.id,
          row.dexId,
          row.name,
          row.types,
          row.hp,
          row.attack,
          row.defense,
          row.specialAttack,
          row.specialDefense,
          row.speed,
          row.status,
          row.lookType,
          row.portraitId,
          row.experience,
          row.otHp,
          row.otSpeed,
          row.hasShiny,
          row.hasMega,
          row.source,
        ],
      );
      count += 1;
    }
  } finally {
    await pool.end();
  }
  return count;
}

async function main() {
  const catalog = loadSpeciesCatalog();
  const rows = catalog.map(mapSpeciesRow).filter(Boolean);
  const skipped = catalog.length - rows.length;
  console.log(
    `[dex:sync] loaded ${catalog.length} raw, ${rows.length} valid` +
      (skipped ? ` (${skipped} skipped)` : ''),
  );

  if (process.env.DATABASE_URL) {
    const count = await upsertSpeciesToDb(rows);
    console.log(`[dex:sync] upserted ${count} rows into pokemon`);
  } else {
    console.log(
      '[dex:sync] DATABASE_URL not set; JSON catalog is the in-memory/runtime source',
    );
  }
}

const isMain = process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1];
if (isMain) {
  main().catch((error) => {
    console.error('[dex:sync] failed:', error.message);
    process.exit(1);
  });
}
