import type { WorldStatusValue } from '../../domain/value-objects/world-status.vo.js';
import type { World } from '../../domain/entities/world.entity.js';

export interface GetWorldQuery {
  worldId: string;
}

export interface WorldResult {
  worldId: string;
  name: string;
  region: string;
  status: WorldStatusValue;
  maxPlayers: number;
}

export function toWorldResult(world: World): WorldResult {
  return {
    worldId: world.id,
    name: world.name.value,
    region: world.region,
    status: world.status.value,
    maxPlayers: world.maxPlayers,
  };
}

export type ListWorldsResult = WorldResult[];