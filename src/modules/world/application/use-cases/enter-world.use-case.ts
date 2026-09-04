import { Inject, Injectable } from '@nestjs/common';
import type { UseCase } from '../../../../shared/application/use-case.js';
import {
  WORLD_MAP_REPOSITORY,
  type WorldMapRepository,
} from '../../domain/repositories/world-map.repository.js';
import { MapId } from '../../domain/value-objects/ids.vo.js';
import { WorldEntity } from '../../domain/entities/world-entity.entity.js';
import { WorldSession } from '../../domain/entities/world-session.entity.js';
import { SpawnService } from '../../domain/services/spawn.service.js';
import { InstanceManager } from '../services/instance-manager.service.js';
import { SessionManager } from '../services/session-manager.service.js';
import type { EnterWorldCommand, EnterWorldResult } from '../dto/world.dto.js';
import { MapNotFoundError } from '../../domain/errors/world.errors.js';

@Injectable()
export class EnterWorldUseCase
  implements UseCase<EnterWorldCommand, EnterWorldResult>
{
  private readonly spawnService = new SpawnService();

  constructor(
    @Inject(WORLD_MAP_REPOSITORY)
    private readonly maps: WorldMapRepository,
    private readonly instances: InstanceManager,
    private readonly sessions: SessionManager,
  ) {}

  async execute(command: EnterWorldCommand): Promise<EnterWorldResult> {
    const mapIdValue = command.mapId ?? 'laboratory';
    const map =
      mapIdValue === 'laboratory'
        ? await this.maps.getLaboratory()
        : await this.maps.getById(MapId.create(mapIdValue));

    if (!map) {
      throw new MapNotFoundError(mapIdValue);
    }

    // Drop previous presence for this character (reconnect / duplicate tab).
    const previous = this.sessions.getByCharacter(command.characterId);
    if (previous) {
      this.instances.removeEntity(previous.instanceId.value, previous.entityId);
      this.sessions.removeByConnection(previous.connectionId);
    }

    const instance = this.instances.findAvailableInstance(map.id);
    const spawn = this.spawnService.findSpawn(map, instance.occupiedKeys());
    const entity = WorldEntity.createPlayer(command.characterId, spawn);
    instance.addEntity(entity);

    const session = WorldSession.create({
      connectionId: command.connectionId,
      characterId: command.characterId,
      accountId: command.accountId,
      mapId: map.id,
      instanceId: instance.id,
      entityId: entity.id,
      position: spawn,
      lastSequence: 0,
    });
    this.sessions.set(session);

    const entities = instance.getEntities().map((entity) => entity.toSnapshot());

    return {
      snapshot: {
        map: { id: map.id.value },
        instance: { id: instance.id.value },
        selfEntityId: entity.id,
        entities,
      },
      spawned: entity.toSnapshot(),
    };
  }
}
