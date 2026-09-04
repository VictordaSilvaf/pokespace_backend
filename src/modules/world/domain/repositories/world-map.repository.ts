import type { WorldMap } from '../entities/world-map.entity.js';
import type { MapId } from '../value-objects/ids.vo.js';

export const WORLD_MAP_REPOSITORY = Symbol('WorldMapRepository');

export interface WorldMapRepository {
  getById(id: MapId | string): Promise<WorldMap | null>;
  getLaboratory(): Promise<WorldMap>;
}
