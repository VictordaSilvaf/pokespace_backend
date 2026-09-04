import { Inject, Injectable } from '@nestjs/common';
import type { UseCase } from '../../../../shared/application/use-case.js';
import {
  WORLD_REPOSITORY,
  type WorldRepository,
} from '../../../world/domain/repositories/world.repository.js';
import { listStarterSkins } from '../../infrastructure/catalog/starter-skins.js';
import { getCharacterMaxPerAccount } from '../character.config.js';
import type { CreationOptionsResult } from '../dto/character.dto.js';

@Injectable()
export class GetCreationOptionsUseCase
  implements UseCase<void, CreationOptionsResult>
{
  constructor(
    @Inject(WORLD_REPOSITORY)
    private readonly worlds: WorldRepository,
  ) {}

  async execute(): Promise<CreationOptionsResult> {
    const worlds = await this.worlds.list();
    const joinable = worlds.filter((world) => world.isJoinable());

    return {
      worlds: joinable.map((world) => ({
        worldId: world.id,
        name: world.name.value,
        region: world.region,
        status: world.status.value,
        maxPlayers: world.maxPlayers,
      })),
      skins: listStarterSkins().map((skin) => ({
        id: skin.id,
        nameKey: skin.nameKey,
        previewAssetKey: skin.previewAssetKey,
      })),
      limit: getCharacterMaxPerAccount(),
    };
  }
}
