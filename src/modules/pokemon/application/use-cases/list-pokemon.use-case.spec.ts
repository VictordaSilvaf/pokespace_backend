import { describe, expect, it } from 'vitest';
import { ListPokemonUseCase } from './list-pokemon.use-case.js';
import { InMemoryPokemonRepository } from '../../infrastructure/persistence/in-memory-pokemon.repository.js';
import { InMemoryAssetRegistry } from '../../infrastructure/persistence/in-memory-asset-registry.js';

describe('ListPokemonUseCase', () => {
  it('returns paginated seeded catalog', async () => {
    const useCase = new ListPokemonUseCase(
      new InMemoryPokemonRepository(),
      new InMemoryAssetRegistry(),
    );
    const result = await useCase.execute({ limit: 10, offset: 0 });

    expect(result.total).toBeGreaterThanOrEqual(300);
    expect(result.items).toHaveLength(10);
    expect(result.limit).toBe(10);
    expect(result.items[0]?.dexId).toBe(1);
  });

  it('filters by type and query', async () => {
    const useCase = new ListPokemonUseCase(
      new InMemoryPokemonRepository(),
      new InMemoryAssetRegistry(),
    );
    const byType = await useCase.execute({ type: 'electric', limit: 50 });
    expect(byType.items.every((p) => p.types.includes('electric'))).toBe(true);

    const byName = await useCase.execute({ q: 'pika', limit: 10 });
    expect(byName.items.some((p) => p.dexId === 25)).toBe(true);
  });
});
