import { ValueObject } from '../../../../shared/domain/value-object.js';
import { InvalidEmailError } from '../errors/identity.errors.js';

interface EmailProps {
  value: string;
}

export class Email extends ValueObject<EmailProps> {
  private constructor(props: EmailProps) {
    super(props);
  }

  static create(raw: string): Email {
    const value = raw.trim().toLowerCase();
    const isValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);

    if (!isValid) {
      throw new InvalidEmailError(raw);
    }

    return new Email({ value });
  }

  get value(): string {
    return this.props.value;
  }

  toString(): string {
    return this.value;
  }
}
