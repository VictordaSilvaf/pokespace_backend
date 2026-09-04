import { ValueObject } from '../../../../shared/domain/value-object.js';
import { WorldDomainError } from '../errors/world.errors.js';

export interface PositionProps {
  x: number;
  y: number;
  z: number;
}

export class Position extends ValueObject<PositionProps> {
  private constructor(props: PositionProps) {
    super(props);
  }

  static create(x: number, y: number, z = 0): Position {
    if (!Number.isInteger(x) || !Number.isInteger(y) || !Number.isInteger(z)) {
      throw new WorldDomainError('position coordinates must be integers');
    }
    return new Position({ x, y, z });
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

  offset(dx: number, dy: number, dz = 0): Position {
    return Position.create(this.x + dx, this.y + dy, this.z + dz);
  }

  toJSON(): PositionProps {
    return { x: this.x, y: this.y, z: this.z };
  }

  key(): string {
    return `${this.x}:${this.y}:${this.z}`;
  }
}
