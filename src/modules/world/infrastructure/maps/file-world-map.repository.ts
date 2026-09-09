import { existsSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Injectable } from '@nestjs/common';
import { WorldMap, type SpawnPoint } from '../../domain/entities/world-map.entity.js';
import { MapId } from '../../domain/value-objects/ids.vo.js';
import { Position } from '../../domain/value-objects/position.vo.js';
import { MapNotFoundError } from '../../domain/errors/world.errors.js';
import type {
  MapChunk,
  WorldMapRepository,
} from '../../domain/repositories/world-map.repository.js';

interface TiledObject {
  id: number;
  name: string;
  type?: string;
  x: number;
  y: number;
  width?: number;
  height?: number;
}

interface TiledLayer {
  id: number;
  name: string;
  type: string;
  width?: number;
  height?: number;
  data?: number[];
  objects?: TiledObject[];
}

interface TiledMapJson {
  width: number;
  height: number;
  tilewidth: number;
  tileheight: number;
  layers: TiledLayer[];
}

interface MapMetadata {
  mapId: string;
  displayName: string;
  version?: string;
  chunkSize?: number;
}

const MODULE_DIR = dirname(fileURLToPath(import.meta.url));

function resolveMapsRoot(): string {
  const candidates = [
    join(process.cwd(), 'maps'),
    join(MODULE_DIR, '../../../../../maps'),
    join(MODULE_DIR, '../../../../../../maps'),
  ];
  for (const candidate of candidates) {
    try {
      readFileSync(join(candidate, 'laboratory', 'metadata.json'), 'utf8');
      return candidate;
    } catch {
      // try next
    }
  }
  return join(process.cwd(), 'maps');
}

function chunkKey(
  mapId: string,
  cx: number,
  cy: number,
  floor: number,
): string {
  return `${mapId}:${cx}:${cy}:${floor}`;
}

@Injectable()
export class FileWorldMapRepository implements WorldMapRepository {
  private readonly cache = new Map<string, WorldMap>();
  private readonly chunkCache = new Map<string, MapChunk>();
  private readonly mapsRoot = resolveMapsRoot();

  async getById(id: MapId | string): Promise<WorldMap | null> {
    const mapId = typeof id === 'string' ? id : id.value;
    if (this.cache.has(mapId)) {
      return this.cache.get(mapId)!;
    }
    try {
      const map = this.loadMap(mapId);
      this.cache.set(mapId, map);
      return map;
    } catch {
      return null;
    }
  }

  async getLaboratory(): Promise<WorldMap> {
    const map = await this.getById('laboratory');
    if (!map) {
      throw new MapNotFoundError('laboratory');
    }
    return map;
  }

  async loadChunk(
    mapId: string,
    chunkX: number,
    chunkY: number,
    floor = 0,
  ): Promise<MapChunk | null> {
    const key = chunkKey(mapId, chunkX, chunkY, floor);
    if (this.chunkCache.has(key)) {
      return this.chunkCache.get(key)!;
    }
    const withZ = join(
      this.mapsRoot,
      mapId,
      'chunks',
      `${chunkX}_${chunkY}_z${floor}.json`,
    );
    const legacy = join(
      this.mapsRoot,
      mapId,
      'chunks',
      `${chunkX}_${chunkY}.json`,
    );
    const path = existsSync(withZ) ? withZ : existsSync(legacy) ? legacy : null;
    if (!path) {
      return null;
    }
    const raw = JSON.parse(readFileSync(path, 'utf8')) as MapChunk & {
      cx?: number;
      cy?: number;
      tiles?: Array<Record<string, unknown>>;
    };
    const chunk: MapChunk = {
      mapId: raw.mapId ?? mapId,
      chunkX: raw.chunkX ?? raw.cx ?? chunkX,
      chunkY: raw.chunkY ?? raw.cy ?? chunkY,
      floor: raw.floor ?? floor,
      chunkSize: raw.chunkSize,
      tiles: (raw.tiles ?? []).map((t) => {
        const row = t as {
          x?: number;
          y?: number;
          z?: number;
          groundId?: number | null;
          ground?: number | null;
          objects?: number[];
          walkable?: boolean;
          elevation?: number;
          blocked?: number | boolean;
        };
        return {
          x: Number(row.x),
          y: Number(row.y),
          z: Number(row.z ?? floor),
          groundId: row.groundId ?? row.ground ?? null,
          objects: row.objects ?? [],
          walkable:
            typeof row.walkable === 'boolean'
              ? row.walkable
              : !(row.blocked === 1 || row.blocked === true),
          elevation: Number(row.elevation ?? 0),
          blocked: Number(row.blocked ?? 0),
        };
      }),
    };
    this.chunkCache.set(key, chunk);
    return chunk;
  }

  async unloadChunk(
    mapId: string,
    chunkX: number,
    chunkY: number,
    floor = 0,
  ): Promise<void> {
    this.chunkCache.delete(chunkKey(mapId, chunkX, chunkY, floor));
  }

  getChunk(
    mapId: string,
    chunkX: number,
    chunkY: number,
    floor = 0,
  ): MapChunk | null {
    return this.chunkCache.get(chunkKey(mapId, chunkX, chunkY, floor)) ?? null;
  }

  private loadMap(mapId: string): WorldMap {
    const metaPath = join(this.mapsRoot, mapId, 'metadata.json');
    const meta = JSON.parse(readFileSync(metaPath, 'utf8')) as MapMetadata;
    const tiledPath = join(this.mapsRoot, mapId, `${mapId}.json`);
    const tiled = JSON.parse(readFileSync(tiledPath, 'utf8')) as TiledMapJson;

    const collisionLayer = tiled.layers.find(
      (l) => l.type === 'tilelayer' && l.name.toLowerCase() === 'collision',
    );
    if (!collisionLayer?.data) {
      throw new Error(`map ${mapId} missing Collision layer`);
    }

    const collision: boolean[][] = [];
    for (let y = 0; y < tiled.height; y++) {
      const row: boolean[] = [];
      for (let x = 0; x < tiled.width; x++) {
        const gid = collisionLayer.data[y * tiled.width + x] ?? 0;
        row.push(gid !== 0);
      }
      collision.push(row);
    }

    const spawnLayer = tiled.layers.find(
      (l) => l.type === 'objectgroup' && l.name.toLowerCase() === 'spawns',
    );
    const tileW = tiled.tilewidth;
    const tileH = tiled.tileheight;
    const spawnPoints: SpawnPoint[] = (spawnLayer?.objects ?? [])
      .filter((o) => (o.type ?? 'spawn').toLowerCase() === 'spawn')
      .map((o) => ({
        id: o.name || `spawn-${o.id}`,
        position: Position.create(
          Math.floor(o.x / tileW),
          Math.floor(o.y / tileH),
          0,
        ),
      }));

    if (spawnPoints.length === 0) {
      throw new Error(`map ${mapId} has no spawn points`);
    }

    return WorldMap.create({
      id: MapId.create(meta.mapId ?? mapId),
      name: meta.displayName ?? mapId,
      width: tiled.width,
      height: tiled.height,
      tileSize: tileW,
      collision,
      spawnPoints,
      version: meta.version ?? '1',
    });
  }
}
