import { Inject, Injectable } from '@nestjs/common';
import type { UseCase } from '../../../../shared/application/use-case.js';
import {
  CHARACTER_REPOSITORY,
  type CharacterRepository,
} from '../../domain/repositories/character.repository.js';
import {
  CharacterAccessDeniedError,
  CharacterNotFoundError,
} from '../../domain/errors/character.errors.js';

export interface GetCharacterQuery {
  characterId: string;
  accountId: string;
}

export interface CharacterResult {
  id: string;
  name: string;
  serverId: string;
  accountId: string;
}

@Injectable()
export class GetCharacterForAccountUseCase
  implements UseCase<GetCharacterQuery, CharacterResult>
{
  constructor(
    @Inject(CHARACTER_REPOSITORY)
    private readonly characters: CharacterRepository,
  ) {}

  async execute(query: GetCharacterQuery): Promise<CharacterResult> {
    const character = await this.characters.findById(query.characterId);
    if (!character) {
      throw new CharacterNotFoundError(query.characterId);
    }
    if (character.accountId !== query.accountId) {
      throw new CharacterAccessDeniedError();
    }
    return {
      id: character.id,
      name: character.name.value,
      serverId: character.serverId,
      accountId: character.accountId,
    };
  }
}
