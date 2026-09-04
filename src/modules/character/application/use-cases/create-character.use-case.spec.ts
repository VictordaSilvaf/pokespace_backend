import { describe, expect, it, beforeEach } from 'vitest';
import { CreateCharacterUseCase } from './create-character.use-case.js';
import { InMemoryCharacterRepository } from '../../infrastructure/persistence/in-memory-character.repository.js';
import { InMemoryServerRepository } from '../../../servers/infrastructure/persistence/in-memory-server.repository.js';
import { SEEDED_SERVER_IDS } from '../../../servers/infrastructure/persistence/seed-servers.js';
import { ResolveLaboratorySpawnUseCase } from '../../../world/application/use-cases/resolve-laboratory-spawn.use-case.js';
import { FileWorldMapRepository } from '../../../world/infrastructure/maps/file-world-map.repository.js';
import { InstanceManager } from '../../../world/application/services/instance-manager.service.js';
import type { DomainEvent } from '../../../../shared/domain/domain-event.js';
import type { EventPublisher } from '../../../../shared/application/ports/event-publisher.port.js';
import {
  CharacterNameTakenError,
  ServerNotJoinableError,
} from '../../domain/errors/character.errors.js';

class SilentPublisher implements EventPublisher {
  async publish(_events: DomainEvent[]): Promise<void> {}
}

describe('CreateCharacterUseCase', () => {
  let useCase: CreateCharacterUseCase;

  beforeEach(() => {
    const maps = new FileWorldMapRepository();
    const instances = new InstanceManager();
    useCase = new CreateCharacterUseCase(
      new InMemoryCharacterRepository(),
      new InMemoryServerRepository(),
      new ResolveLaboratorySpawnUseCase(maps, instances),
      new SilentPublisher(),
    );
  });

  it('creates character on joinable server and returns lab spawn', async () => {
    const result = await useCase.execute({
      accountId: 'acc-1',
      serverId: SEEDED_SERVER_IDS.mercury,
      name: 'Ash',
    });

    expect(result.character.name).toBe('Ash');
    expect(result.spawn.mapId).toBe('laboratory');
    expect(result.spawn.instanceId).toMatch(/^laboratory-\d{2}$/);
  });

  it('rejects maintenance server', async () => {
    await expect(
      useCase.execute({
        accountId: 'acc-1',
        serverId: SEEDED_SERVER_IDS.earth,
        name: 'Ash',
      }),
    ).rejects.toBeInstanceOf(ServerNotJoinableError);
  });

  it('rejects duplicate name on same server', async () => {
    await useCase.execute({
      accountId: 'acc-1',
      serverId: SEEDED_SERVER_IDS.mercury,
      name: 'Ash',
    });

    await expect(
      useCase.execute({
        accountId: 'acc-2',
        serverId: SEEDED_SERVER_IDS.mercury,
        name: 'Ash',
      }),
    ).rejects.toBeInstanceOf(CharacterNameTakenError);
  });
});
