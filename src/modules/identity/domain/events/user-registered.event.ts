import { DomainEvent } from '../../../../shared/domain/domain-event.js';

export class UserRegisteredEvent extends DomainEvent {
  constructor(
    readonly userId: string,
    readonly email: string,
  ) {
    super('identity.user.registered');
  }
}
