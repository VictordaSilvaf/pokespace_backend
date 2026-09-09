import { Injectable } from '@nestjs/common';
import type { PokemonRepository } from '../../domain/repositories/pokemon.repository.js';
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
}
