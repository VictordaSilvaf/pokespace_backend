import { ValueObject } from '../../../../shared/domain/value-object.js';
import { InvalidCharacterNameError } from '../errors/character.errors.js';

export class CharacterName extends ValueObject<{ value: string }> {
  private constructor(value: string) {
    super({ value });
  }

  static create(raw: string): CharacterName {
    const value = raw.trim();
    if (value.length < 2 || value.length > 16) {
      throw new InvalidCharacterNameError('INVALID_CHARACTER_NAME');
    }
    if (!/^[A-Za-z0-9_]+$/.test(value)) {
      throw new InvalidCharacterNameError('INVALID_CHARACTER_NAME_FORMAT');
    }
    return new CharacterName(value);
  }

  get value(): string {
    return this.props.value;
  }
}
