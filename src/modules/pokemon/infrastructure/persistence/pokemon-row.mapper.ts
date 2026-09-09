import { Pokemon } from '../../domain/entities/pokemon.entity.js';
import { DexId } from '../../domain/value-objects/dex-id.vo.js';
import { PokemonType } from '../../domain/value-objects/pokemon-type.vo.js';
import { BaseStats } from '../../domain/value-objects/base-stats.vo.js';
import { PokemonStatus } from '../../domain/value-objects/pokemon-status.vo.js';

export interface PokemonRow {
  id: string;
  dex_id: number;
  name: string;
  types: string[];
  hp: number;
  attack: number;
  defense: number;
  special_attack: number;
  special_defense: number;
  speed: number;
  status: string;
  look_type: number | null;
  portrait_id: number | null;
  experience: number | null;
  ot_hp: number | null;
  ot_speed: number | null;
  has_shiny: boolean;
  has_mega: boolean;
  source: string;
  created_at: Date;
}

export const POKEMON_SELECTED_COLUMNS = `
  id, dex_id, name, types,
  hp, attack, defense, special_attack, special_defense, speed,
  status, look_type, portrait_id, experience, ot_hp, ot_speed,
  has_shiny, has_mega, source, created_at
`.trim();

export function mapRowToPokemon(row: PokemonRow): Pokemon {
  return Pokemon.rehydrate({
    id: row.id,
    dexId: DexId.create(row.dex_id),
    name: row.name,
    types: row.types.map((t) => PokemonType.create(t)),
    baseStats: BaseStats.create({
      hp: row.hp,
      attack: row.attack,
      defense: row.defense,
      specialAttack: row.special_attack,
      specialDefense: row.special_defense,
      speed: row.speed,
    }),
    status: PokemonStatus.create(row.status),
    lookType: row.look_type,
    portraitId: row.portrait_id,
    experience: row.experience,
    otHp: row.ot_hp,
    otSpeed: row.ot_speed,
    hasShiny: row.has_shiny,
    hasMega: row.has_mega,
    source: row.source ?? 'ot-catalog',
    createdAt: row.created_at,
  });
}
