import { Inject, Injectable } from '@nestjs/common';
import type { UseCase } from '../../../../shared/application/use-case.js';
import {
  WORLD_MAP_REPOSITORY,
  type WorldMapRepository,
} from '../../domain/repositories/world-map.repository.js';
import { SpawnService } from '../../domain/services/spawn.service.js';
import { InstanceManager } from '../services/instance-manager.service.js';
import type { LaboratorySpawnInfo } from '../dto/world.dto.js';

/**
 * Resolves which laboratory instance/spawn a newly created character should join.
 * Does not create a WorldSession — that happens on WebSocket WORLD_ENTER.
 */
@Injectable()
export class ResolveLaboratorySpawnUseCase
  implements UseCase<{ preferredInstanceId?: string }, LaboratorySpawnInfo>
{
  private readonly spawnService = new SpawnService();

  constructor(
    @Inject(WORLD_MAP_REPOSITORY)
    private readonly maps: WorldMapRepository,
    private readonly instances: InstanceManager,
  ) {}

  async execute(
    _input: { preferredInstanceId?: string } = {},
  ): Promise<LaboratorySpawnInfo> {
    const map = await this.maps.getLaboratory();
    const instance = this.instances.findAvailableInstance(map.id);
    const position = this.spawnService.findSpawn(map, instance.occupiedKeys());

    return {
      mapId: map.id.value,
      instanceId: instance.id.value,
      position: position.toJSON(),
    };
  }
}
