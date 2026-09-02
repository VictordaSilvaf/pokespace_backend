import { User } from '../../domain/entities/user.entity.js';
import { Email } from '../../domain/value-objects/email.vo.js';
import { PhoneNumber } from '../../domain/value-objects/phone-number.vo.js';
import { Username } from '../../domain/value-objects/username.vo.js';
import { HashedPassword } from '../../domain/value-objects/hashed-password.vo.js';

export interface UserRow {
  id: string;
  email: string;
  phone: string;
  username: string;
  password_hash: string;
  created_at: Date;
}

export function mapRowToUser(row: UserRow): User {
  return User.rehydrate({
    id: row.id,
    email: Email.create(row.email),
    phone: PhoneNumber.create(row.phone),
    username: Username.create(row.username),
    password: HashedPassword.fromHash(row.password_hash),
    createdAt: row.created_at,
  });
}
