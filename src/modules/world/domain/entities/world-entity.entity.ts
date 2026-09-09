import { randomUUID } from 'node:crypto';
import { Entity } from '../../../../shared/domain/entity.js';
import { EntityId } from '../value-objects/ids.vo.js';
import type { Position } from '../value-objects/position.vo.js';
import { EntityType } from '../value-objects/movement.js';
import type { FacingDirection } from '../../../character/domain/value-objects/character-world-state.vo.js';

export interface EntityVisual {
  dexId?: number;
  assetKey?: string;
  path?: string;
  /** Display name for NPCs */
  label?: string;
  npcId?: string;
}

export interface WorldEntityProps {
  id: EntityId;
  type: EntityType;
  position: Position;
  characterId?: string;
  dexId?: number;
  level?: number;
  direction?: FacingDirection;
  visual?: EntityVisual;
}

export class WorldEntity extends Entity<string> {
  private _position: Position;
  private _direction: FacingDirection;

  private constructor(
    private readonly _entityId: EntityId,
    private readonly _type: EntityType,
    position: Position,
    private readonly _characterId: string | undefined,
    private readonly _dexId: number | undefined,
    private readonly _level: number | undefined,
    direction: FacingDirection,
    private readonly _visual: EntityVisual | undefined,
  ) {
    super(_entityId.value);
    this._position = position;
    this._direction = direction;
  }

  static createPlayer(
    characterId: string,
    position: Position,
    direction: FacingDirection = 'DOWN',
    visual?: EntityVisual,
  ): WorldEntity {
    return new WorldEntity(
      EntityId.fromCharacter(characterId),
      EntityType.PLAYER,
      position,
      characterId,
      undefined,
      undefined,
      direction,
      visual,
    );
  }

  static createWildPokemon(
    dexId: number,
    position: Position,
    level: number,
    visual?: EntityVisual,
  ): WorldEntity {
    const id = EntityId.create(`pokemon-${dexId}-${randomUUID().slice(0, 8)}`);
    return new WorldEntity(
      id,
      EntityType.POKEMON,
      position,
      undefined,
      dexId,
      level,
      'DOWN',
      visual ?? { dexId },
    );
  }

  static createNpc(
    npcId: string,
    position: Position,
    direction: FacingDirection = 'DOWN',
    visual?: EntityVisual,
  ): WorldEntity {
    const id = EntityId.create(`npc-${npcId}`);
    return new WorldEntity(
      id,
      EntityType.NPC,
      position,
      undefined,
      undefined,
      undefined,
      direction,
      {
        npcId,
        label: visual?.label ?? npcId,
        assetKey: visual?.assetKey,
        path: visual?.path,
      },
    );
  }

  static rehydrate(props: WorldEntityProps): WorldEntity {
    return new WorldEntity(
      props.id,
      props.type,
      props.position,
      props.characterId,
      props.dexId,
      props.level,
      props.direction ?? 'DOWN',
      props.visual,
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

  get dexId(): number | undefined {
    return this._dexId;
  }

  get level(): number | undefined {
    return this._level;
  }

  get direction(): FacingDirection {
    return this._direction;
  }

  get visual(): EntityVisual | undefined {
    return this._visual;
  }

  moveTo(position: Position, direction?: FacingDirection): void {
    this._position = position;
    if (direction) {
      this._direction = direction;
    }
  }

  toSnapshot(): {
    id: string;
    type: EntityType;
    position: { x: number; y: number; z: number };
    direction: FacingDirection;
    characterId?: string;
    dexId?: number;
    level?: number;
    visual?: EntityVisual;
  } {
    return {
      id: this.id,
      type: this._type,
      position: this._position.toJSON(),
      direction: this._direction,
      ...(this._characterId ? { characterId: this._characterId } : {}),
      ...(this._dexId != null ? { dexId: this._dexId } : {}),
      ...(this._level != null ? { level: this._level } : {}),
      ...(this._visual ? { visual: this._visual } : {}),
    };
  }
}
