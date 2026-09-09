import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Injectable } from '@nestjs/common';
import type { WorldMap } from '../../domain/entities/world-map.entity.js';
import { WorldEntity } from '../../domain/entities/world-entity.entity.js';
import { Position } from '../../domain/value-objects/position.vo.js';
import type { MapInstance } from '../../domain/entities/map-instance.entity.js';
import type { FacingDirection } from '../../../character/domain/value-objects/character-world-state.vo.js';

export interface NpcDefinition {
  id: string;
  x: number;
  y: number;
  z?: number;
  direction?: FacingDirection;
  label?: string;
  assetKey?: string;
  path?: string;
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
export class NpcSpawnService {
  private readonly mapsRoot = resolveMapsRoot();
  private readonly npcsByMap = new Map<string, NpcDefinition[]>();

  loadNpcs(mapId: string): NpcDefinition[] {
    if (this.npcsByMap.has(mapId)) {
      return this.npcsByMap.get(mapId)!;
    }
    try {
      const meta = JSON.parse(
        readFileSync(join(this.mapsRoot, mapId, 'metadata.json'), 'utf8'),
      ) as { npcs?: NpcDefinition[] };
      const npcs = Array.isArray(meta.npcs) ? meta.npcs : [];
      this.npcsByMap.set(mapId, npcs);
      return npcs;
    } catch {
      this.npcsByMap.set(mapId, []);
      return [];
    }
  }

  /** Spawn static NPCs once per instance. */
  ensureNpcs(map: WorldMap, instance: MapInstance): WorldEntity[] {
    const defs = this.loadNpcs(map.id.value);
    const spawned: WorldEntity[] = [];
    for (const def of defs) {
      const entityId = `npc-${def.id}`;
      if (instance.getEntity(entityId)) continue;
      const position = Position.create(def.x, def.y, def.z ?? 0);
      if (!map.isWalkable(position) || instance.isOccupied(position)) {
        continue;
      }
      const entity = WorldEntity.createNpc(
        def.id,
        position,
        def.direction ?? 'DOWN',
        {
          label: def.label ?? def.id,
          assetKey: def.assetKey,
          path: def.path,
          npcId: def.id,
        },
      );
      try {
        instance.addEntity(entity);
        spawned.push(entity);
      } catch {
        // skip
      }
    }
    return spawned;
  }
}
