import { Inject, Injectable } from '@nestjs/common';
import type { Pool } from 'pg';
import { DATABASE_POOL } from '../../../../shared/infrastructure/database/database.pool.port.js';
import type { PokemonRepository } from '../../domain/repositories/pokemon.repository.js';
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
}
