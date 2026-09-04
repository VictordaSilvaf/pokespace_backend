import { describe, expect, it } from 'vitest';
import { GetServerUseCase } from './get-server.use-case.js';
import { InMemoryServerRepository } from '../../infrastructure/persistence/in-memory-server.repository.js';
import { SEEDED_SERVER_IDS } from '../../infrastructure/persistence/seed-servers.js';
import { ServerNotFoundError } from '../../domain/errors/server.errors.js';

describe('GetServerUseCase', () => {
  it('returns a seeded server by id', async () => {
    const useCase = new GetServerUseCase(new InMemoryServerRepository());
    const result = await useCase.execute({
      serverId: SEEDED_SERVER_IDS.earth,
    });

    expect(result.name).toBe('Earth');
    expect(result.status).toBe('maintenance');
  });

  it('throws ServerNotFoundError for unknown id', async () => {
    const useCase = new GetServerUseCase(new InMemoryServerRepository());

    await expect(
      useCase.execute({
        serverId: '00000000-0000-4000-8000-000000000000',
      }),
    ).rejects.toBeInstanceOf(ServerNotFoundError);
  });
});
