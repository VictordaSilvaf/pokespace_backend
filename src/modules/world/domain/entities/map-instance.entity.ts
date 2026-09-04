import type { MapId, InstanceId } from '../value-objects/ids.vo.js';
import type { WorldEntity } from './world-entity.entity.js';
import type { Position } from '../value-objects/position.vo.js';
import { InstanceFullError, WorldDomainError } from '../errors/world.errors.js';

export interface MapInstanceProps {
  id: InstanceId;
  mapId: MapId;
  capacity: number;
  index: number;
}

/**
 * Runtime execution of a map definition (players/NPCs/items in memory).
 */
export class MapInstance {
  private readonly entities = new Map<string, WorldEntity>();
  private readonly occupied = new Map<string, string>(); // position key → entityId

  private constructor(
    private readonly _id: InstanceId,
    private readonly _mapId: MapId,
    private readonly _capacity: number,
    private readonly _index: number,
  ) {}

  static create(props: MapInstanceProps): MapInstance {
    if (props.capacity < 1) {
      throw new WorldDomainError('capacity must be >= 1');
    }
    return new MapInstance(props.id, props.mapId, props.capacity, props.index);
  }

  get id(): InstanceId {
    return this._id;
  }

  get mapId(): MapId {
    return this._mapId;
  }

  get capacity(): number {
    return this._capacity;
  }

  get index(): number {
    return this._index;
  }

  get playerCount(): number {
    return this.entities.size;
  }

  isFull(): boolean {
    return this.entities.size >= this._capacity;
  }

  hasCapacity(): boolean {
    return !this.isFull();
  }

  getEntities(): WorldEntity[] {
    return [...this.entities.values()];
  }

  getEntity(entityId: string): WorldEntity | undefined {
    return this.entities.get(entityId);
  }

  occupiedKeys(): ReadonlySet<string> {
    return new Set(this.occupied.keys());
  }

  isOccupied(position: Position): boolean {
    return this.occupied.has(position.key());
  }

  addEntity(entity: WorldEntity): void {
    if (this.isFull()) {
      throw new InstanceFullError(this._id.value);
    }
    if (this.entities.has(entity.id)) {
      throw new WorldDomainError(`entity already in instance: ${entity.id}`);
    }
    if (this.isOccupied(entity.position)) {
      throw new WorldDomainError(`position occupied: ${entity.position.key()}`);
    }
    this.entities.set(entity.id, entity);
    this.occupied.set(entity.position.key(), entity.id);
  }

  removeEntity(entityId: string): WorldEntity | undefined {
    const entity = this.entities.get(entityId);
    if (!entity) {
      return undefined;
    }
    this.entities.delete(entityId);
    this.occupied.delete(entity.position.key());
    return entity;
  }

  moveEntity(entityId: string, next: Position): WorldEntity {
    const entity = this.entities.get(entityId);
    if (!entity) {
      throw new WorldDomainError(`entity not in instance: ${entityId}`);
    }
    const occupant = this.occupied.get(next.key());
    if (occupant && occupant !== entityId) {
      throw new WorldDomainError(`position occupied: ${next.key()}`);
    }
    this.occupied.delete(entity.position.key());
    entity.moveTo(next);
    this.occupied.set(next.key(), entityId);
    return entity;
  }
}
