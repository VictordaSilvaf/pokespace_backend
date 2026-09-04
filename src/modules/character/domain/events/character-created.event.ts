import { DomainEvent } from '../../../../shared/domain/domain-event.js';

export class CharacterCreatedEvent extends DomainEvent {
  constructor(
    readonly characterId: string,
    readonly accountId: string,
    readonly serverId: string,
    readonly name: string,
  ) {
    super('character.created');
  }
}
