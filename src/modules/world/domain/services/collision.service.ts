import type { Position } from '../value-objects/position.vo.js';
import type { MovementProfile } from '../value-objects/movement.js';
import type { WorldMap } from '../entities/world-map.entity.js';

export class CollisionService {
  canMove(
    map: WorldMap,
    _current: Position,
    target: Position,
    _profile: MovementProfile,
  ): boolean {
    return map.isWalkable(target);
  }
}
