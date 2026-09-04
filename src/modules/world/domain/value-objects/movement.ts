export enum EntityType {
  PLAYER = 'PLAYER',
  NPC = 'NPC',
  POKEMON = 'POKEMON',
  ITEM = 'ITEM',
  OBJECT = 'OBJECT',
}

export type MovementDirection = 'UP' | 'DOWN' | 'LEFT' | 'RIGHT';

export const DIRECTION_DELTA: Record<MovementDirection, { dx: number; dy: number }> = {
  UP: { dx: 0, dy: -1 },
  DOWN: { dx: 0, dy: 1 },
  LEFT: { dx: -1, dy: 0 },
  RIGHT: { dx: 1, dy: 0 },
};

export interface MovementProfile {
  /** Cells per MOVE intent. Milestone 1: always 1. */
  stepSize: number;
}

export const DEFAULT_PLAYER_MOVEMENT: MovementProfile = {
  stepSize: 1,
};
