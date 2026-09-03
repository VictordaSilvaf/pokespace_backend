import { Inject, Injectable } from '@nestjs/common';
import type { UseCase } from '../../../../shared/application/use-case.js';
import {
  EVENT_PUBLISHER,
  type EventPublisher,
} from '../../../../shared/application/ports/event-publisher.port.js';
import type { LogoutCommand } from '../dto/auth.dto.js';
import { SessionRevoker } from '../services/session-revoker.service.js';
import { UserLoggedOutEvent } from '../../domain/events/user-logged-out.event.js';

@Injectable()
export class LogoutUserUseCase implements UseCase<LogoutCommand, void> {
  constructor(
    private readonly sessions: SessionRevoker,
    @Inject(EVENT_PUBLISHER)
    private readonly events: EventPublisher,
  ) {}

  async execute(command: LogoutCommand): Promise<void> {
    await this.sessions.revokeAccessToken(command.accessToken);

    if (command.refreshToken) {
      await this.sessions.revokeRefreshToken(command.refreshToken);
    } else if (command.sessionId) {
      await this.sessions.revokeSession(command.sessionId, command.userId);
    }

    await this.events.publish([new UserLoggedOutEvent(command.userId)]);
  }
}
