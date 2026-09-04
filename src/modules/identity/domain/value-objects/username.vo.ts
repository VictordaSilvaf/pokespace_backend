import { ValueObject } from '../../../../shared/domain/value-object.js';
import { InvalidUsernameError } from '../errors/identity.errors.js';

interface UsernameProps {
  value: string;
}

/**
 * Nome único da conta (trainer). Distingue as até 4 contas do mesmo email/telefone.
 */
export class Username extends ValueObject<UsernameProps> {
  private constructor(props: UsernameProps) {
    super(props);
  }

  static create(raw: string): Username {
    const value = raw.trim().toLowerCase();

    if (!/^[a-z0-9_]{3,20}$/.test(value)) {
      throw new InvalidUsernameError('INVALID_USERNAME_FORMAT');
    }

    return new Username({ value });
  }

  get value(): string {
    return this.props.value;
  }

  toString(): string {
    return this.value;
  }
}
