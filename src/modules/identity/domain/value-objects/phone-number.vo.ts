import { ValueObject } from '../../../../shared/domain/value-object.js';
import { InvalidPhoneError } from '../errors/identity.errors.js';

interface PhoneNumberProps {
  value: string;
}

/**
 * Telefone normalizado (somente dígitos).
 * Aceita 10–15 dígitos (nacional / E.164 sem +).
 */
export class PhoneNumber extends ValueObject<PhoneNumberProps> {
  private constructor(props: PhoneNumberProps) {
    super(props);
  }

  static create(raw: string): PhoneNumber {
    const value = raw.replace(/\D/g, '');

    if (value.length < 10 || value.length > 15) {
      throw new InvalidPhoneError(raw);
    }

    return new PhoneNumber({ value });
  }

  get value(): string {
    return this.props.value;
  }

  toString(): string {
    return this.value;
  }
}
