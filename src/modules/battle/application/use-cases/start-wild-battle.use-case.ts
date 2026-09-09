import { Inject, Injectable } from '@nestjs/common';
import type { UseCase } from '../../../../shared/application/use-case.js';
import {
  BATTLE_REPOSITORY,
  type BattleRepository,
} from '../../domain/repositories/battle.repository.js';
import {
  Battle,
  deriveStatsFromBase,
} from '../../domain/entities/battle.entity.js';
import {
  POKEMON_REPOSITORY,
  type PokemonRepository,
} from '../../../pokemon/domain/repositories/pokemon.repository.js';
import { DexId } from '../../../pokemon/domain/value-objects/dex-id.vo.js';
import { PokemonNotFoundError } from '../../../pokemon/domain/errors/pokemon.errors.js';
import { starterMovesForType } from '../../domain/services/move-catalog.js';
import { toBattleResult, type BattleResult } from '../dto/battle.dto.js';

export interface StartWildBattleCommand {
  characterId: string;
  playerDexId: number;
  playerLevel: number;
  wildDexId: number;
  wildLevel: number;
  wildEntityId?: string;
}

@Injectable()
export class StartWildBattleUseCase
  implements UseCase<StartWildBattleCommand, BattleResult>
{
  constructor(
    @Inject(BATTLE_REPOSITORY)
    private readonly battles: BattleRepository,
    @Inject(POKEMON_REPOSITORY)
    private readonly pokemon: PokemonRepository,
  ) {}

  async execute(command: StartWildBattleCommand): Promise<BattleResult> {
    const playerSpecies = await this.pokemon.findByDexId(
      DexId.create(command.playerDexId),
    );
    const wildSpecies = await this.pokemon.findByDexId(
      DexId.create(command.wildDexId),
    );
    if (!playerSpecies) {
      throw new PokemonNotFoundError(command.playerDexId);
    }
    if (!wildSpecies) {
      throw new PokemonNotFoundError(command.wildDexId);
    }

    const playerStats = deriveStatsFromBase(
      playerSpecies.baseStats.toJSON(),
      command.playerLevel,
    );
    const wildStats = deriveStatsFromBase(
      wildSpecies.baseStats.toJSON(),
      command.wildLevel,
    );

    const battle = Battle.start({
      characterId: command.characterId,
      player: {
        entityId: `player-mon-${command.characterId}`,
        dexId: playerSpecies.dexId.value,
        name: playerSpecies.name,
        ...playerStats,
      },
      wild: {
        entityId: command.wildEntityId ?? `wild-${command.wildDexId}`,
        dexId: wildSpecies.dexId.value,
        name: wildSpecies.name,
        ...wildStats,
      },
    });

    await this.battles.save(battle);

    return toBattleResult(battle, {
      playerMoves: starterMovesForType(
        playerSpecies.types.map((t) => t.value),
      ).map((m) => m.toJSON()),
      wildMoves: starterMovesForType(
        wildSpecies.types.map((t) => t.value),
      ).map((m) => m.toJSON()),
    });
  }
}
