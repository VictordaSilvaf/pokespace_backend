import { ValueObject } from '../../../../shared/domain/value-object.js';
import { WorldDomainError } from '../errors/world.errors.js';

export class MapId extends ValueObject<{ value: string }> {
  private constructor(value: string) {
    super({ value });
  }

  static create(value: string): MapId {
    const trimmed = value.trim();
    if (trimmed.length < 2 || trimmed.length > 64) {
      throw new WorldDomainError('mapId must be 2–64 characters');
    }
    return new MapId(trimmed);
  }

  get value(): string {
    return this.props.value;
  }

  toString(): string {
    return this.value;
  }
}

export class InstanceId extends ValueObject<{ value: string }> {
  private constructor(value: string) {
    super({ value });
  }

  static create(value: string): InstanceId {
    const trimmed = value.trim();
    if (trimmed.length < 2 || trimmed.length > 64) {
      throw new WorldDomainError('instanceId must be 2–64 characters');
    }
    return new InstanceId(trimmed);
  }

  get value(): string {
    return this.props.value;
  }

  toString(): string {
    return this.value;
  }
}

export class EntityId extends ValueObject<{ value: string }> {
  private constructor(value: string) {
    super({ value });
  }

  static create(value: string): EntityId {
    const trimmed = value.trim();
    if (trimmed.length < 1 || trimmed.length > 64) {
      throw new WorldDomainError('entityId must be 1–64 characters');
    }
    return new EntityId(trimmed);
  }

  static fromCharacter(characterId: string): EntityId {
    return EntityId.create(`player-${characterId}`);
  }

  get value(): string {
    return this.props.value;
  }

  toString(): string {
    return this.value;
  }
}
