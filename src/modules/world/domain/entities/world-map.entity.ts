import type { Position } from '../value-objects/position.vo.js';
import { Position as PositionVO } from '../value-objects/position.vo.js';
import type { MapId } from '../value-objects/ids.vo.js';

export interface SpawnPoint {
  id: string;
  position: Position;
}

export interface WorldMapProps {
  id: MapId;
  name: string;
  width: number;
  height: number;
  tileSize: number;
  /** true = blocked */
  collision: boolean[][];
  spawnPoints: SpawnPoint[];
  version: string;
}

/**
 * Static map definition loaded from Tiled (or equivalent).
 * Not a Postgres row-per-tile model — collision/spawns live in memory from assets.
 */
export class WorldMap {
  private constructor(private readonly props: WorldMapProps) {}

  static create(props: WorldMapProps): WorldMap {
    return new WorldMap(props);
  }

  get id(): MapId {
    return this.props.id;
  }

  get name(): string {
    return this.props.name;
  }

  get width(): number {
    return this.props.width;
  }

  get height(): number {
    return this.props.height;
  }

  get tileSize(): number {
    return this.props.tileSize;
  }

  get spawnPoints(): readonly SpawnPoint[] {
    return this.props.spawnPoints;
  }

  get version(): string {
    return this.props.version;
  }

  inBounds(position: Position): boolean {
    return (
      position.x >= 0 &&
      position.y >= 0 &&
      position.x < this.props.width &&
      position.y < this.props.height
    );
  }

  isBlocked(position: Position): boolean {
    if (!this.inBounds(position)) {
      return true;
    }
    return this.props.collision[position.y]?.[position.x] === true;
  }

  isWalkable(position: Position): boolean {
    return !this.isBlocked(position);
  }

  /** Chunk coordinates for future interest management. */
  chunkOf(position: Position, chunkSize = 16): { cx: number; cy: number } {
    return {
      cx: Math.floor(position.x / chunkSize),
      cy: Math.floor(position.y / chunkSize),
    };
  }
}

export { PositionVO };
