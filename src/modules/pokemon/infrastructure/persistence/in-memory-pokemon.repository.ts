import { Injectable } from '@nestjs/common';
import type {
  ListPokemonPage,
  ListPokemonQuery,
  PokemonRepository,
} from '../../domain/repositories/pokemon.repository.js';
import type { Pokemon } from '../../domain/entities/pokemon.entity.js';
import type { DexId } from '../../domain/value-objects/dex-id.vo.js';
import { createSeedPokemon } from './seed-pokemon.js';

@Injectable()
export class InMemoryPokemonRepository implements PokemonRepository {
  private readonly byDexId = new Map<number, Pokemon>();

  constructor() {
    for (const pokemon of createSeedPokemon()) {
      this.byDexId.set(pokemon.dexId.value, pokemon);
    }
  }

  async findByDexId(dexId: DexId): Promise<Pokemon | null> {
    return this.byDexId.get(dexId.value) ?? null;
  }

  async listActive(): Promise<Pokemon[]> {
    return [...this.byDexId.values()]
      .filter((p) => p.status.isActive())
      .sort((a, b) => a.dexId.value - b.dexId.value);
  }

  async countActive(): Promise<number> {
    return (await this.listActive()).length;
  }

  async listActivePage(query: ListPokemonQuery): Promise<ListPokemonPage> {
    let items = await this.listActive();
    if (query.q?.trim()) {
      const q = query.q.trim().toLowerCase();
      items = items.filter((p) => p.name.toLowerCase().includes(q));
    }
    if (query.type?.trim()) {
      const type = query.type.trim().toLowerCase();
      items = items.filter((p) => p.types.some((t) => t.value === type));
    }
    const total = items.length;
    const page = items.slice(query.offset, query.offset + query.limit);
    return { items: page, total };
  }
}
