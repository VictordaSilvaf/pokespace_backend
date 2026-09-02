import { DomainEvent } from '../../../../shared/domain/domain-event.js';

export class PasswordResetRequestedEvent extends DomainEvent {
  constructor(
    readonly userId: string,
    readonly email: string,
    readonly username: string,
  ) {
    super('identity.password.reset_requested');
  }
}
