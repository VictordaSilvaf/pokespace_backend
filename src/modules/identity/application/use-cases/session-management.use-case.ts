import { Inject, Injectable } from '@nestjs/common';
import type { UseCase } from '../../../../shared/application/use-case.js';
import type {
  ListSessionsQuery,
  LogoutAllCommand,
  RevokeSessionCommand,
  SessionListResult,
} from '../dto/auth.dto.js';
import {
  REFRESH_TOKEN_STORE,
  type RefreshTokenStore,
} from '../ports/refresh-token-store.port.js';
import { SessionRevoker } from '../services/session-revoker.service.js';
import {
  EVENT_PUBLISHER,
  type EventPublisher,
} from '../../../../shared/application/ports/event-publisher.port.js';
import { UserLoggedOutEvent } from '../../domain/events/user-logged-out.event.js';

@Injectable()
export class ListSessionsUseCase
  implements UseCase<ListSessionsQuery, SessionListResult>
{
  constructor(
    @Inject(REFRESH_TOKEN_STORE)
    private readonly refreshStore: RefreshTokenStore,
  ) {}

  async execute(query: ListSessionsQuery): Promise<SessionListResult> {
    const sessions = await this.refreshStore.listSessions(
      query.userId,
      query.currentSessionId,
    );
    return { sessions };
  }
}

@Injectable()
export class RevokeSessionUseCase
  implements UseCase<RevokeSessionCommand, void>
{
  constructor(private readonly sessions: SessionRevoker) {}

  async execute(command: RevokeSessionCommand): Promise<void> {
    await this.sessions.revokeSession(command.sessionId, command.userId);
  }
}

@Injectable()
export class LogoutAllUseCase implements UseCase<LogoutAllCommand, void> {
  constructor(
    private readonly sessions: SessionRevoker,
    @Inject(EVENT_PUBLISHER)
    private readonly events: EventPublisher,
  ) {}

  async execute(command: LogoutAllCommand): Promise<void> {
    await this.sessions.revokeAllForUser(command.userId, command.accessToken);
    await this.events.publish([new UserLoggedOutEvent(command.userId)]);
  }
}
