import type { Character } from '../entities/character.entity.js';

export const CHARACTER_REPOSITORY = Symbol('CharacterRepository');

export interface CharacterRepository {
  save(character: Character): Promise<void>;
  findById(id: string): Promise<Character | null>;
  countByAccountId(accountId: string): Promise<number>;
  existsByServerAndName(serverId: string, name: string): Promise<boolean>;
  listByAccountId(accountId: string): Promise<Character[]>;
}
