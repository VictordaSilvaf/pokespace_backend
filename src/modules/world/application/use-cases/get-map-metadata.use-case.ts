import { Inject, Injectable } from '@nestjs/common';
import type { UseCase } from '../../../../shared/application/use-case.js';
import {
  WORLD_MAP_REPOSITORY,
  type WorldMapRepository,
} from '../../domain/repositories/world-map.repository.js';
import { MapId } from '../../domain/value-objects/ids.vo.js';
import { MapNotFoundError } from '../../domain/errors/world.errors.js';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

export interface GetMapMetadataQuery {
  mapId: string;
}

export interface MapMetadataResult {
  mapId: string;
  displayName: string;
  defaultInstanceCapacity?: number;
  asset: string;
  version: string;
  width: number;
  height: number;
  tileSize: number;
  chunkSize: number;
  tilesets: unknown[];
  chunks: { count: number; pathPattern: string } | null;
  spawnZones: unknown[];
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
      // next
    }
  }
  return join(process.cwd(), 'maps');
}

@Injectable()
export class GetMapMetadataUseCase
  implements UseCase<GetMapMetadataQuery, MapMetadataResult>
{
  private readonly mapsRoot = resolveMapsRoot();

  constructor(
    @Inject(WORLD_MAP_REPOSITORY)
    private readonly maps: WorldMapRepository,
  ) {}

  async execute(query: GetMapMetadataQuery): Promise<MapMetadataResult> {
    const map = await this.maps.getById(MapId.create(query.mapId));
    if (!map) {
      throw new MapNotFoundError(query.mapId);
    }

    let raw: Record<string, unknown> = {};
    try {
      raw = JSON.parse(
        readFileSync(
          join(this.mapsRoot, query.mapId, 'metadata.json'),
          'utf8',
        ),
      ) as Record<string, unknown>;
    } catch {
      raw = {};
    }

    return {
      mapId: map.id.value,
      displayName: map.name,
      defaultInstanceCapacity:
        typeof raw.defaultInstanceCapacity === 'number'
          ? raw.defaultInstanceCapacity
          : undefined,
      asset: typeof raw.asset === 'string' ? raw.asset : `${query.mapId}.json`,
      version: map.version,
      width: map.width,
      height: map.height,
      tileSize: map.tileSize,
      chunkSize: typeof raw.chunkSize === 'number' ? raw.chunkSize : 16,
      tilesets: Array.isArray(raw.tilesets) ? raw.tilesets : [],
      chunks:
        raw.chunks && typeof raw.chunks === 'object'
          ? (raw.chunks as { count: number; pathPattern: string })
          : null,
      spawnZones: Array.isArray(raw.spawnZones) ? raw.spawnZones : [],
    };
  }
}
