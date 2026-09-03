import { ValueObject } from '../../../../shared/domain/value-object.js';
import { InvalidWorldStatusError } from '../errors/world.errors.js';

export const WORLD_STATUSES = ['online', 'maintenance', 'offline'] as const;

export type WorldStatusValue = (typeof WORLD_STATUSES)[number];

interface WorldStatusProps {
  value: WorldStatusValue;
}

export class WorldStatus extends ValueObject<WorldStatusProps> {
  private constructor(props: WorldStatusProps) {
    super(props);
  }

  static create(raw: string): WorldStatus {
    if (!WORLD_STATUSES.includes(raw as WorldStatusValue)) {
      throw new InvalidWorldStatusError(raw);
    }

    return new WorldStatus({ value: raw as WorldStatusValue });
  }

  get value(): WorldStatusValue {
    return this.props.value;
  }

  isJoinable(): boolean {
    return this.props.value === 'online';
  }
}