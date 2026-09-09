import { describe, expect, it } from 'vitest';
import { GetCharacterPokedexUseCase } from './get-character-pokedex.use-case.js';
import {
  MarkPokemonCaughtUseCase,
  MarkPokemonSeenUseCase,
} from './pokedex-progress.use-cases.js';
import { InMemoryPokedexProgressRepository } from '../../infrastructure/persistence/in-memory-pokedex-progress.repository.js';
import { InMemoryPokemonRepository } from '../../infrastructure/persistence/in-memory-pokemon.repository.js';
import { InMemoryCharacterRepository } from '../../../character/infrastructure/persistence/in-memory-character.repository.js';
import { GetCharacterForAccountUseCase } from '../../../character/application/use-cases/get-character-for-account.use-case.js';
import { Character } from '../../../character/domain/entities/character.entity.js';
import { CharacterName } from '../../../character/domain/value-objects/character-name.vo.js';

describe('Pokedex progress', () => {
  it('tracks seen and caught for owned character', async () => {
    const characters = new InMemoryCharacterRepository();
    const character = Character.create(
      'acc-1',
      '11111111-1111-4111-8111-111111111111',
      CharacterName.create('Ash'),
    );
    await characters.save(character);
    const getCharacter = new GetCharacterForAccountUseCase(characters);
    const progress = new InMemoryPokedexProgressRepository();
    const pokemon = new InMemoryPokemonRepository();

    const markSeen = new MarkPokemonSeenUseCase(progress);
    const markCaught = new MarkPokemonCaughtUseCase(progress);
    const getPokedex = new GetCharacterPokedexUseCase(
      getCharacter,
      progress,
      pokemon,
    );

    await markSeen.execute({
      characterId: character.id,
      dexIds: [16, 25],
    });
    await markCaught.execute({
      characterId: character.id,
      dexId: 25,
    });

    const result = await getPokedex.execute({
      characterId: character.id,
      accountId: 'acc-1',
    });

    expect(result.totalCatalog).toBeGreaterThanOrEqual(300);
    expect(result.seen).toBe(2);
    expect(result.caught).toBe(1);
    expect(result.entries.find((e) => e.dexId === 25)?.caughtAt).toBeTruthy();
  });
});
