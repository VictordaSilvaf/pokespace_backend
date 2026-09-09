export const POKEDEX_PROGRESS_REPOSITORY = Symbol('POKEDEX_PROGRESS_REPOSITORY');

export interface PokedexProgressEntry {
  dexId: number;
  seenAt: Date;
  caughtAt: Date | null;
}

export interface PokedexProgressRepository {
  listByCharacter(characterId: string): Promise<PokedexProgressEntry[]>;
  findByCharacterAndDex(
    characterId: string,
    dexId: number,
  ): Promise<PokedexProgressEntry | null>;
  markSeen(characterId: string, dexId: number, at?: Date): Promise<void>;
  markCaught(characterId: string, dexId: number, at?: Date): Promise<void>;
}
