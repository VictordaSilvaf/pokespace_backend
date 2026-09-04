import type { Character } from '../../domain/entities/character.entity.js';
import type { CharacterRepository } from '../../domain/repositories/character.repository.js';

export class InMemoryCharacterRepository implements CharacterRepository {
  private readonly characters = new Map<string, Character>();

  async save(character: Character): Promise<void> {
    this.characters.set(character.id, character);
  }

  async findById(characterId: string): Promise<Character | null> {
    return this.characters.get(characterId) ?? null;
  }

  async listByUserId(userId: string): Promise<Character[]> {
    return [...this.characters.values()]
      .filter((character) => character.userId === userId)
      .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
  }

  async countByUserId(userId: string): Promise<number> {
    return [...this.characters.values()].filter(
      (character) => character.userId === userId,
    ).length;
  }

  async existsByUserIdAndDisplayName(
    userId: string,
    normalizedDisplayName: string,
  ): Promise<boolean> {
    return [...this.characters.values()].some(
      (character) =>
        character.userId === userId &&
        character.displayName.normalized === normalizedDisplayName,
    );
  }
}
