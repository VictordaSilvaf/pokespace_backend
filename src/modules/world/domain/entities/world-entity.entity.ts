import { Entity } from '../../../../shared/domain/entity.js';
import { EntityId } from '../value-objects/ids.vo.js';
import type { Position } from '../value-objects/position.vo.js';
import { EntityType } from '../value-objects/movement.js';

export interface WorldEntityProps {
  id: EntityId;
  type: EntityType;
  position: Position;
  characterId?: string;
}

export class WorldEntity extends Entity<string> {
  private _position: Position;

  private constructor(
    private readonly _entityId: EntityId,
    private readonly _type: EntityType,
    position: Position,
    private readonly _characterId: string | undefined,
  ) {
    super(_entityId.value);
    this._position = position;
  }

  static createPlayer(characterId: string, position: Position): WorldEntity {
    return new WorldEntity(
      EntityId.fromCharacter(characterId),
      EntityType.PLAYER,
      position,
      characterId,
    );
  }

  static rehydrate(props: WorldEntityProps): WorldEntity {
    return new WorldEntity(
      props.id,
      props.type,
      props.position,
      props.characterId,
    );
  }

  get entityId(): EntityId {
    return this._entityId;
  }

  get type(): EntityType {
    return this._type;
  }

  get position(): Position {
    return this._position;
  }

  get characterId(): string | undefined {
    return this._characterId;
  }

  moveTo(position: Position): void {
    this._position = position;
  }

  toSnapshot(): {
    id: string;
    type: EntityType;
    position: { x: number; y: number; z: number };
    characterId?: string;
  } {
    return {
      id: this.id,
      type: this._type,
      position: this._position.toJSON(),
      ...(this._characterId ? { characterId: this._characterId } : {}),
    };
  }
}
