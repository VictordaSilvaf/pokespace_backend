import { Inject, Injectable } from '@nestjs/common';
import type { Pool } from 'pg';
import { DATABASE_POOL } from '../../../../shared/infrastructure/database/database.pool.port.js';
import type {
  ListPokemonPage,
  ListPokemonQuery,
  PokemonRepository,
} from '../../domain/repositories/pokemon.repository.js';
import type { Pokemon } from '../../domain/entities/pokemon.entity.js';
import type { DexId } from '../../domain/value-objects/dex-id.vo.js';
import {
  mapRowToPokemon,
  POKEMON_SELECTED_COLUMNS,
  type PokemonRow,
} from './pokemon-row.mapper.js';

@Injectable()
export class PostgresPokemonRepository implements PokemonRepository {
  constructor(
    @Inject(DATABASE_POOL)
    private readonly pool: Pool,
  ) {}

  async findByDexId(dexId: DexId): Promise<Pokemon | null> {
    const result = await this.pool.query<PokemonRow>(
      `SELECT ${POKEMON_SELECTED_COLUMNS} FROM pokemon WHERE dex_id = $1`,
      [dexId.value],
    );
    const row = result.rows[0];
    return row ? mapRowToPokemon(row) : null;
  }

  async listActive(): Promise<Pokemon[]> {
    const result = await this.pool.query<PokemonRow>(
      `SELECT ${POKEMON_SELECTED_COLUMNS} FROM pokemon
       WHERE status = 'active'
       ORDER BY dex_id ASC`,
    );
    return result.rows.map(mapRowToPokemon);
  }

  async countActive(): Promise<number> {
    const result = await this.pool.query<{ count: string }>(
      `SELECT COUNT(*)::text AS count FROM pokemon WHERE status = 'active'`,
    );
    return Number(result.rows[0]?.count ?? 0);
  }

  async listActivePage(query: ListPokemonQuery): Promise<ListPokemonPage> {
    const where: string[] = [`status = 'active'`];
    const params: unknown[] = [];

    if (query.q?.trim()) {
      params.push(`%${query.q.trim().toLowerCase()}%`);
      where.push(`LOWER(name) LIKE $${params.length}`);
    }
    if (query.type?.trim()) {
      params.push(query.type.trim().toLowerCase());
      where.push(`$${params.length} = ANY(types)`);
    }

    const whereSql = where.join(' AND ');
    const countResult = await this.pool.query<{ count: string }>(
      `SELECT COUNT(*)::text AS count FROM pokemon WHERE ${whereSql}`,
      params,
    );
    const total = Number(countResult.rows[0]?.count ?? 0);

    params.push(query.limit);
    const limitIdx = params.length;
    params.push(query.offset);
    const offsetIdx = params.length;

    const result = await this.pool.query<PokemonRow>(
      `SELECT ${POKEMON_SELECTED_COLUMNS} FROM pokemon
       WHERE ${whereSql}
       ORDER BY dex_id ASC
       LIMIT $${limitIdx} OFFSET $${offsetIdx}`,
      params,
    );

    return { items: result.rows.map(mapRowToPokemon), total };
  }
}
