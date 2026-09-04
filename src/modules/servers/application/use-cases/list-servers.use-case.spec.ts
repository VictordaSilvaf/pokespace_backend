import { describe, expect, it } from 'vitest';
import { ListServersUseCase } from './list-servers.use-case.js';
import { InMemoryServerRepository } from '../../infrastructure/persistence/in-memory-server.repository.js';
import { SEEDED_SERVER_IDS } from '../../infrastructure/persistence/seed-servers.js';

describe('ListServersUseCase', () => {
  it('returns the seeded servers', async () => {
    const useCase = new ListServersUseCase(new InMemoryServerRepository());
    const result = await useCase.execute();

    expect(result).toHaveLength(9);
    // online first (name ASC), then maintenance (Earth)
    expect(result.map((w) => w.serverId)).toEqual([
      SEEDED_SERVER_IDS.jupiter,
      SEEDED_SERVER_IDS.mars,
      SEEDED_SERVER_IDS.mercury,
      SEEDED_SERVER_IDS.neptune,
      SEEDED_SERVER_IDS.pluto,
      SEEDED_SERVER_IDS.saturn,
      SEEDED_SERVER_IDS.uranus,
      SEEDED_SERVER_IDS.venus,
      SEEDED_SERVER_IDS.earth,
    ]);
    expect(result.at(-1)?.name).toBe('Earth');
    expect(result.at(-1)?.status).toBe('maintenance');
  });
});
