import { beforeEach, describe, expect, it } from 'vitest';
import type { DomainEvent } from '../../../../shared/domain/domain-event.js';
import type { EventPublisher } from '../../../../shared/application/ports/event-publisher.port.js';
import { InMemoryWorldRepository } from '../../../world/infrastructure/persistence/in-memory-world.repository.js';
import { SEEDED_WORLD_IDS } from '../../../world/infrastructure/persistence/seed-worlds.js';
import { CharacterCreatedEvent } from '../../domain/events/character-created.event.js';
import {
  CharacterLimitReachedError,
  DisplayNameTakenError,
  WorldNotAvailableError,
} from '../../domain/errors/character.errors.js';
import { InMemoryCharacterRepository } from '../../infrastructure/persistence/in-memory-character.repository.js';
import { CreateCharacterUseCase } from './create-character.use-case.js';

class RecordingEventPublisher implements EventPublisher {
  readonly published: DomainEvent[] = [];

  async publish(events: DomainEvent[]): Promise<void> {
    this.published.push(...events);
  }
}

describe('CreateCharacterUseCase', () => {
  const userId = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
  let characters: InMemoryCharacterRepository;
  let worlds: InMemoryWorldRepository;
  let events: RecordingEventPublisher;
  let useCase: CreateCharacterUseCase;

  beforeEach(() => {
    characters = new InMemoryCharacterRepository();
    worlds = new InMemoryWorldRepository();
    events = new RecordingEventPublisher();
    useCase = new CreateCharacterUseCase(characters, worlds, events);
  });

  it('creates a character on a joinable world and emits event', async () => {
    const result = await useCase.execute({
      userId,
      worldId: SEEDED_WORLD_IDS.mercury,
      displayName: 'Ash',
      skinId: 'starter-boy-01',
    });

    expect(result.displayName).toBe('Ash');
    expect(result.worldId).toBe(SEEDED_WORLD_IDS.mercury);
    expect(result.skinId).toBe('starter-boy-01');
    expect(result.worldName).toBe('Mercury');
    expect(events.published.some((e) => e instanceof CharacterCreatedEvent)).toBe(
      true,
    );
  });

  it('rejects creation on non-joinable world', async () => {
    await expect(
      useCase.execute({
        userId,
        worldId: SEEDED_WORLD_IDS.earth,
        displayName: 'Misty',
        skinId: 'starter-girl-01',
      }),
    ).rejects.toBeInstanceOf(WorldNotAvailableError);
  });

  it('rejects duplicate display name on same account', async () => {
    await useCase.execute({
      userId,
      worldId: SEEDED_WORLD_IDS.mercury,
      displayName: 'Brock',
      skinId: 'starter-boy-01',
    });

    await expect(
      useCase.execute({
        userId,
        worldId: SEEDED_WORLD_IDS.mars,
        displayName: 'brock',
        skinId: 'starter-boy-02',
      }),
    ).rejects.toBeInstanceOf(DisplayNameTakenError);
  });

  it('allows a second character on the same world (policy A)', async () => {
    await useCase.execute({
      userId,
      worldId: SEEDED_WORLD_IDS.mercury,
      displayName: 'Red',
      skinId: 'starter-boy-01',
    });

    const second = await useCase.execute({
      userId,
      worldId: SEEDED_WORLD_IDS.mercury,
      displayName: 'Blue',
      skinId: 'starter-girl-01',
    });

    expect(second.worldId).toBe(SEEDED_WORLD_IDS.mercury);
  });

  it('enforces max 4 characters per account', async () => {
    for (let i = 0; i < 4; i += 1) {
      await useCase.execute({
        userId,
        worldId: SEEDED_WORLD_IDS.mercury,
        displayName: `Hero${i}`,
        skinId: 'starter-boy-01',
      });
    }

    await expect(
      useCase.execute({
        userId,
        worldId: SEEDED_WORLD_IDS.venus,
        displayName: 'Hero4',
        skinId: 'starter-girl-02',
      }),
    ).rejects.toBeInstanceOf(CharacterLimitReachedError);
  });
});
