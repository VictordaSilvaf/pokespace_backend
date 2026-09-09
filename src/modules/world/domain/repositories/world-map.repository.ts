import type { WorldMap } from '../entities/world-map.entity.js';
import type { MapId } from '../value-objects/ids.vo.js';

export const WORLD_MAP_REPOSITORY = Symbol('WorldMapRepository');

export type MapChunk = {
  mapId: string;
  chunkX: number;
  chunkY: number;
  floor: number;
  chunkSize: number;
  tiles: Array<{
    x: number;
    y: number;
    z: number;
    groundId: number | null;
    objects: number[];
    walkable: boolean;
    elevation: number;
    blocked?: number;
  }>;
};

export interface WorldMapRepository {
  getById(id: MapId | string): Promise<WorldMap | null>;
  getLaboratory(): Promise<WorldMap>;
  loadChunk(
    mapId: string,
    chunkX: number,
    chunkY: number,
    floor?: number,
  ): Promise<MapChunk | null>;
  unloadChunk(
    mapId: string,
    chunkX: number,
    chunkY: number,
    floor?: number,
  ): Promise<void>;
  getChunk(
    mapId: string,
    chunkX: number,
    chunkY: number,
    floor?: number,
  ): MapChunk | null;
}
