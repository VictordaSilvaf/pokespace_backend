import { Inject, Injectable } from '@nestjs/common';
import type { UseCase } from '../../../../shared/application/use-case.js';
import {
  WORLD_REPOSITORY,
  type WorldRepository,
} from '../../../world/domain/repositories/world.repository.js';
import { CharacterNotFoundError } from '../../domain/errors/character.errors.js';
import {
  CHARACTER_REPOSITORY,
  type CharacterRepository,
} from '../../domain/repositories/character.repository.js';
import type {
  CharacterResult,
  GetCharacterQuery,
} from '../dto/character.dto.js';
import { toCharacterResult } from '../dto/character.dto.js';

@Injectable()
export class GetCharacterUseCase
  implements UseCase<GetCharacterQuery, CharacterResult>
{
  constructor(
    @Inject(CHARACTER_REPOSITORY)
    private readonly characters: CharacterRepository,
    @Inject(WORLD_REPOSITORY)
    private readonly worlds: WorldRepository,
  ) {}

  async execute(query: GetCharacterQuery): Promise<CharacterResult> {
    const character = await this.characters.findById(query.characterId);
    if (!character || !character.belongsTo(query.userId)) {
      throw new CharacterNotFoundError(query.characterId);
    }

    const world = await this.worlds.findById(character.worldId);
    return toCharacterResult(
      character,
      world ? { name: world.name.value, region: world.region } : undefined,
    );
  }
}
