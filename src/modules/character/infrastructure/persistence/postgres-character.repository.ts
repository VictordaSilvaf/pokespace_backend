import type { Pool } from 'pg';
import type { Character } from '../../domain/entities/character.entity.js';
import type { CharacterRepository } from '../../domain/repositories/character.repository.js';
import {
  CHARACTER_SELECTED_COLUMNS,
  mapCharacterToRow,
  mapRowToCharacter,
  type CharacterRow,
} from './character-row.mapper.js';

export class PostgresCharacterRepository implements CharacterRepository {
  constructor(private readonly pool: Pool) {}

  async save(character: Character): Promise<void> {
    const row = mapCharacterToRow(character);
    await this.pool.query(
      `
      INSERT INTO characters (
        id, user_id, world_id, display_name, display_name_normalized,
        skin_id, created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      ON CONFLICT (id) DO UPDATE SET
        display_name = EXCLUDED.display_name,
        display_name_normalized = EXCLUDED.display_name_normalized,
        skin_id = EXCLUDED.skin_id,
        updated_at = EXCLUDED.updated_at
      `,
      [
        row.id,
        row.user_id,
        row.world_id,
        row.display_name,
        row.display_name_normalized,
        row.skin_id,
        row.created_at,
        row.updated_at,
      ],
    );
  }

  async findById(characterId: string): Promise<Character | null> {
    const result = await this.pool.query<CharacterRow>(
      `SELECT ${CHARACTER_SELECTED_COLUMNS} FROM characters WHERE id = $1`,
      [characterId],
    );
    const row = result.rows[0];
    return row ? mapRowToCharacter(row) : null;
  }

  async listByUserId(userId: string): Promise<Character[]> {
    const result = await this.pool.query<CharacterRow>(
      `
      SELECT ${CHARACTER_SELECTED_COLUMNS}
      FROM characters
      WHERE user_id = $1
      ORDER BY created_at ASC
      `,
      [userId],
    );
    return result.rows.map(mapRowToCharacter);
  }

  async countByUserId(userId: string): Promise<number> {
    const result = await this.pool.query<{ count: string }>(
      `SELECT COUNT(*)::text AS count FROM characters WHERE user_id = $1`,
      [userId],
    );
    return Number(result.rows[0]?.count ?? 0);
  }

  async existsByUserIdAndDisplayName(
    userId: string,
    normalizedDisplayName: string,
  ): Promise<boolean> {
    const result = await this.pool.query(
      `
      SELECT 1
      FROM characters
      WHERE user_id = $1 AND display_name_normalized = $2
      LIMIT 1
      `,
      [userId, normalizedDisplayName],
    );
    return (result.rowCount ?? 0) > 0;
  }
}
