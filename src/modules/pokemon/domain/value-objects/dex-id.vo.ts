import { ValueObject } from '../../../../shared/domain/value-object.js';
import { InvalidDexIdError } from '../errors/pokemon.errors.js';

export class DexId extends ValueObject<{ value: number }> {
  private constructor(value: number) {
    super({ value });
  }

  static create(raw: number): DexId {
    if (!Number.isInteger(raw) || raw < 1) {
      throw new InvalidDexIdError(raw);
    }
    return new DexId(raw);
  }

  get value(): number {
    return this.props.value;
  }
}
