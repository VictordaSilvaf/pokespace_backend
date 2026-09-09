import { ValueObject } from '../../../../shared/domain/value-object.js';
import { CharacterDomainError } from '../errors/character.errors.js';

export type FacingDirection = 'UP' | 'DOWN' | 'LEFT' | 'RIGHT';

export interface CharacterWorldStateProps {
  mapId: string;
  x: number;
  y: number;
  z: number;
  direction: FacingDirection;
}

export class CharacterWorldState extends ValueObject<CharacterWorldStateProps> {
  private constructor(props: CharacterWorldStateProps) {
    super(props);
  }

  static create(props: CharacterWorldStateProps): CharacterWorldState {
    const mapId = props.mapId.trim();
    if (!mapId) {
      throw new CharacterDomainError('INVALID_MAP_ID', 'mapId is required');
    }
    for (const key of ['x', 'y', 'z'] as const) {
      if (!Number.isInteger(props[key])) {
        throw new CharacterDomainError(
          'INVALID_POSITION',
          `${key} must be an integer`,
        );
      }
    }
    if (!['UP', 'DOWN', 'LEFT', 'RIGHT'].includes(props.direction)) {
      throw new CharacterDomainError(
        'INVALID_DIRECTION',
        `Invalid direction: ${props.direction}`,
      );
    }
    return new CharacterWorldState({
      mapId,
      x: props.x,
      y: props.y,
      z: props.z,
      direction: props.direction,
    });
  }

  get mapId(): string {
    return this.props.mapId;
  }

  get x(): number {
    return this.props.x;
  }

  get y(): number {
    return this.props.y;
  }

  get z(): number {
    return this.props.z;
  }

  get direction(): FacingDirection {
    return this.props.direction;
  }

  toJSON(): CharacterWorldStateProps {
    return { ...this.props };
  }
}
