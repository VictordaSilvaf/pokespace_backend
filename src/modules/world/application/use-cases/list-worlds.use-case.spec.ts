import { describe, expect, it } from 'vitest';
import { ListWorldsUseCase } from './list-worlds.use-case.js';
import { InMemoryWorldRepository } from '../../infrastructure/persistence/in-memory-world.repository.js';
import { SEEDED_WORLD_IDS } from '../../infrastructure/persistence/seed-worlds.js';

describe('ListWorldsUseCase', () => {
  it('returns the seeded worlds', async () => {
    const useCase = new ListWorldsUseCase(new InMemoryWorldRepository());
    const result = await useCase.execute();

    expect(result).toHaveLength(9);
    expect(result.map((w) => w.worldId)).toEqual([
      SEEDED_WORLD_IDS.mercury,
      SEEDED_WORLD_IDS.venus,
      SEEDED_WORLD_IDS.earth,
      SEEDED_WORLD_IDS.mars,
      SEEDED_WORLD_IDS.jupiter,
      SEEDED_WORLD_IDS.saturn,
      SEEDED_WORLD_IDS.uranus,
      SEEDED_WORLD_IDS.neptune,
      SEEDED_WORLD_IDS.pluto,
    ]);
    expect(result[2]?.name).toBe('Earth');
    expect(result[2]?.status).toBe('maintenance');
  });
});
