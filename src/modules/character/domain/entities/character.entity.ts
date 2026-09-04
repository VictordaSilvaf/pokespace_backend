import { randomUUID } from 'node:crypto';
import { AggregateRoot } from '../../../../shared/domain/aggregate-root.js';
import type { CharacterName } from '../value-objects/character-name.vo.js';
import { CharacterCreatedEvent } from '../events/character-created.event.js';

export interface CharacterProps {
  id: string;
  accountId: string;
  serverId: string;
  name: CharacterName;
  createdAt: Date;
  updatedAt: Date;
}

export class Character extends AggregateRoot<string> {
  private constructor(
    id: string,
    private readonly _accountId: string,
    private readonly _serverId: string,
    private readonly _name: CharacterName,
    private readonly _createdAt: Date,
    private _updatedAt: Date,
  ) {
    super(id);
  }

  static create(
    accountId: string,
    serverId: string,
    name: CharacterName,
  ): Character {
    const now = new Date();
    const character = new Character(
      randomUUID(),
      accountId,
      serverId,
      name,
      now,
      now,
    );
    character.addDomainEvent(
      new CharacterCreatedEvent(character.id, accountId, serverId, name.value),
    );
    return character;
  }

  static rehydrate(props: CharacterProps): Character {
    return new Character(
      props.id,
      props.accountId,
      props.serverId,
      props.name,
      props.createdAt,
      props.updatedAt,
    );
  }

  get accountId(): string {
    return this._accountId;
  }

  get serverId(): string {
    return this._serverId;
  }

  get name(): CharacterName {
    return this._name;
  }

  get createdAt(): Date {
    return this._createdAt;
  }

  get updatedAt(): Date {
    return this._updatedAt;
  }
}
