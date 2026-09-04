import { Inject, Injectable } from '@nestjs/common';
import type { UseCase } from '../../../../shared/application/use-case.js';
import {
  CHARACTER_REPOSITORY,
  type CharacterRepository,
} from '../../domain/repositories/character.repository.js';
import { CharacterName } from '../../domain/value-objects/character-name.vo.js';
import { Character } from '../../domain/entities/character.entity.js';
import { MAX_CHARACTERS_PER_ACCOUNT } from '../../domain/account-limits.js';
import {
  CharacterLimitReachedError,
  CharacterNameTakenError,
  ServerNotJoinableError,
} from '../../domain/errors/character.errors.js';
import {
  SERVER_REPOSITORY,
  type ServerRepository,
} from '../../../servers/domain/repositories/server.repository.js';
import { ResolveLaboratorySpawnUseCase } from '../../../world/application/use-cases/resolve-laboratory-spawn.use-case.js';
import {
  EVENT_PUBLISHER,
  type EventPublisher,
} from '../../../../shared/application/ports/event-publisher.port.js';

export interface CreateCharacterCommand {
  accountId: string;
  serverId: string;
  name: string;
}

export interface CreateCharacterResult {
  character: {
    id: string;
    name: string;
    serverId: string;
  };
  spawn: {
    mapId: string;
    instanceId: string;
    position: { x: number; y: number; z: number };
  };
}

@Injectable()
export class CreateCharacterUseCase
  implements UseCase<CreateCharacterCommand, CreateCharacterResult>
{
  constructor(
    @Inject(CHARACTER_REPOSITORY)
    private readonly characters: CharacterRepository,
    @Inject(SERVER_REPOSITORY)
    private readonly servers: ServerRepository,
    private readonly resolveSpawn: ResolveLaboratorySpawnUseCase,
    @Inject(EVENT_PUBLISHER)
    private readonly events: EventPublisher,
  ) {}

  async execute(
    command: CreateCharacterCommand,
  ): Promise<CreateCharacterResult> {
    const server = await this.servers.findById(command.serverId);
    if (!server || !server.isJoinable()) {
      throw new ServerNotJoinableError(command.serverId);
    }

    const count = await this.characters.countByAccountId(command.accountId);
    if (count >= MAX_CHARACTERS_PER_ACCOUNT) {
      throw new CharacterLimitReachedError(command.accountId);
    }

    const name = CharacterName.create(command.name);
    const taken = await this.characters.existsByServerAndName(
      command.serverId,
      name.value,
    );
    if (taken) {
      throw new CharacterNameTakenError(name.value, command.serverId);
    }

    const character = Character.create(
      command.accountId,
      command.serverId,
      name,
    );
    await this.characters.save(character);

    await this.events.publish(character.pullDomainEvents());

    const spawn = await this.resolveSpawn.execute({});

    return {
      character: {
        id: character.id,
        name: character.name.value,
        serverId: character.serverId,
      },
      spawn,
    };
  }
}
