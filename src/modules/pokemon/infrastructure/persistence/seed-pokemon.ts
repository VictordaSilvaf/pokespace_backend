import { Pokemon } from '../../domain/entities/pokemon.entity.js';
import { DexId } from '../../domain/value-objects/dex-id.vo.js';
import { PokemonType } from '../../domain/value-objects/pokemon-type.vo.js';
import { BaseStats } from '../../domain/value-objects/base-stats.vo.js';
import { PokemonStatus } from '../../domain/value-objects/pokemon-status.vo.js';

const SEED_CREATED_AT = new Date('2026-01-01T00:00:00.000Z');

export function createSeedPokemon(): Pokemon[] {
  return [
    seed(1, 'Bulbasaur', ['grass', 'poison'], {
      hp: 45,
      attack: 49,
      defense: 49,
      specialAttack: 65,
      specialDefense: 65,
      speed: 45,
    }),
    seed(4, 'Charmander', ['fire'], {
      hp: 39,
      attack: 52,
      defense: 43,
      specialAttack: 60,
      specialDefense: 50,
      speed: 65,
    }),
    seed(7, 'Squirtle', ['water'], {
      hp: 44,
      attack: 48,
      defense: 65,
      specialAttack: 50,
      specialDefense: 64,
      speed: 43,
    }),
    seed(16, 'Pidgey', ['normal', 'flying'], {
      hp: 40,
      attack: 45,
      defense: 40,
      specialAttack: 35,
      specialDefense: 35,
      speed: 56,
    }),
    seed(19, 'Rattata', ['normal'], {
      hp: 30,
      attack: 56,
      defense: 35,
      specialAttack: 25,
      specialDefense: 35,
      speed: 72,
    }),
    seed(25, 'Pikachu', ['electric'], {
      hp: 35,
      attack: 55,
      defense: 40,
      specialAttack: 50,
      specialDefense: 50,
      speed: 90,
    }),
  ];
}

function seed(
  dexId: number,
  name: string,
  types: string[],
  baseStats: {
    hp: number;
    attack: number;
    defense: number;
    specialAttack: number;
    specialDefense: number;
    speed: number;
  },
): Pokemon {
  const padded = String(dexId).padStart(3, '0');
  return Pokemon.rehydrate({
    id: `a0000001-0001-4000-8000-000000000${padded}`,
    dexId: DexId.create(dexId),
    name,
    types: types.map((t) => PokemonType.create(t)),
    baseStats: BaseStats.create(baseStats),
    status: PokemonStatus.create('active'),
    createdAt: SEED_CREATED_AT,
  });
}
