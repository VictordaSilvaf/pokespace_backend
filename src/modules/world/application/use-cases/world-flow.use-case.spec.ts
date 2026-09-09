import { describe, expect, it, beforeEach } from 'vitest';
import { EnterWorldUseCase } from './enter-world.use-case.js';
import { LeaveWorldUseCase } from './leave-world.use-case.js';
import { MoveEntityUseCase } from './move-entity.use-case.js';
import { InstanceManager } from '../services/instance-manager.service.js';
import { SessionManager } from '../services/session-manager.service.js';
import { WildSpawnService } from '../services/wild-spawn.service.js';
import { InterestAreaService } from '../services/interest-area.service.js';
import { SharedWorldStateService } from '../services/shared-world-state.service.js';
import { FileWorldMapRepository } from '../../infrastructure/maps/file-world-map.repository.js';
import { MovementBlockedError, InvalidSequenceError } from '../../domain/errors/world.errors.js';

describe('World movement use cases', () => {
  let enter: EnterWorldUseCase;
  let leave: LeaveWorldUseCase;
  let move: MoveEntityUseCase;
  let instances: InstanceManager;

  beforeEach(() => {
    const maps = new FileWorldMapRepository();
    instances = new InstanceManager();
    const sessions = new SessionManager();
    const wild = new WildSpawnService();
    const interest = new InterestAreaService();
    const shared = new SharedWorldStateService(null);
    enter = new EnterWorldUseCase(maps, instances, sessions, wild, interest);
    leave = new LeaveWorldUseCase(instances, sessions, shared);
    move = new MoveEntityUseCase(maps, instances, sessions, shared);
  });

  it('enters laboratory, moves, and leaves', async () => {
    const result = await enter.execute({
      connectionId: 'conn-a',
      accountId: 'acc-a',
      characterId: 'char-a',
    });

    expect(result.snapshot.map.id).toBe('laboratory');
    expect(result.snapshot.instance.id).toBe('laboratory-01');
    expect(result.snapshot.selfEntityId).toBe(result.spawned.id);
    expect(
      result.snapshot.entities.some((e) => e.id === result.spawned.id),
    ).toBe(true);

    const moved = await move.execute({
      connectionId: 'conn-a',
      direction: 'UP',
      sequence: 1,
    });
    expect(moved.accepted).toBe(true);
    expect(moved.position?.y).toBe(result.spawned.position.y - 1);

    await expect(
      move.execute({
        connectionId: 'conn-a',
        direction: 'UP',
        sequence: 1,
      }),
    ).rejects.toBeInstanceOf(InvalidSequenceError);

    const left = await leave.execute({ connectionId: 'conn-a' });
    expect(left.despawned).toBe(true);
    expect(
      instances.getEntities('laboratory-01').some((e) => e.id === result.spawned.id),
    ).toBe(false);
  });

  it('rejects movement into walls', async () => {
    await enter.execute({
      connectionId: 'conn-b',
      accountId: 'acc-b',
      characterId: 'char-b',
    });

    let sequence = 1;
    let blocked = false;
    for (let i = 0; i < 30; i++) {
      try {
        await move.execute({
          connectionId: 'conn-b',
          direction: 'LEFT',
          sequence: sequence++,
        });
      } catch (error) {
        expect(error).toBeInstanceOf(MovementBlockedError);
        blocked = true;
        break;
      }
    }
    expect(blocked).toBe(true);
  });
});
