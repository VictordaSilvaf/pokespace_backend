import { describe, expect, it } from 'vitest';
import { ListPokemonUseCase } from './list-pokemon.use-case.js';
import { InMemoryPokemonRepository } from '../../infrastructure/persistence/in-memory-pokemon.repository.js';

describe('ListPokemonUseCase', () => {
  it('returns seeded active pokemon ordered by dexId', async () => {
    const useCase = new ListPokemonUseCase(new InMemoryPokemonRepository());
    const result = await useCase.execute();

    expect(result.length).toBeGreaterThanOrEqual(6);
    expect(result[0]?.dexId).toBe(1);
    expect(result[0]?.name).toBe('Bulbasaur');
    const dexIds = result.map((p) => p.dexId);
    expect(dexIds).toEqual([...dexIds].sort((a, b) => a - b));
  });
});
