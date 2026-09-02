import { DomainEvent } from '../../../../shared/domain/domain-event.js';

export class UserLoggedOutEvent extends DomainEvent {
  constructor(readonly userId: string) {
    super('identity.user.logged_out');
  }
}
