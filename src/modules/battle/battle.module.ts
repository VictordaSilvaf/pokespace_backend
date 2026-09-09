import { Module } from '@nestjs/common';
import { PokemonModule } from '../pokemon/pokemon.module.js';
import { IdentityModule } from '../identity/identity.module.js';
import { CharacterModule } from '../character/character.module.js';
import { BATTLE_REPOSITORY } from './domain/repositories/battle.repository.js';
import { InMemoryBattleRepository } from './infrastructure/persistence/in-memory-battle.repository.js';
import { StartWildBattleUseCase } from './application/use-cases/start-wild-battle.use-case.js';
import { ExecuteBattleActionUseCase } from './application/use-cases/execute-battle-action.use-case.js';
import { BattleController } from './infrastructure/http/battle.controller.js';

@Module({
  imports: [IdentityModule, PokemonModule, CharacterModule],
  controllers: [BattleController],
  providers: [
    StartWildBattleUseCase,
    ExecuteBattleActionUseCase,
    {
      provide: BATTLE_REPOSITORY,
      useClass: InMemoryBattleRepository,
    },
  ],
  exports: [StartWildBattleUseCase, ExecuteBattleActionUseCase],
})
export class BattleModule {}
