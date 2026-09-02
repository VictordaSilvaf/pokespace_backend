import { DomainEvent } from '../../../../shared/domain/domain-event.js';

export class PasswordResetCompletedEvent extends DomainEvent {
  constructor(readonly userId: string) {
    super('identity.password.reset_completed');
  }
}
