import type { Battle } from '../../domain/entities/battle.entity.js';
import type { MoveProps } from '../../domain/value-objects/move.vo.js';

export interface BattleResult {
  id: string;
  characterId: string;
  status: string;
  player: Battle['player'];
  wild: Battle['wild'];
  playerMoves?: MoveProps[];
  wildMoves?: MoveProps[];
  lastAction?: {
    kind: string;
    actor?: string;
    moveId?: string;
    damage?: number;
    hit?: boolean;
    appliedEffect?: string | null;
    captured?: boolean;
    shakeChecks?: number;
    fled?: boolean;
  };
}

export function toBattleResult(
  battle: Battle,
  extras?: Partial<BattleResult>,
): BattleResult {
  return {
    id: battle.id,
    characterId: battle.characterId,
    status: battle.status,
    player: { ...battle.player },
    wild: { ...battle.wild },
    ...extras,
  };
}
