import type { Position } from '../value-objects/position.vo.js';
import type { MovementProfile } from '../value-objects/movement.js';
import type { WorldMap } from '../entities/world-map.entity.js';
import { CollisionService } from './collision.service.js';

export interface NavigationService {
  canMove(
    map: WorldMap,
    current: Position,
    target: Position,
    profile: MovementProfile,
  ): boolean;
  findPath?(
    map: WorldMap,
    from: Position,
    to: Position,
  ): Position[];
}

export class GridNavigationService implements NavigationService {
  constructor(private readonly collision = new CollisionService()) {}

  canMove(
    map: WorldMap,
    current: Position,
    target: Position,
    profile: MovementProfile,
  ): boolean {
    return this.collision.canMove(map, current, target, profile);
  }
}
