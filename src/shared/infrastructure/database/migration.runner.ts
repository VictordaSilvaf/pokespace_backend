import { readdir, readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { Injectable, Logger } from '@nestjs/common';
import type { Pool } from 'pg';

@Injectable()
export class MigrationRunner {
  private readonly logger = new Logger(MigrationRunner.name);

  constructor(private readonly pool: Pool) {}

  async run(): Promise<void> {
    const migrationsDir = join(process.cwd(), 'migrations');
    const files = (await readdir(migrationsDir))
      .filter((file) => file.endsWith('.sql'))
      .sort();

    await this.pool.query(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        id VARCHAR(255) PRIMARY KEY,
        applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);

    for (const file of files) {
      const id = file;
      const applied = await this.pool.query(
        'SELECT 1 FROM schema_migrations WHERE id = $1',
        [id],
      );

      if ((applied.rowCount ?? 0) > 0) {
        continue;
      }

      const sql = await readFile(join(migrationsDir, file), 'utf8');
      const client = await this.pool.connect();

      try {
        await client.query('BEGIN');
        await client.query(sql);
        await client.query(
          'INSERT INTO schema_migrations (id) VALUES ($1)',
          [id],
        );
        await client.query('COMMIT');
        this.logger.log(`applied migration: ${id}`);
      } catch (error) {
        await client.query('ROLLBACK');
        throw error;
      } finally {
        client.release();
      }
    }
  }
}
