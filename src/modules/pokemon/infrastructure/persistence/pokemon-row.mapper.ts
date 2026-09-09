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
  created_at: Date;
}

export const POKEMON_SELECTED_COLUMNS = `
  id, dex_id, name, types,
  hp, attack, defense, special_attack, special_defense, speed,
  status, created_at
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
    createdAt: row.created_at,
  });
}
