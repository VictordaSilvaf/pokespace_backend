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
  lookType: number | null;
  portraitId: number | null;
  experience: number | null;
  otHp: number | null;
  otSpeed: number | null;
  hasShiny: boolean;
  hasMega: boolean;
  source: string;
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
    private readonly _lookType: number | null,
    private readonly _portraitId: number | null,
    private readonly _experience: number | null,
    private readonly _otHp: number | null,
    private readonly _otSpeed: number | null,
    private readonly _hasShiny: boolean,
    private readonly _hasMega: boolean,
    private readonly _source: string,
    private readonly _createdAt: Date,
  ) {
    super(id);
  }

  static rehydrate(props: PokemonProps): Pokemon {
    const name = props.name.trim();
    if (name.length < 1 || name.length > 64) {
      throw new PokemonDomainError(
        'INVALID_POKEMON_NAME',
        'name must be 1–64 characters',
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
      props.lookType,
      props.portraitId,
      props.experience,
      props.otHp,
      props.otSpeed,
      props.hasShiny,
      props.hasMega,
      props.source,
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

  get lookType(): number | null {
    return this._lookType;
  }

  get portraitId(): number | null {
    return this._portraitId;
  }

  get experience(): number | null {
    return this._experience;
  }

  get otHp(): number | null {
    return this._otHp;
  }

  get otSpeed(): number | null {
    return this._otSpeed;
  }

  get hasShiny(): boolean {
    return this._hasShiny;
  }

  get hasMega(): boolean {
    return this._hasMega;
  }

  get source(): string {
    return this._source;
  }

  get createdAt(): Date {
    return this._createdAt;
  }
}
