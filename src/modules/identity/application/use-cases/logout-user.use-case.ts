import { Inject, Injectable } from '@nestjs/common';
import type { UseCase } from '../../../../shared/application/use-case.js';
import {
  EVENT_PUBLISHER,
  type EventPublisher,
} from '../../../../shared/application/ports/event-publisher.port.js';
import type { LogoutCommand } from '../dto/auth.dto.js';
import { getAuthTokenTtlSeconds } from '../auth.config.js';
import {
  TOKEN_DENYLIST,
  type TokenDenylist,
} from '../ports/token-denylist.port.js';
import { UserLoggedOutEvent } from '../../domain/events/user-logged-out.event.js';

@Injectable()
export class LogoutUserUseCase implements UseCase<LogoutCommand, void> {
  constructor(
    @Inject(TOKEN_DENYLIST)
    private readonly denylist: TokenDenylist,
    @Inject(EVENT_PUBLISHER)
    private readonly events: EventPublisher,
  ) {}

  async execute(command: LogoutCommand): Promise<void> {
    await this.denylist.revoke(command.accessToken, getAuthTokenTtlSeconds());
    await this.events.publish([new UserLoggedOutEvent(command.userId)]);
  }
}
