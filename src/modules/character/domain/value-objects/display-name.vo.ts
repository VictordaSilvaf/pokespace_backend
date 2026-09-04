import { ValueObject } from '../../../../shared/domain/value-object.js';
import { InvalidDisplayNameError } from '../errors/character.errors.js';

interface DisplayNameProps {
  value: string;
}

export class DisplayName extends ValueObject<DisplayNameProps> {
  private constructor(props: DisplayNameProps) {
    super(props);
  }

  static create(raw: string): DisplayName {
    const value = raw.trim().replace(/\s+/g, ' ');

    if (!/^[\p{L}\p{N}_ ]{3,16}$/u.test(value)) {
      throw new InvalidDisplayNameError('INVALID_DISPLAY_NAME_FORMAT');
    }

    return new DisplayName({ value });
  }

  get value(): string {
    return this.props.value;
  }

  get normalized(): string {
    return this.value.toLowerCase();
  }
}
