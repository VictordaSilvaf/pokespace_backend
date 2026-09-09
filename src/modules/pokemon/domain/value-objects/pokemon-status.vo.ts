import { ValueObject } from '../../../../shared/domain/value-object.js';
import { PokemonDomainError } from '../errors/pokemon.errors.js';

export const POKEMON_STATUSES = ['active', 'disabled'] as const;
export type PokemonStatusValue = (typeof POKEMON_STATUSES)[number];

export class PokemonStatus extends ValueObject<{ value: PokemonStatusValue }> {
  private constructor(value: PokemonStatusValue) {
    super({ value });
  }

  static create(raw: string): PokemonStatus {
    if (!POKEMON_STATUSES.includes(raw as PokemonStatusValue)) {
      throw new PokemonDomainError(
        'INVALID_POKEMON_STATUS',
        `Invalid pokemon status: ${raw}`,
      );
    }
    return new PokemonStatus(raw as PokemonStatusValue);
  }

  get value(): PokemonStatusValue {
    return this.props.value;
  }

  isActive(): boolean {
    return this.props.value === 'active';
  }
}
