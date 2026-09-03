import type { User } from '../entities/user.entity.js';
import type { Email } from '../value-objects/email.vo.js';
import type { PhoneNumber } from '../value-objects/phone-number.vo.js';
import type { Username } from '../value-objects/username.vo.js';

export const USER_REPOSITORY = Symbol('USER_REPOSITORY');

export interface UserRepository {
  findById(id: string): Promise<User | null>;
  findByUsername(username: Username): Promise<User | null>;
  findByEmail(email: Email): Promise<User | null>;
  countByEmail(email: Email): Promise<number>;
  countByPhone(phone: PhoneNumber): Promise<number>;
  save(user: User): Promise<void>;
  delete(id: string): Promise<void>;
  update(user: User): Promise<void>;
  updatePassword(id: string, passwordHash: string): Promise<void>;
}
