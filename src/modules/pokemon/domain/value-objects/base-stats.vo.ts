import { ValueObject } from '../../../../shared/domain/value-object.js';
import { InvalidBaseStatsError } from '../errors/pokemon.errors.js';

export interface BaseStatsProps {
  hp: number;
  attack: number;
  defense: number;
  specialAttack: number;
  specialDefense: number;
  speed: number;
}

export class BaseStats extends ValueObject<BaseStatsProps> {
  private constructor(props: BaseStatsProps) {
    super(props);
  }

  static create(props: BaseStatsProps): BaseStats {
    for (const [key, value] of Object.entries(props)) {
      if (!Number.isInteger(value) || value < 1) {
        throw new InvalidBaseStatsError(`${key} must be an integer >= 1`);
      }
    }
    return new BaseStats(props);
  }

  get hp(): number {
    return this.props.hp;
  }

  get attack(): number {
    return this.props.attack;
  }

  get defense(): number {
    return this.props.defense;
  }

  get specialAttack(): number {
    return this.props.specialAttack;
  }

  get specialDefense(): number {
    return this.props.specialDefense;
  }

  get speed(): number {
    return this.props.speed;
  }

  toJSON(): BaseStatsProps {
    return { ...this.props };
  }
}
