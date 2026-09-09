import { ValueObject } from '../../../../shared/domain/value-object.js';
import { BattleDomainError } from '../errors/battle.errors.js';

export type MoveCategory = 'physical' | 'special' | 'status';

export interface MoveProps {
  id: string;
  name: string;
  type: string;
  category: MoveCategory;
  power: number;
  accuracy: number;
  effect?: string;
  missileAssetKey?: string;
}

export class Move extends ValueObject<MoveProps> {
  private constructor(props: MoveProps) {
    super(props);
  }

  static create(props: MoveProps): Move {
    if (!props.id.trim() || !props.name.trim()) {
      throw new BattleDomainError('INVALID_MOVE', 'move id/name required');
    }
    if (props.power < 0 || props.accuracy < 0 || props.accuracy > 100) {
      throw new BattleDomainError('INVALID_MOVE', 'invalid power/accuracy');
    }
    return new Move(props);
  }

  get id(): string {
    return this.props.id;
  }

  get name(): string {
    return this.props.name;
  }

  get type(): string {
    return this.props.type;
  }

  get category(): MoveCategory {
    return this.props.category;
  }

  get power(): number {
    return this.props.power;
  }

  get accuracy(): number {
    return this.props.accuracy;
  }

  get effect(): string | undefined {
    return this.props.effect;
  }

  get missileAssetKey(): string | undefined {
    return this.props.missileAssetKey;
  }

  toJSON(): MoveProps {
    return { ...this.props };
  }
}
