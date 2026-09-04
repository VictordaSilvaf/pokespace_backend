import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Injectable } from '@nestjs/common';
import { WorldMap, type SpawnPoint } from '../../domain/entities/world-map.entity.js';
import { MapId } from '../../domain/value-objects/ids.vo.js';
import { Position } from '../../domain/value-objects/position.vo.js';
import { MapNotFoundError } from '../../domain/errors/world.errors.js';
import type { WorldMapRepository } from '../../domain/repositories/world-map.repository.js';

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
}

const MODULE_DIR = dirname(fileURLToPath(import.meta.url));

function resolveMapsRoot(): string {
  // Prefer repo-root /maps when running from src or dist
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

@Injectable()
export class FileWorldMapRepository implements WorldMapRepository {
  private readonly cache = new Map<string, WorldMap>();
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
