import type { WorldMap } from '../entities/world-map.entity.js';
import type { Position } from '../value-objects/position.vo.js';
import { SpawnUnavailableError } from '../errors/world.errors.js';

export class SpawnService {
  /**
   * Pick first spawn that is walkable and not occupied.
   */
  findSpawn(
    map: WorldMap,
    occupied: ReadonlySet<string>,
  ): Position {
    for (const spawn of map.spawnPoints) {
      const pos = spawn.position;
      if (map.isWalkable(pos) && !occupied.has(pos.key())) {
        return pos;
      }
    }
    throw new SpawnUnavailableError(map.id.value);
  }
}
