import { Injectable } from '@nestjs/common';
import type {
  PokedexProgressEntry,
  PokedexProgressRepository,
} from '../../domain/repositories/pokedex-progress.repository.js';

@Injectable()
export class InMemoryPokedexProgressRepository
  implements PokedexProgressRepository
{
  private readonly entries = new Map<string, PokedexProgressEntry>();

  private key(characterId: string, dexId: number): string {
    return `${characterId}:${dexId}`;
  }

  async listByCharacter(characterId: string): Promise<PokedexProgressEntry[]> {
    const prefix = `${characterId}:`;
    return [...this.entries.entries()]
      .filter(([k]) => k.startsWith(prefix))
      .map(([, v]) => ({ ...v }))
      .sort((a, b) => a.dexId - b.dexId);
  }

  async findByCharacterAndDex(
    characterId: string,
    dexId: number,
  ): Promise<PokedexProgressEntry | null> {
    const entry = this.entries.get(this.key(characterId, dexId));
    return entry ? { ...entry } : null;
  }

  async markSeen(
    characterId: string,
    dexId: number,
    at: Date = new Date(),
  ): Promise<void> {
    const key = this.key(characterId, dexId);
    if (this.entries.has(key)) {
      return;
    }
    this.entries.set(key, { dexId, seenAt: at, caughtAt: null });
  }

  async markCaught(
    characterId: string,
    dexId: number,
    at: Date = new Date(),
  ): Promise<void> {
    const key = this.key(characterId, dexId);
    const existing = this.entries.get(key);
    if (existing) {
      if (!existing.caughtAt) {
        existing.caughtAt = at;
      }
      return;
    }
    this.entries.set(key, { dexId, seenAt: at, caughtAt: at });
  }
}
