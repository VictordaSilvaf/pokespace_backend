import type { Character } from '../entities/character.entity.js';

export const CHARACTER_REPOSITORY = Symbol('CharacterRepository');

export interface CharacterRepository {
  save(character: Character): Promise<void>;
  findById(characterId: string): Promise<Character | null>;
  listByUserId(userId: string): Promise<Character[]>;
  countByUserId(userId: string): Promise<number>;
  existsByUserIdAndDisplayName(
    userId: string,
    normalizedDisplayName: string,
  ): Promise<boolean>;
}
