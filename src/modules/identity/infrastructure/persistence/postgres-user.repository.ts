import { Inject, Injectable } from '@nestjs/common';
import type { Pool } from 'pg';
import { DATABASE_POOL } from '../../../../shared/infrastructure/database/database.pool.port.js';
import type { User } from '../../domain/entities/user.entity.js';
import type { Email } from '../../domain/value-objects/email.vo.js';
import type { PhoneNumber } from '../../domain/value-objects/phone-number.vo.js';
import type { Username } from '../../domain/value-objects/username.vo.js';
import type { UserRepository } from '../../domain/repositories/user.repository.js';
import { mapRowToUser, type UserRow } from './user-row.mapper.js';

@Injectable()
export class PostgresUserRepository implements UserRepository {
  constructor(
    @Inject(DATABASE_POOL)
    private readonly pool: Pool,
  ) {}

  async findById(id: string): Promise<User | null> {
    const result = await this.pool.query<UserRow>(
      `SELECT id, email, phone, username, password_hash, created_at
       FROM identity_users
       WHERE id = $1`,
      [id],
    );

    const row = result.rows[0];
    return row ? mapRowToUser(row) : null;
  }

  async findByUsername(username: Username): Promise<User | null> {
    const result = await this.pool.query<UserRow>(
      `SELECT id, email, phone, username, password_hash, created_at
       FROM identity_users
       WHERE username = $1`,
      [username.value],
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
      `INSERT INTO identity_users (id, email, phone, username, password_hash, created_at)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [
        user.id,
        user.email.value,
        user.phone.value,
        user.username.value,
        user.passwordHash,
        user.createdAt,
      ],
    );
  }

  async delete(id: string): Promise<void> {
    await this.pool.query('DELETE FROM identity_users WHERE id = $1', [id]);
  }

  async update(user: User): Promise<void> {
    await this.pool.query(
      `UPDATE identity_users
       SET email = $2, phone = $3, username = $4, password_hash = $5
       WHERE id = $1`,
      [
        user.id,
        user.email.value,
        user.phone.value,
        user.username.value,
        user.passwordHash,
      ],
    );
  }

  async updatePassword(id: string, passwordHash: string): Promise<void> {
    await this.pool.query(
      'UPDATE identity_users SET password_hash = $2 WHERE id = $1',
      [id, passwordHash],
    );
  }
}
