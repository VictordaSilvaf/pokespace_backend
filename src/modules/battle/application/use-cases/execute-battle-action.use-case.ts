import { Inject, Injectable } from '@nestjs/common';
import type { UseCase } from '../../../../shared/application/use-case.js';
import {
  BATTLE_REPOSITORY,
  type BattleRepository,
} from '../../domain/repositories/battle.repository.js';
import { BattleNotFoundError } from '../../domain/errors/battle.errors.js';
import { getMoveById } from '../../domain/services/move-catalog.js';
import { BattleDomainError } from '../../domain/errors/battle.errors.js';
import { toBattleResult, type BattleResult } from '../dto/battle.dto.js';

export interface ExecuteBattleActionCommand {
  battleId: string;
  characterId: string;
  action: 'move' | 'capture' | 'flee';
  moveId?: string;
  ballBonus?: number;
}

@Injectable()
export class ExecuteBattleActionUseCase
  implements UseCase<ExecuteBattleActionCommand, BattleResult>
{
  constructor(
    @Inject(BATTLE_REPOSITORY)
    private readonly battles: BattleRepository,
  ) {}

  async execute(command: ExecuteBattleActionCommand): Promise<BattleResult> {
    const battle = await this.battles.findById(command.battleId);
    if (!battle || battle.characterId !== command.characterId) {
      throw new BattleNotFoundError(command.battleId);
    }

    if (command.action === 'move') {
      if (!command.moveId) {
        throw new BattleDomainError('MOVE_REQUIRED', 'moveId is required');
      }
      const move = getMoveById(command.moveId);
      if (!move) {
        throw new BattleDomainError('UNKNOWN_MOVE', `Unknown move: ${command.moveId}`);
      }
      const playerResult = battle.useMove('player', move);
      let wildResult = null;
      if (battle.status === 'active') {
        const counter = getMoveById('tackle')!;
        wildResult = battle.useMove('wild', counter);
      }
      await this.battles.save(battle);
      return toBattleResult(battle, {
        lastAction: {
          kind: 'move',
          actor: 'player',
          moveId: move.id,
          damage: playerResult.damage,
          hit: playerResult.hit,
          appliedEffect: playerResult.appliedEffect,
          ...(wildResult
            ? {
                /* counter embedded in state */
              }
            : {}),
        },
      });
    }

    if (command.action === 'capture') {
      const result = battle.tryCapture(command.ballBonus ?? 1);
      await this.battles.save(battle);
      return toBattleResult(battle, {
        lastAction: {
          kind: 'capture',
          captured: result.captured,
          shakeChecks: result.shakeChecks,
        },
      });
    }

    if (command.action === 'flee') {
      const fled = battle.flee();
      await this.battles.save(battle);
      return toBattleResult(battle, {
        lastAction: { kind: 'flee', fled },
      });
    }

    throw new BattleDomainError('INVALID_ACTION', `Unknown action`);
  }
}
