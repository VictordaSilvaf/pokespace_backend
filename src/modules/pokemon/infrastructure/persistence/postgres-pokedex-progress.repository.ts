import { Inject, Injectable } from '@nestjs/common';
import type { Pool } from 'pg';
import { DATABASE_POOL } from '../../../../shared/infrastructure/database/database.pool.port.js';
import type {
  PokedexProgressEntry,
  PokedexProgressRepository,
} from '../../domain/repositories/pokedex-progress.repository.js';

interface ProgressRow {
  dex_id: number;
  seen_at: Date;
  caught_at: Date | null;
}

@Injectable()
export class PostgresPokedexProgressRepository
  implements PokedexProgressRepository
{
  constructor(
    @Inject(DATABASE_POOL)
    private readonly pool: Pool,
  ) {}

  async listByCharacter(characterId: string): Promise<PokedexProgressEntry[]> {
    const result = await this.pool.query<ProgressRow>(
      `SELECT dex_id, seen_at, caught_at
       FROM character_pokedex_entries
       WHERE character_id = $1
       ORDER BY dex_id ASC`,
      [characterId],
    );
    return result.rows.map((row) => ({
      dexId: row.dex_id,
      seenAt: row.seen_at,
      caughtAt: row.caught_at,
    }));
  }

  async findByCharacterAndDex(
    characterId: string,
    dexId: number,
  ): Promise<PokedexProgressEntry | null> {
    const result = await this.pool.query<ProgressRow>(
      `SELECT dex_id, seen_at, caught_at
       FROM character_pokedex_entries
       WHERE character_id = $1 AND dex_id = $2`,
      [characterId, dexId],
    );
    const row = result.rows[0];
    if (!row) return null;
    return {
      dexId: row.dex_id,
      seenAt: row.seen_at,
      caughtAt: row.caught_at,
    };
  }

  async markSeen(
    characterId: string,
    dexId: number,
    at: Date = new Date(),
  ): Promise<void> {
    await this.pool.query(
      `INSERT INTO character_pokedex_entries (character_id, dex_id, seen_at, caught_at)
       VALUES ($1, $2, $3, NULL)
       ON CONFLICT (character_id, dex_id) DO NOTHING`,
      [characterId, dexId, at],
    );
  }

  async markCaught(
    characterId: string,
    dexId: number,
    at: Date = new Date(),
  ): Promise<void> {
    await this.pool.query(
      `INSERT INTO character_pokedex_entries (character_id, dex_id, seen_at, caught_at)
       VALUES ($1, $2, $3, $3)
       ON CONFLICT (character_id, dex_id) DO UPDATE SET
         caught_at = COALESCE(character_pokedex_entries.caught_at, EXCLUDED.caught_at)`,
      [characterId, dexId, at],
    );
  }
}
