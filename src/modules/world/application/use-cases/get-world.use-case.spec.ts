import { describe, expect, it } from 'vitest';
import { GetWorldUseCase } from './get-world.use-case.js';
import { InMemoryWorldRepository } from '../../infrastructure/persistence/in-memory-world.repository.js';
import { SEEDED_WORLD_IDS } from '../../infrastructure/persistence/seed-worlds.js';
import { WorldNotFoundError } from '../../domain/errors/world.errors.js';

describe('GetWorldUseCase', () => {
  it('returns a seeded world by id', async () => {
    const useCase = new GetWorldUseCase(new InMemoryWorldRepository());
    const result = await useCase.execute({
      worldId: SEEDED_WORLD_IDS.earth,
    });

    expect(result.name).toBe('Earth');
    expect(result.status).toBe('maintenance');
  });

  it('throws WorldNotFoundError for unknown id', async () => {
    const useCase = new GetWorldUseCase(new InMemoryWorldRepository());

    await expect(
      useCase.execute({
        worldId: '00000000-0000-4000-8000-000000000000',
      }),
    ).rejects.toBeInstanceOf(WorldNotFoundError);
  });
});
