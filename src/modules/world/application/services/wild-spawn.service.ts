import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Injectable } from '@nestjs/common';
import type { WorldMap } from '../../domain/entities/world-map.entity.js';
import { WorldEntity } from '../../domain/entities/world-entity.entity.js';
import { Position } from '../../domain/value-objects/position.vo.js';
import type { MapInstance } from '../../domain/entities/map-instance.entity.js';

export interface SpawnZoneEntry {
  dexId: number;
  weight: number;
  minLevel: number;
  maxLevel: number;
}

export interface SpawnZone {
  id: string;
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
  z: number;
  maxActive: number;
  entries: SpawnZoneEntry[];
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
export class WildSpawnService {
  private readonly mapsRoot = resolveMapsRoot();
  private readonly zonesByMap = new Map<string, SpawnZone[]>();

  loadZones(mapId: string): SpawnZone[] {
    if (this.zonesByMap.has(mapId)) {
      return this.zonesByMap.get(mapId)!;
    }
    try {
      const meta = JSON.parse(
        readFileSync(join(this.mapsRoot, mapId, 'metadata.json'), 'utf8'),
      ) as { spawnZones?: SpawnZone[] };
      const zones = Array.isArray(meta.spawnZones) ? meta.spawnZones : [];
      this.zonesByMap.set(mapId, zones);
      return zones;
    } catch {
      this.zonesByMap.set(mapId, []);
      return [];
    }
  }

  /**
   * Ensure each spawn zone has up to maxActive wild Pokémon on the instance.
   * Returns newly created entities (for WS broadcast).
   */
  ensureSpawns(map: WorldMap, instance: MapInstance): WorldEntity[] {
    const zones = this.loadZones(map.id.value);
    const spawned: WorldEntity[] = [];
    const existingPokemon = instance
      .getEntities()
      .filter((e) => e.type === 'POKEMON');

    for (const zone of zones) {
      const inZone = existingPokemon.filter((e) =>
        this.inZone(e.position, zone),
      );
      const missing = Math.max(0, zone.maxActive - inZone.length);
      for (let i = 0; i < missing; i++) {
        const pick = this.pickEntry(zone.entries);
        if (!pick) continue;
        const position = this.findFreeTile(map, instance, zone);
        if (!position) break;
        const level = this.randomInt(pick.minLevel, pick.maxLevel);
        const entity = WorldEntity.createWildPokemon(pick.dexId, position, level, {
          dexId: pick.dexId,
          assetKey: `pokemon/${pick.dexId}/walk`,
          path: `sprites/pokemon/${pick.dexId}/walk.png`,
        });
        try {
          instance.addEntity(entity);
          spawned.push(entity);
        } catch {
          // capacity / race — skip
        }
      }
    }

    return spawned;
  }

  private inZone(
    position: { x: number; y: number; z: number },
    zone: SpawnZone,
  ): boolean {
    return (
      position.z === zone.z &&
      position.x >= zone.minX &&
      position.x <= zone.maxX &&
      position.y >= zone.minY &&
      position.y <= zone.maxY
    );
  }

  private findFreeTile(
    map: WorldMap,
    instance: MapInstance,
    zone: SpawnZone,
  ): Position | null {
    for (let attempt = 0; attempt < 24; attempt++) {
      const x = this.randomInt(zone.minX, zone.maxX);
      const y = this.randomInt(zone.minY, zone.maxY);
      const pos = Position.create(x, y, zone.z);
      if (map.isWalkable(pos) && !instance.isOccupied(pos)) {
        return pos;
      }
    }
    return null;
  }

  private pickEntry(entries: SpawnZoneEntry[]): SpawnZoneEntry | null {
    if (entries.length === 0) return null;
    const total = entries.reduce((sum, e) => sum + Math.max(0, e.weight), 0);
    if (total <= 0) return entries[0] ?? null;
    let roll = Math.random() * total;
    for (const entry of entries) {
      roll -= Math.max(0, entry.weight);
      if (roll <= 0) return entry;
    }
    return entries[entries.length - 1] ?? null;
  }

  private randomInt(min: number, max: number): number {
    const lo = Math.min(min, max);
    const hi = Math.max(min, max);
    return lo + Math.floor(Math.random() * (hi - lo + 1));
  }
}
