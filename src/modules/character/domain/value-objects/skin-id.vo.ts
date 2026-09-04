import { ValueObject } from '../../../../shared/domain/value-object.js';
import { InvalidStarterSkinError } from '../errors/character.errors.js';

interface SkinIdProps {
  value: string;
}

export class SkinId extends ValueObject<SkinIdProps> {
  private constructor(props: SkinIdProps) {
    super(props);
  }

  static create(raw: string): SkinId {
    const value = raw.trim();
    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(value) || value.length > 64) {
      throw new InvalidStarterSkinError(raw);
    }
    return new SkinId({ value });
  }

  get value(): string {
    return this.props.value;
  }
}
