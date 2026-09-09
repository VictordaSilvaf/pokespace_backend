import { ValueObject } from '../../../../shared/domain/value-object.js';
import { InvalidPokemonTypeError } from '../errors/pokemon.errors.js';

export const POKEMON_TYPES = [
  'normal',
  'fire',
  'water',
  'electric',
  'grass',
  'ice',
  'fighting',
  'poison',
  'ground',
  'flying',
  'psychic',
  'bug',
  'rock',
  'ghost',
  'dragon',
  'dark',
  'steel',
  'fairy',
] as const;

export type PokemonTypeValue = (typeof POKEMON_TYPES)[number];

export class PokemonType extends ValueObject<{ value: PokemonTypeValue }> {
  private constructor(value: PokemonTypeValue) {
    super({ value });
  }

  static create(raw: string): PokemonType {
    const value = raw.trim().toLowerCase();
    if (!POKEMON_TYPES.includes(value as PokemonTypeValue)) {
      throw new InvalidPokemonTypeError(raw);
    }
    return new PokemonType(value as PokemonTypeValue);
  }

  get value(): PokemonTypeValue {
    return this.props.value;
  }
}
