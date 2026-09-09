import { Inject, Injectable } from '@nestjs/common';
import type { UseCase } from '../../../../shared/application/use-case.js';
import {
  CHARACTER_REPOSITORY,
  type CharacterRepository,
} from '../../domain/repositories/character.repository.js';
import { CharacterWorldState } from '../../domain/value-objects/character-world-state.vo.js';
import type { FacingDirection } from '../../domain/value-objects/character-world-state.vo.js';
import {
  CharacterAccessDeniedError,
  CharacterNotFoundError,
} from '../../domain/errors/character.errors.js';

export interface SaveCharacterWorldStateCommand {
  characterId: string;
  accountId: string;
  mapId: string;
  x: number;
  y: number;
  z: number;
  direction: FacingDirection;
}

@Injectable()
export class SaveCharacterWorldStateUseCase
  implements UseCase<SaveCharacterWorldStateCommand, void>
{
  constructor(
    @Inject(CHARACTER_REPOSITORY)
    private readonly characters: CharacterRepository,
  ) {}

  async execute(command: SaveCharacterWorldStateCommand): Promise<void> {
    const character = await this.characters.findById(command.characterId);
    if (!character) {
      throw new CharacterNotFoundError(command.characterId);
    }
    if (character.accountId !== command.accountId) {
      throw new CharacterAccessDeniedError();
    }

    character.updateWorldState(
      CharacterWorldState.create({
        mapId: command.mapId,
        x: command.x,
        y: command.y,
        z: command.z,
        direction: command.direction,
      }),
    );
    await this.characters.save(character);
  }
}
