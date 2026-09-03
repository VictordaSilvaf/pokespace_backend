import { Inject, Injectable } from '@nestjs/common';
import type { Pool } from 'pg';
import { DATABASE_POOL } from '../../../../shared/infrastructure/database/database.pool.port.js';
import type { User } from '../../domain/entities/user.entity.js';
import type { Email } from '../../domain/value-objects/email.vo.js';
import type { PhoneNumber } from '../../domain/value-objects/phone-number.vo.js';
import type { Username } from '../../domain/value-objects/username.vo.js';
import type { UserRepository } from '../../domain/repositories/user.repository.js';
import {
  mapRowToUser,
  USER_SELECT_COLUMNS,
  type UserRow,
} from './user-row.mapper.js';

@Injectable()
export class PostgresUserRepository implements UserRepository {
  constructor(
    @Inject(DATABASE_POOL)
    private readonly pool: Pool,
  ) {}

  async findById(id: string): Promise<User | null> {
    const result = await this.pool.query<UserRow>(
      `SELECT ${USER_SELECT_COLUMNS} FROM identity_users WHERE id = $1`,
      [id],
    );

    const row = result.rows[0];
    return row ? mapRowToUser(row) : null;
  }

  async findByUsername(username: Username): Promise<User | null> {
    const result = await this.pool.query<UserRow>(
      `SELECT ${USER_SELECT_COLUMNS} FROM identity_users WHERE username = $1`,
      [username.value],
    );

    const row = result.rows[0];
    return row ? mapRowToUser(row) : null;
  }

  async findByEmail(email: Email): Promise<User | null> {
    const result = await this.pool.query<UserRow>(
      `SELECT ${USER_SELECT_COLUMNS} FROM identity_users WHERE email = $1 LIMIT 1`,
      [email.value],
    );

    const row = result.rows[0];
    return row ? mapRowToUser(row) : null;
  }

  async countByEmail(email: Email): Promise<number> {
    const result = await this.pool.query<{ count: string }>(
      'SELECT COUNT(*)::text AS count FROM identity_users WHERE email = $1',
      [email.value],
    );

    return Number(result.rows[0]?.count ?? 0);
  }

  async countByPhone(phone: PhoneNumber): Promise<number> {
    const result = await this.pool.query<{ count: string }>(
      'SELECT COUNT(*)::text AS count FROM identity_users WHERE phone = $1',
      [phone.value],
    );

    return Number(result.rows[0]?.count ?? 0);
  }

  async save(user: User): Promise<void> {
    await this.pool.query(
      `INSERT INTO identity_users (
        id, email, phone, username, password_hash, created_at, updated_at,
        email_verified_at, phone_verified_at, totp_secret, two_factor_enabled, status
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)`,
      [
        user.id,
        user.email.value,
        user.phone.value,
        user.username.value,
        user.passwordHash,
        user.createdAt,
        user.updatedAt,
        user.emailVerifiedAt,
        user.phoneVerifiedAt,
        user.totpSecret,
        user.twoFactorEnabled,
        user.status,
      ],
    );
  }

  async delete(id: string): Promise<void> {
    await this.pool.query('DELETE FROM identity_users WHERE id = $1', [id]);
  }

  async update(user: User): Promise<void> {
    await this.pool.query(
      `UPDATE identity_users
       SET email = $2, phone = $3, password_hash = $4, updated_at = $5,
           email_verified_at = $6, phone_verified_at = $7, totp_secret = $8,
           two_factor_enabled = $9, status = $10
       WHERE id = $1`,
      [
        user.id,
        user.email.value,
        user.phone.value,
        user.passwordHash,
        user.updatedAt,
        user.emailVerifiedAt,
        user.phoneVerifiedAt,
        user.totpSecret,
        user.twoFactorEnabled,
        user.status,
      ],
    );
  }

  async updatePassword(id: string, passwordHash: string): Promise<void> {
    await this.pool.query(
      'UPDATE identity_users SET password_hash = $2, updated_at = NOW() WHERE id = $1',
      [id, passwordHash],
    );
  }
}
