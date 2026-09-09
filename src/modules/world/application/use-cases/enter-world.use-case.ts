import { Inject, Injectable } from '@nestjs/common';
import type { UseCase } from '../../../../shared/application/use-case.js';
import {
  WORLD_MAP_REPOSITORY,
  type WorldMapRepository,
} from '../../domain/repositories/world-map.repository.js';
import { MapId } from '../../domain/value-objects/ids.vo.js';
import { Position } from '../../domain/value-objects/position.vo.js';
import { WorldEntity } from '../../domain/entities/world-entity.entity.js';
import { WorldSession } from '../../domain/entities/world-session.entity.js';
import { SpawnService } from '../../domain/services/spawn.service.js';
import { InstanceManager } from '../services/instance-manager.service.js';
import { SessionManager } from '../services/session-manager.service.js';
import { WildSpawnService } from '../services/wild-spawn.service.js';
import { NpcSpawnService } from '../services/npc-spawn.service.js';
import { InterestAreaService } from '../services/interest-area.service.js';
import type { EnterWorldCommand, EnterWorldResult } from '../dto/world.dto.js';
import { MapNotFoundError } from '../../domain/errors/world.errors.js';
import type { FacingDirection } from '../../../character/domain/value-objects/character-world-state.vo.js';

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
    private readonly wildSpawns: WildSpawnService,
    private readonly npcSpawns: NpcSpawnService,
    private readonly interest: InterestAreaService,
  ) {}

  async execute(command: EnterWorldCommand): Promise<EnterWorldResult> {
    const mapIdValue =
      command.savedPosition?.mapId ?? command.mapId ?? 'laboratory';
    const map =
      mapIdValue === 'laboratory'
        ? await this.maps.getLaboratory()
        : await this.maps.getById(MapId.create(mapIdValue));

    if (!map) {
      throw new MapNotFoundError(mapIdValue);
    }

    const previous = this.sessions.getByCharacter(command.characterId);
    if (previous) {
      this.instances.removeEntity(previous.instanceId.value, previous.entityId);
      this.sessions.removeByConnection(previous.connectionId);
    }

    const instance = this.instances.findAvailableInstance(map.id);

    const npcSpawned = this.npcSpawns.ensureNpcs(map, instance);
    const wildSpawned = this.wildSpawns.ensureSpawns(map, instance);

    let spawn = this.spawnService.findSpawn(map, instance.occupiedKeys());
    let direction: FacingDirection = command.direction ?? 'DOWN';

    if (command.savedPosition) {
      const saved = Position.create(
        command.savedPosition.x,
        command.savedPosition.y,
        command.savedPosition.z,
      );
      if (map.isWalkable(saved) && !instance.isOccupied(saved)) {
        spawn = saved;
      }
    }

    const entity = WorldEntity.createPlayer(
      command.characterId,
      spawn,
      direction,
      command.visual,
    );
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
      direction,
    });
    this.sessions.set(session);

    const all = instance.getEntities().map((e) => e.toSnapshot());
    const entities = this.interest.filterAround(spawn, all);

    return {
      snapshot: {
        map: { id: map.id.value },
        instance: { id: instance.id.value },
        selfEntityId: entity.id,
        entities,
      },
      spawned: entity.toSnapshot(),
      wildSpawned: wildSpawned.map((e) => e.toSnapshot()),
      npcSpawned: npcSpawned.map((e) => e.toSnapshot()),
    };
  }
}
