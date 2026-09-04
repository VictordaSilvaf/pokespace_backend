import { Inject, Injectable } from '@nestjs/common';
import type { Pool } from 'pg';
import { DATABASE_POOL } from '../../../../shared/infrastructure/database/database.pool.port.js';
import type { ServerRepository } from '../../domain/repositories/server.repository.js';
import type { Server } from '../../domain/entities/server.entity.js';
import {
  mapRowToServer,
  SERVER_SELECTED_COLUMNS,
  type ServerRow,
} from './server-row.mapper.js';

@Injectable()
export class PostgresServerRepository implements ServerRepository {
  constructor(
    @Inject(DATABASE_POOL)
    private readonly pool: Pool,
  ) {}

  async findById(id: string): Promise<Server | null> {
    const result = await this.pool.query<ServerRow>(
      `SELECT ${SERVER_SELECTED_COLUMNS} FROM servers WHERE id = $1`,
      [id],
    );
    const row = result.rows[0];
    return row ? mapRowToServer(row) : null;
  }

  async list(): Promise<Server[]> {
    const result = await this.pool.query<ServerRow>(
      `SELECT ${SERVER_SELECTED_COLUMNS} FROM servers
       ORDER BY
         CASE status
           WHEN 'online' THEN 0
           WHEN 'maintenance' THEN 1
           WHEN 'offline' THEN 2
           ELSE 3
         END ASC,
         name ASC`,
    );
    return result.rows.map(mapRowToServer);
  }
}