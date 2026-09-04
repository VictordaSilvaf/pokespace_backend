import { randomUUID } from 'node:crypto';
import { AggregateRoot } from '../../../../shared/domain/aggregate-root.js';
import { CharacterCreatedEvent } from '../events/character-created.event.js';
import { DisplayName } from '../value-objects/display-name.vo.js';
import { SkinId } from '../value-objects/skin-id.vo.js';

export interface CharacterProps {
  id: string;
  userId: string;
  worldId: string;
  displayName: DisplayName;
  skinId: SkinId;
  createdAt: Date;
  updatedAt: Date;
}

export class Character extends AggregateRoot<string> {
  private constructor(
    id: string,
    private readonly _userId: string,
    private readonly _worldId: string,
    private readonly _displayName: DisplayName,
    private readonly _skinId: SkinId,
    private readonly _createdAt: Date,
    private readonly _updatedAt: Date,
  ) {
    super(id);
  }

  static create(input: {
    userId: string;
    worldId: string;
    displayName: DisplayName;
    skinId: SkinId;
  }): Character {
    const now = new Date();
    const character = new Character(
      randomUUID(),
      input.userId,
      input.worldId,
      input.displayName,
      input.skinId,
      now,
      now,
    );

    character.addDomainEvent(
      new CharacterCreatedEvent(
        character.id,
        character.userId,
        character.worldId,
        character.displayName.value,
        character.skinId.value,
      ),
    );

    return character;
  }

  static rehydrate(props: CharacterProps): Character {
    return new Character(
      props.id,
      props.userId,
      props.worldId,
      props.displayName,
      props.skinId,
      props.createdAt,
      props.updatedAt,
    );
  }

  get userId(): string {
    return this._userId;
  }

  get worldId(): string {
    return this._worldId;
  }

  get displayName(): DisplayName {
    return this._displayName;
  }

  get skinId(): SkinId {
    return this._skinId;
  }

  get createdAt(): Date {
    return this._createdAt;
  }

  get updatedAt(): Date {
    return this._updatedAt;
  }

  belongsTo(userId: string): boolean {
    return this._userId === userId;
  }
}
