import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Pokemon } from '../../domain/entities/pokemon.entity.js';
import { DexId } from '../../domain/value-objects/dex-id.vo.js';
import { PokemonType } from '../../domain/value-objects/pokemon-type.vo.js';
import { BaseStats } from '../../domain/value-objects/base-stats.vo.js';
import { PokemonStatus } from '../../domain/value-objects/pokemon-status.vo.js';

const MODULE_DIR = dirname(fileURLToPath(import.meta.url));

const TYPE_ALIASES: Record<string, string> = {
  fire2: 'fire',
};

export interface CatalogSpeciesJson {
  dexId: number;
  name: string;
  types?: string[];
  lookType?: number | null;
  portraitId?: number | null;
  hp?: number | null;
  speed?: number | null;
  experience?: number | null;
  hasShiny?: boolean;
  hasMega?: boolean;
}

function resolveCatalogPath(): string {
  const candidates = [
    join(process.cwd(), 'assets/catalog/pokemon-species.json'),
    join(MODULE_DIR, '../../../../../assets/catalog/pokemon-species.json'),
    join(MODULE_DIR, '../../../../../../assets/catalog/pokemon-species.json'),
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

export function loadSpeciesCatalogJson(): CatalogSpeciesJson[] {
  const raw = JSON.parse(readFileSync(resolveCatalogPath(), 'utf8')) as unknown;
  if (!Array.isArray(raw)) {
    return [];
  }
  return raw as CatalogSpeciesJson[];
}

function normalizeType(raw: string): string {
  const t = raw.trim().toLowerCase();
  return TYPE_ALIASES[t] ?? t;
}

function stableUuid(dexId: number): string {
  const hex = createHash('sha1')
    .update(`pokespace-pokemon-${dexId}`)
    .digest('hex')
    .slice(0, 32);
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-4${hex.slice(13, 16)}-a${hex.slice(17, 20)}-${hex.slice(20, 32)}`;
}

export function createSeedPokemon(): Pokemon[] {
  const catalog = loadSpeciesCatalogJson();
  const out: Pokemon[] = [];
  for (const entry of catalog) {
    try {
      const types = [
        ...new Set((entry.types ?? []).map(normalizeType).filter(Boolean)),
      ].slice(0, 2);
      if (!entry.dexId || !entry.name?.trim() || types.length < 1) {
        continue;
      }
      out.push(
        Pokemon.rehydrate({
          id: stableUuid(entry.dexId),
          dexId: DexId.create(entry.dexId),
          name: entry.name.trim().slice(0, 64),
          types: types.map((t) => PokemonType.create(t)),
          baseStats: BaseStats.create({
            hp: 50,
            attack: 50,
            defense: 50,
            specialAttack: 50,
            specialDefense: 50,
            speed: 50,
          }),
          status: PokemonStatus.create('active'),
          lookType: entry.lookType ?? null,
          portraitId: entry.portraitId ?? null,
          experience: entry.experience ?? null,
          otHp: entry.hp ?? null,
          otSpeed: entry.speed ?? null,
          hasShiny: Boolean(entry.hasShiny),
          hasMega: Boolean(entry.hasMega),
          source: 'ot-catalog',
          createdAt: new Date('2026-01-01T00:00:00.000Z'),
        }),
      );
    } catch {
      // skip invalid catalog rows
    }
  }
  return out;
}
