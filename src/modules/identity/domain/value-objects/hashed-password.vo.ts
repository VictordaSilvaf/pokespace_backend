import { ValueObject } from '../../../../shared/domain/value-object.js';
import { InvalidPasswordError } from '../errors/identity.errors.js';

interface HashedPasswordProps {
  hash: string;
}

/**
 * Representa senha já hasheada.
 * A senha em texto puro nunca entra no domínio como value object persistido.
 */
export class HashedPassword extends ValueObject<HashedPasswordProps> {
  private constructor(props: HashedPasswordProps) {
    super(props);
  }

  static fromHash(hash: string): HashedPassword {
    if (!hash || hash.length < 16) {
      throw new InvalidPasswordError('Invalid password hash');
    }

    return new HashedPassword({ hash });
  }

  static assertPlainPasswordStrength(plain: string): void {
    if (plain.length < 8) {
      throw new InvalidPasswordError('Password must be at least 8 characters');
    }
  }

  get hash(): string {
    return this.props.hash;
  }
}
