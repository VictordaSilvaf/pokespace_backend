import { DomainEvent } from '../../../../shared/domain/domain-event.js';

export class CharacterCreatedEvent extends DomainEvent {
  constructor(
    readonly characterId: string,
    readonly userId: string,
    readonly worldId: string,
    readonly displayName: string,
    readonly skinId: string,
  ) {
    super('player.character.created');
  }
}
