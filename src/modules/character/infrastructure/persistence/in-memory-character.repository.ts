import { Injectable } from '@nestjs/common';
import type { CharacterRepository } from '../../domain/repositories/character.repository.js';
import type { Character } from '../../domain/entities/character.entity.js';

@Injectable()
export class InMemoryCharacterRepository implements CharacterRepository {
  private readonly byId = new Map<string, Character>();

  async save(character: Character): Promise<void> {
    this.byId.set(character.id, character);
  }

  async findById(id: string): Promise<Character | null> {
    return this.byId.get(id) ?? null;
  }

  async countByAccountId(accountId: string): Promise<number> {
    return [...this.byId.values()].filter((c) => c.accountId === accountId)
      .length;
  }

  async existsByServerAndName(
    serverId: string,
    name: string,
  ): Promise<boolean> {
    const normalized = name.toLowerCase();
    return [...this.byId.values()].some(
      (c) =>
        c.serverId === serverId &&
        c.name.value.toLowerCase() === normalized,
    );
  }

  async listByAccountId(accountId: string): Promise<Character[]> {
    return [...this.byId.values()].filter((c) => c.accountId === accountId);
  }
}
