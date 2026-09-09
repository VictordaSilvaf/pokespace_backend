import { describe, expect, it } from 'vitest';
import { GetPokemonByDexIdUseCase } from './get-pokemon-by-dex-id.use-case.js';
import { InMemoryPokemonRepository } from '../../infrastructure/persistence/in-memory-pokemon.repository.js';
import { InMemoryAssetRegistry } from '../../infrastructure/persistence/in-memory-asset-registry.js';
import { PokemonNotFoundError } from '../../domain/errors/pokemon.errors.js';
import { InvalidDexIdError } from '../../domain/errors/pokemon.errors.js';

describe('GetPokemonByDexIdUseCase', () => {
  it('returns pokemon with visual assets', async () => {
    const useCase = new GetPokemonByDexIdUseCase(
      new InMemoryPokemonRepository(),
      new InMemoryAssetRegistry(),
    );

    const result = await useCase.execute({ dexId: 25 });

    expect(result.name).toBe('Pikachu');
    expect(result.types).toEqual(['electric']);
    expect(result.assets?.portrait?.assetKey).toBe('pokemon/25/portrait');
    expect(result.assets?.walk?.path).toContain('walk.png');
  });

  it('throws PokemonNotFoundError for unknown dex', async () => {
    const useCase = new GetPokemonByDexIdUseCase(
      new InMemoryPokemonRepository(),
      new InMemoryAssetRegistry(),
    );

    await expect(useCase.execute({ dexId: 9999 })).rejects.toBeInstanceOf(
      PokemonNotFoundError,
    );
  });

  it('throws InvalidDexIdError for non-positive dexId', async () => {
    const useCase = new GetPokemonByDexIdUseCase(
      new InMemoryPokemonRepository(),
      new InMemoryAssetRegistry(),
    );

    await expect(useCase.execute({ dexId: 0 })).rejects.toBeInstanceOf(
      InvalidDexIdError,
    );
  });
});
