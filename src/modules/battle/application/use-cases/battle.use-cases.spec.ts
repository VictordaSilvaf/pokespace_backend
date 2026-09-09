import { describe, expect, it } from 'vitest';
import { StartWildBattleUseCase } from './start-wild-battle.use-case.js';
import { ExecuteBattleActionUseCase } from './execute-battle-action.use-case.js';
import { InMemoryBattleRepository } from '../../infrastructure/persistence/in-memory-battle.repository.js';
import { InMemoryPokemonRepository } from '../../../pokemon/infrastructure/persistence/in-memory-pokemon.repository.js';

describe('Battle use cases', () => {
  it('starts a wild battle and resolves a tackle turn', async () => {
    const battles = new InMemoryBattleRepository();
    const pokemon = new InMemoryPokemonRepository();
    const start = new StartWildBattleUseCase(battles, pokemon);
    const act = new ExecuteBattleActionUseCase(battles);

    const battle = await start.execute({
      characterId: 'acc-1',
      playerDexId: 25,
      playerLevel: 10,
      wildDexId: 19,
      wildLevel: 5,
    });

    expect(battle.status).toBe('active');
    expect(battle.playerMoves?.length).toBeGreaterThan(0);

    const after = await act.execute({
      battleId: battle.id,
      characterId: 'acc-1',
      action: 'move',
      moveId: 'tackle',
    });

    expect(after.wild.hp).toBeLessThan(battle.wild.hp);
    expect(after.lastAction?.kind).toBe('move');
  });

  it('can attempt capture', async () => {
    const battles = new InMemoryBattleRepository();
    const pokemon = new InMemoryPokemonRepository();
    const start = new StartWildBattleUseCase(battles, pokemon);
    const act = new ExecuteBattleActionUseCase(battles);

    const battle = await start.execute({
      characterId: 'acc-1',
      playerDexId: 4,
      playerLevel: 20,
      wildDexId: 16,
      wildLevel: 2,
    });

    const after = await act.execute({
      battleId: battle.id,
      characterId: 'acc-1',
      action: 'capture',
      ballBonus: 5,
    });

    expect(after.lastAction?.kind).toBe('capture');
    expect(typeof after.lastAction?.captured).toBe('boolean');
  });
});
