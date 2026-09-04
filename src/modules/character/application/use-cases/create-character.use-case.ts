import { Inject, Injectable } from '@nestjs/common';
import type { UseCase } from '../../../../shared/application/use-case.js';
import {
  EVENT_PUBLISHER,
  type EventPublisher,
} from '../../../../shared/application/ports/event-publisher.port.js';
import {
  WORLD_REPOSITORY,
  type WorldRepository,
} from '../../../world/domain/repositories/world.repository.js';
import { Character } from '../../domain/entities/character.entity.js';
import {
  CharacterLimitReachedError,
  DisplayNameTakenError,
  InvalidStarterSkinError,
  WorldNotAvailableError,
} from '../../domain/errors/character.errors.js';
import {
  CHARACTER_REPOSITORY,
  type CharacterRepository,
} from '../../domain/repositories/character.repository.js';
import { DisplayName } from '../../domain/value-objects/display-name.vo.js';
import { SkinId } from '../../domain/value-objects/skin-id.vo.js';
import { findStarterSkin } from '../../infrastructure/catalog/starter-skins.js';
import { getCharacterMaxPerAccount } from '../character.config.js';
import type {
  CharacterResult,
  CreateCharacterCommand,
} from '../dto/character.dto.js';
import { toCharacterResult } from '../dto/character.dto.js';

@Injectable()
export class CreateCharacterUseCase
  implements UseCase<CreateCharacterCommand, CharacterResult>
{
  constructor(
    @Inject(CHARACTER_REPOSITORY)
    private readonly characters: CharacterRepository,
    @Inject(WORLD_REPOSITORY)
    private readonly worlds: WorldRepository,
    @Inject(EVENT_PUBLISHER)
    private readonly events: EventPublisher,
  ) {}

  async execute(command: CreateCharacterCommand): Promise<CharacterResult> {
    const limit = getCharacterMaxPerAccount();
    const count = await this.characters.countByUserId(command.userId);
    if (count >= limit) {
      throw new CharacterLimitReachedError(limit);
    }

    const world = await this.worlds.findById(command.worldId);
    if (!world?.isJoinable()) {
      throw new WorldNotAvailableError(command.worldId);
    }

    const skin = findStarterSkin(command.skinId);
    if (!skin) {
      throw new InvalidStarterSkinError(command.skinId);
    }

    const displayName = DisplayName.create(command.displayName);
    const skinId = SkinId.create(skin.id);

    const taken = await this.characters.existsByUserIdAndDisplayName(
      command.userId,
      displayName.normalized,
    );
    if (taken) {
      throw new DisplayNameTakenError(displayName.value);
    }

    const character = Character.create({
      userId: command.userId,
      worldId: world.id,
      displayName,
      skinId,
    });

    await this.characters.save(character);
    await this.events.publish(character.pullDomainEvents());

    return toCharacterResult(character, {
      name: world.name.value,
      region: world.region,
    });
  }
}
