import { randomBytes, scrypt as scryptCallback, timingSafeEqual } from 'node:crypto';
import { promisify } from 'node:util';
import { Injectable } from '@nestjs/common';
import type { PasswordHasher } from '../../application/ports/password-hasher.port.js';

const scrypt = promisify(scryptCallback);

/**
 * Adapter de desenvolvimento com scrypt (Node crypto).
 * Pode ser trocado por bcrypt/argon2 sem alterar use cases.
 */
@Injectable()
export class ScryptPasswordHasher implements PasswordHasher {
  private readonly keyLength = 64;

  async hash(plainPassword: string): Promise<string> {
    const salt = randomBytes(16).toString('hex');
    const derived = (await scrypt(plainPassword, salt, this.keyLength)) as Buffer;
    return `${salt}:${derived.toString('hex')}`;
  }

  async compare(plainPassword: string, hash: string): Promise<boolean> {
    const [salt, stored] = hash.split(':');
    if (!salt || !stored) {
      return false;
    }

    const derived = (await scrypt(plainPassword, salt, this.keyLength)) as Buffer;
    const storedBuffer = Buffer.from(stored, 'hex');

    if (derived.length !== storedBuffer.length) {
      return false;
    }

    return timingSafeEqual(derived, storedBuffer);
  }
}
