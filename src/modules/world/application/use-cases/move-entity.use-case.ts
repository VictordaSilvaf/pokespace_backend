import { Inject, Injectable } from '@nestjs/common';
import type { UseCase } from '../../../../shared/application/use-case.js';
import {
  WORLD_MAP_REPOSITORY,
  type WorldMapRepository,
} from '../../domain/repositories/world-map.repository.js';
import {
  DEFAULT_PLAYER_MOVEMENT,
  DIRECTION_DELTA,
} from '../../domain/value-objects/movement.js';
import { GridNavigationService } from '../../domain/services/navigation.service.js';
import { InstanceManager } from '../services/instance-manager.service.js';
import { SessionManager } from '../services/session-manager.service.js';
import type { MoveEntityCommand, MoveEntityResult } from '../dto/world.dto.js';
import {
  InvalidSequenceError,
  MovementBlockedError,
  WorldSessionNotFoundError,
} from '../../domain/errors/world.errors.js';

@Injectable()
export class MoveEntityUseCase
  implements UseCase<MoveEntityCommand, MoveEntityResult>
{
  private readonly navigation = new GridNavigationService();

  constructor(
    @Inject(WORLD_MAP_REPOSITORY)
    private readonly maps: WorldMapRepository,
    private readonly instances: InstanceManager,
    private readonly sessions: SessionManager,
  ) {}

  async execute(command: MoveEntityCommand): Promise<MoveEntityResult> {
    const session = this.sessions.getByConnection(command.connectionId);
    if (!session) {
      throw new WorldSessionNotFoundError(command.connectionId);
    }

    if (!session.acceptSequence(command.sequence)) {
      throw new InvalidSequenceError(command.sequence, session.lastSequence);
    }

    const map = await this.maps.getById(session.mapId);
    if (!map) {
      return { accepted: false, reason: 'map_not_found' };
    }

    const delta = DIRECTION_DELTA[command.direction];
    const current = session.position;
    const target = current.offset(
      delta.dx * DEFAULT_PLAYER_MOVEMENT.stepSize,
      delta.dy * DEFAULT_PLAYER_MOVEMENT.stepSize,
    );

    if (
      !this.navigation.canMove(map, current, target, DEFAULT_PLAYER_MOVEMENT)
    ) {
      throw new MovementBlockedError();
    }

    const instance = this.instances.getInstance(session.instanceId.value);
    if (!instance) {
      return { accepted: false, reason: 'instance_not_found' };
    }

    if (instance.isOccupied(target)) {
      throw new MovementBlockedError();
    }

    const entity = instance.moveEntity(session.entityId, target);
    session.position = target;

    return {
      accepted: true,
      entityId: entity.id,
      position: target.toJSON(),
      sequence: session.lastSequence,
      instanceId: session.instanceId.value,
    };
  }
}
