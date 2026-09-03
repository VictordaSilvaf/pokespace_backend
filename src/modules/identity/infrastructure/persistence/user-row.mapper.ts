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
  updated_at: Date;
  email_verified_at: Date | null;
  phone_verified_at: Date | null;
  totp_secret: string | null;
  two_factor_enabled: boolean;
  status: string;
}

export const USER_SELECT_COLUMNS = `id, email, phone, username, password_hash, created_at, updated_at,
  email_verified_at, phone_verified_at, totp_secret, two_factor_enabled, status`;

export function mapRowToUser(row: UserRow): User {
  return User.rehydrate({
    id: row.id,
    email: Email.create(row.email),
    phone: PhoneNumber.create(row.phone),
    username: Username.create(row.username),
    password: HashedPassword.fromHash(row.password_hash),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    emailVerifiedAt: row.email_verified_at,
    phoneVerifiedAt: row.phone_verified_at,
    totpSecret: row.totp_secret,
    twoFactorEnabled: row.two_factor_enabled,
    status: row.status === 'deactivated' ? 'deactivated' : 'active',
  });
}
