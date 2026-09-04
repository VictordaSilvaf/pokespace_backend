import { Inject, Injectable } from '@nestjs/common';
import type { UseCase } from '../../../../shared/application/use-case.js';
import {
  WORLD_REPOSITORY,
  type WorldRepository,
} from '../../../world/domain/repositories/world.repository.js';
import {
  CHARACTER_REPOSITORY,
  type CharacterRepository,
} from '../../domain/repositories/character.repository.js';
import { getCharacterMaxPerAccount } from '../character.config.js';
import type {
  ListCharactersQuery,
  ListCharactersResult,
} from '../dto/character.dto.js';
import { toCharacterResult } from '../dto/character.dto.js';

@Injectable()
export class ListCharactersUseCase
  implements UseCase<ListCharactersQuery, ListCharactersResult>
{
  constructor(
    @Inject(CHARACTER_REPOSITORY)
    private readonly characters: CharacterRepository,
    @Inject(WORLD_REPOSITORY)
    private readonly worlds: WorldRepository,
  ) {}

  async execute(query: ListCharactersQuery): Promise<ListCharactersResult> {
    const limit = getCharacterMaxPerAccount();
    const characters = await this.characters.listByUserId(query.userId);
    const worlds = await this.worlds.list();
    const worldById = new Map(worlds.map((world) => [world.id, world]));

    const items = characters.map((character) => {
      const world = worldById.get(character.worldId);
      return toCharacterResult(
        character,
        world
          ? { name: world.name.value, region: world.region }
          : undefined,
      );
    });

    return {
      items,
      limit,
      canCreate: items.length < limit,
    };
  }
}
