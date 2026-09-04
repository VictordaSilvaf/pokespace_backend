import { ValueObject } from '../../../../shared/domain/value-object.js';
import { CharacterDomainError } from '../errors/character.errors.js';

export class CharacterName extends ValueObject<{ value: string }> {
  private constructor(value: string) {
    super({ value });
  }

  static create(raw: string): CharacterName {
    const value = raw.trim();
    if (value.length < 2 || value.length > 16) {
      throw new CharacterDomainError(
        'character name must be between 2 and 16 characters',
      );
    }
    if (!/^[A-Za-z0-9_]+$/.test(value)) {
      throw new CharacterDomainError(
        'character name may only contain letters, numbers, and underscore',
      );
    }
    return new CharacterName(value);
  }

  get value(): string {
    return this.props.value;
  }
}
