import type { Battle } from '../entities/battle.entity.js';

export const BATTLE_REPOSITORY = Symbol('BATTLE_REPOSITORY');

export interface BattleRepository {
  save(battle: Battle): Promise<void>;
  findById(id: string): Promise<Battle | null>;
}
