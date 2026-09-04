import { Inject, Injectable } from '@nestjs/common';
import type { Pool } from 'pg';
import { DATABASE_POOL } from '../../../../shared/infrastructure/database/database.pool.port.js';
import type { CharacterRepository } from '../../domain/repositories/character.repository.js';
import type { Character } from '../../domain/entities/character.entity.js';
import {
  CHARACTER_SELECTED_COLUMNS,
  mapRowToCharacter,
  type CharacterRow,
} from './character-row.mapper.js';

@Injectable()
export class PostgresCharacterRepository implements CharacterRepository {
  constructor(
    @Inject(DATABASE_POOL)
    private readonly pool: Pool,
  ) {}

  async save(character: Character): Promise<void> {
    await this.pool.query(
      `INSERT INTO characters (id, account_id, server_id, name, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6)
       ON CONFLICT (id) DO UPDATE SET
         name = EXCLUDED.name,
         updated_at = EXCLUDED.updated_at`,
      [
        character.id,
        character.accountId,
        character.serverId,
        character.name.value,
        character.createdAt,
        character.updatedAt,
      ],
    );
  }

  async findById(id: string): Promise<Character | null> {
    const result = await this.pool.query<CharacterRow>(
      `SELECT ${CHARACTER_SELECTED_COLUMNS} FROM characters WHERE id = $1`,
      [id],
    );
    const row = result.rows[0];
    return row ? mapRowToCharacter(row) : null;
  }

  async countByAccountId(accountId: string): Promise<number> {
    const result = await this.pool.query<{ count: string }>(
      `SELECT COUNT(*)::text AS count FROM characters WHERE account_id = $1`,
      [accountId],
    );
    return Number(result.rows[0]?.count ?? 0);
  }

  async existsByServerAndName(
    serverId: string,
    name: string,
  ): Promise<boolean> {
    const result = await this.pool.query(
      `SELECT 1 FROM characters
       WHERE server_id = $1 AND LOWER(name) = LOWER($2)
       LIMIT 1`,
      [serverId, name],
    );
    return (result.rowCount ?? 0) > 0;
  }

  async listByAccountId(accountId: string): Promise<Character[]> {
    const result = await this.pool.query<CharacterRow>(
      `SELECT ${CHARACTER_SELECTED_COLUMNS} FROM characters
       WHERE account_id = $1
       ORDER BY created_at ASC`,
      [accountId],
    );
    return result.rows.map(mapRowToCharacter);
  }
}
