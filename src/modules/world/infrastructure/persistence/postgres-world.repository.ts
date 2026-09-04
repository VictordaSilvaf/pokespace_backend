import { Inject, Injectable } from '@nestjs/common';
import type { Pool } from 'pg';
import { DATABASE_POOL } from '../../../../shared/infrastructure/database/database.pool.port.js';
import type { WorldRepository } from '../../domain/repositories/world.repository.js';
import type { World } from '../../domain/entities/world.entity.js';
import {
  mapRowToWorld,
  WORLD_SELECTED_COLUMNS,
  type WorldRow,
} from './world-row.mapper.js';

@Injectable()
export class PostgresWorldRepository implements WorldRepository {
  constructor(
    @Inject(DATABASE_POOL)
    private readonly pool: Pool,
  ) {}

  async findById(id: string): Promise<World | null> {
    const result = await this.pool.query<WorldRow>(
      `SELECT ${WORLD_SELECTED_COLUMNS} FROM worlds WHERE id = $1`,
      [id],
    );
    const row = result.rows[0];
    return row ? mapRowToWorld(row) : null;
  }

  async list(): Promise<World[]> {
    const result = await this.pool.query<WorldRow>(
      `SELECT ${WORLD_SELECTED_COLUMNS} FROM worlds
       ORDER BY
         CASE status
           WHEN 'online' THEN 0
           WHEN 'maintenance' THEN 1
           WHEN 'offline' THEN 2
           ELSE 3
         END ASC,
         name ASC`,
    );
    return result.rows.map(mapRowToWorld);
  }
}