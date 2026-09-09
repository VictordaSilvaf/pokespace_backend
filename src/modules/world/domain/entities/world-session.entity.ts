import type { MapId, InstanceId } from '../value-objects/ids.vo.js';
import type { Position } from '../value-objects/position.vo.js';
import type { FacingDirection } from '../../../character/domain/value-objects/character-world-state.vo.js';

export interface WorldSessionProps {
  connectionId: string;
  characterId: string;
  accountId: string;
  mapId: MapId;
  instanceId: InstanceId;
  entityId: string;
  position: Position;
  lastSequence: number;
  direction?: FacingDirection;
}

/**
 * Presence of a character connection inside the World Engine (not an auth session).
 */
export class WorldSession {
  lastSequence: number;
  position: Position;
  direction: FacingDirection;

  private constructor(
    readonly connectionId: string,
    readonly characterId: string,
    readonly accountId: string,
    readonly mapId: MapId,
    readonly instanceId: InstanceId,
    readonly entityId: string,
    position: Position,
    lastSequence: number,
    direction: FacingDirection,
  ) {
    this.position = position;
    this.lastSequence = lastSequence;
    this.direction = direction;
  }

  static create(props: WorldSessionProps): WorldSession {
    return new WorldSession(
      props.connectionId,
      props.characterId,
      props.accountId,
      props.mapId,
      props.instanceId,
      props.entityId,
      props.position,
      props.lastSequence,
      props.direction ?? 'DOWN',
    );
  }

  acceptSequence(sequence: number): boolean {
    if (!Number.isInteger(sequence) || sequence <= this.lastSequence) {
      return false;
    }
    this.lastSequence = sequence;
    return true;
  }
}
