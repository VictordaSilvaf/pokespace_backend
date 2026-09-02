import { DomainEvent } from '../../../../shared/domain/domain-event.js';

export class PasswordChangedEvent extends DomainEvent {
  constructor(readonly userId: string) {
    super('identity.password.changed');
  }
}
