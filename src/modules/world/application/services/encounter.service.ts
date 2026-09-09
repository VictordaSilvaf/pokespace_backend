import { Injectable } from '@nestjs/common';
import type { Position } from '../../domain/value-objects/position.vo.js';
import {
  WildSpawnService,
  type SpawnZone,
} from './wild-spawn.service.js';

export type EncounterResult = {
  triggered: boolean;
  dexId?: number;
  level?: number;
  zoneId?: string;
};

/**
 * Server-side encounter roll when a player steps into a spawn zone.
 * Does not start battle itself — caller links to battle module / WS.
 */
@Injectable()
export class EncounterService {
  constructor(private readonly wildSpawns: WildSpawnService) {}

  /**
   * @param encounterChance 0..1 probability when inside a zone (default 15%)
   */
  roll(
    mapId: string,
    position: Position,
    encounterChance = 0.15,
  ): EncounterResult {
    const zones = this.wildSpawns.loadZones(mapId);
    const zone = zones.find((z) => this.inZone(position, z));
    if (!zone || zone.entries.length === 0) {
      return { triggered: false };
    }
    if (Math.random() > encounterChance) {
      return { triggered: false };
    }
    const entry = this.pickEntry(zone.entries);
    if (!entry) return { triggered: false };
    const level =
      entry.minLevel +
      Math.floor(Math.random() * (entry.maxLevel - entry.minLevel + 1));
    return {
      triggered: true,
      dexId: entry.dexId,
      level,
      zoneId: zone.id,
    };
  }

  private inZone(pos: Position, zone: SpawnZone): boolean {
    return (
      pos.x >= zone.minX &&
      pos.x <= zone.maxX &&
      pos.y >= zone.minY &&
      pos.y <= zone.maxY &&
      (pos.z ?? 0) === (zone.z ?? 0)
    );
  }

  private pickEntry(
    entries: SpawnZone['entries'],
  ): SpawnZone['entries'][number] | null {
    const total = entries.reduce((s, e) => s + e.weight, 0);
    if (total <= 0) return null;
    let roll = Math.random() * total;
    for (const e of entries) {
      roll -= e.weight;
      if (roll <= 0) return e;
    }
    return entries[entries.length - 1] ?? null;
  }
}
