import { AggregateRoot } from '../../../../shared/domain/aggregate-root.js';
import { PokemonDomainError } from '../errors/pokemon.errors.js';
import type { DexId } from '../value-objects/dex-id.vo.js';
import type { PokemonType } from '../value-objects/pokemon-type.vo.js';
import type { BaseStats } from '../value-objects/base-stats.vo.js';
import type { PokemonStatus } from '../value-objects/pokemon-status.vo.js';

export interface PokemonProps {
  id: string;
  dexId: DexId;
  name: string;
  types: PokemonType[];
  baseStats: BaseStats;
  status: PokemonStatus;
  createdAt: Date;
}

export class Pokemon extends AggregateRoot<string> {
  private constructor(
    id: string,
    private readonly _dexId: DexId,
    private readonly _name: string,
    private readonly _types: PokemonType[],
    private readonly _baseStats: BaseStats,
    private readonly _status: PokemonStatus,
    private readonly _createdAt: Date,
  ) {
    super(id);
  }

  static rehydrate(props: PokemonProps): Pokemon {
    const name = props.name.trim();
    if (name.length < 1 || name.length > 50) {
      throw new PokemonDomainError(
        'INVALID_POKEMON_NAME',
        'name must be 1–50 characters',
      );
    }
    if (props.types.length < 1 || props.types.length > 2) {
      throw new PokemonDomainError(
        'INVALID_POKEMON_TYPES',
        'types must contain 1 or 2 entries',
      );
    }

    return new Pokemon(
      props.id,
      props.dexId,
      name,
      [...props.types],
      props.baseStats,
      props.status,
      props.createdAt,
    );
  }

  get dexId(): DexId {
    return this._dexId;
  }

  get name(): string {
    return this._name;
  }

  get types(): readonly PokemonType[] {
    return this._types;
  }

  get baseStats(): BaseStats {
    return this._baseStats;
  }

  get status(): PokemonStatus {
    return this._status;
  }

  get createdAt(): Date {
    return this._createdAt;
  }
}
