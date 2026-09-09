import { describe, expect, it } from 'vitest';
import { StartWildBattleUseCase } from './start-wild-battle.use-case.js';
import { ExecuteBattleActionUseCase } from './execute-battle-action.use-case.js';
import { InMemoryBattleRepository } from '../../infrastructure/persistence/in-memory-battle.repository.js';
import { InMemoryPokemonRepository } from '../../../pokemon/infrastructure/persistence/in-memory-pokemon.repository.js';
import { InMemoryCharacterRepository } from '../../../character/infrastructure/persistence/in-memory-character.repository.js';
import { GetCharacterForAccountUseCase } from '../../../character/application/use-cases/get-character-for-account.use-case.js';
import { Character } from '../../../character/domain/entities/character.entity.js';
import { CharacterName } from '../../../character/domain/value-objects/character-name.vo.js';
import { CharacterAccessDeniedError } from '../../../character/domain/errors/character.errors.js';

async function setupOwnedCharacter(accountId = 'acc-1') {
  const characters = new InMemoryCharacterRepository();
  const character = Character.create(
    accountId,
    '11111111-1111-4111-8111-111111111111',
    CharacterName.create('Ash'),
  );
  await characters.save(character);
  const getCharacter = new GetCharacterForAccountUseCase(characters);
  return { character, getCharacter, characters };
}

describe('Battle use cases', () => {
  it('starts a wild battle and resolves a tackle turn', async () => {
    const battles = new InMemoryBattleRepository();
    const pokemon = new InMemoryPokemonRepository();
    const { character, getCharacter } = await setupOwnedCharacter();
    const start = new StartWildBattleUseCase(battles, pokemon, getCharacter);
    const act = new ExecuteBattleActionUseCase(battles, getCharacter);

    const battle = await start.execute({
      accountId: 'acc-1',
      characterId: character.id,
      playerDexId: 25,
      playerLevel: 10,
      wildDexId: 19,
      wildLevel: 5,
    });

    expect(battle.status).toBe('active');
    expect(battle.playerMoves?.length).toBeGreaterThan(0);

    const after = await act.execute({
      battleId: battle.id,
      accountId: 'acc-1',
      characterId: character.id,
      action: 'move',
      moveId: 'tackle',
    });

    expect(after.wild.hp).toBeLessThan(battle.wild.hp);
    expect(after.lastAction?.kind).toBe('move');
  });

  it('can attempt capture', async () => {
    const battles = new InMemoryBattleRepository();
    const pokemon = new InMemoryPokemonRepository();
    const { character, getCharacter } = await setupOwnedCharacter();
    const start = new StartWildBattleUseCase(battles, pokemon, getCharacter);
    const act = new ExecuteBattleActionUseCase(battles, getCharacter);

    const battle = await start.execute({
      accountId: 'acc-1',
      characterId: character.id,
      playerDexId: 4,
      playerLevel: 20,
      wildDexId: 16,
      wildLevel: 2,
    });

    const after = await act.execute({
      battleId: battle.id,
      accountId: 'acc-1',
      characterId: character.id,
      action: 'capture',
      ballBonus: 5,
    });

    expect(after.lastAction?.kind).toBe('capture');
    expect(typeof after.lastAction?.captured).toBe('boolean');
  });

  it('rejects starting a battle with a character from another account', async () => {
    const battles = new InMemoryBattleRepository();
    const pokemon = new InMemoryPokemonRepository();
    const { character, getCharacter } = await setupOwnedCharacter('acc-owner');
    const start = new StartWildBattleUseCase(battles, pokemon, getCharacter);

    await expect(
      start.execute({
        accountId: 'acc-attacker',
        characterId: character.id,
        playerDexId: 25,
        playerLevel: 10,
        wildDexId: 19,
        wildLevel: 5,
      }),
    ).rejects.toBeInstanceOf(CharacterAccessDeniedError);
  });
});
