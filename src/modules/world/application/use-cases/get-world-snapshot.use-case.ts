import { Injectable } from '@nestjs/common';
import type { UseCase } from '../../../../shared/application/use-case.js';
import { InstanceManager } from '../services/instance-manager.service.js';
import { SessionManager } from '../services/session-manager.service.js';
import type { WorldSnapshot } from '../dto/world.dto.js';
import { WorldSessionNotFoundError } from '../../domain/errors/world.errors.js';

@Injectable()
export class GetWorldSnapshotUseCase
  implements UseCase<{ connectionId: string }, WorldSnapshot>
{
  constructor(
    private readonly instances: InstanceManager,
    private readonly sessions: SessionManager,
  ) {}

  async execute(input: { connectionId: string }): Promise<WorldSnapshot> {
    const session = this.sessions.getByConnection(input.connectionId);
    if (!session) {
      throw new WorldSessionNotFoundError(input.connectionId);
    }

    const entities = this.instances
      .getEntities(session.instanceId.value)
      .map((e) => e.toSnapshot());

    return {
      map: { id: session.mapId.value },
      instance: { id: session.instanceId.value },
      selfEntityId: session.entityId,
      entities,
    };
  }
}
