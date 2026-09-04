import { Injectable } from '@nestjs/common';
import type { UseCase } from '../../../../shared/application/use-case.js';
import { InstanceManager } from '../services/instance-manager.service.js';
import { SessionManager } from '../services/session-manager.service.js';
import type { LeaveWorldCommand, LeaveWorldResult } from '../dto/world.dto.js';

@Injectable()
export class LeaveWorldUseCase
  implements UseCase<LeaveWorldCommand, LeaveWorldResult>
{
  constructor(
    private readonly instances: InstanceManager,
    private readonly sessions: SessionManager,
  ) {}

  async execute(command: LeaveWorldCommand): Promise<LeaveWorldResult> {
    const session = this.sessions.removeByConnection(command.connectionId);
    if (!session) {
      return { instanceId: '', entityId: '', despawned: false };
    }

    const removed = this.instances.removeEntity(
      session.instanceId.value,
      session.entityId,
    );

    return {
      instanceId: session.instanceId.value,
      entityId: session.entityId,
      despawned: Boolean(removed),
    };
  }
}
