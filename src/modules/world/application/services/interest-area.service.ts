import { Injectable } from '@nestjs/common';
import type { Position } from '../../domain/value-objects/position.vo.js';

export interface PositionLike {
  x: number;
  y: number;
  z?: number;
}

/**
 * Chebyshev interest radius (tiles). Entities outside are omitted from snapshots.
 */
export const DEFAULT_INTEREST_RADIUS = 24;

@Injectable()
export class InterestAreaService {
  filterAround<T extends { id: string; position: PositionLike }>(
    center: Position | PositionLike,
    entities: T[],
    radius = DEFAULT_INTEREST_RADIUS,
  ): T[] {
    return entities.filter((entity) => {
      if (
        entity.id.startsWith('player-') &&
        entity.position.x === center.x &&
        entity.position.y === center.y
      ) {
        return true;
      }
      return this.within(center, entity.position, radius);
    });
  }

  within(
    a: PositionLike,
    b: PositionLike,
    radius = DEFAULT_INTEREST_RADIUS,
  ): boolean {
    const dx = Math.abs(a.x - b.x);
    const dy = Math.abs(a.y - b.y);
    return Math.max(dx, dy) <= radius;
  }
}
