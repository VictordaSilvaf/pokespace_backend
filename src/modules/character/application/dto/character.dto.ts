import type { Character } from '../../domain/entities/character.entity.js';

export interface CreateCharacterCommand {
  userId: string;
  worldId: string;
  displayName: string;
  skinId: string;
}

export interface ListCharactersQuery {
  userId: string;
}

export interface GetCharacterQuery {
  userId: string;
  characterId: string;
}

export interface CharacterResult {
  id: string;
  displayName: string;
  skinId: string;
  worldId: string;
  worldName?: string;
  worldRegion?: string;
  createdAt: string;
}

export interface ListCharactersResult {
  items: CharacterResult[];
  limit: number;
  canCreate: boolean;
}

export interface StarterSkinResult {
  id: string;
  nameKey: string;
  previewAssetKey: string;
}

export interface CreationWorldResult {
  worldId: string;
  name: string;
  region: string;
  status: string;
  maxPlayers: number;
}

export interface CreationOptionsResult {
  worlds: CreationWorldResult[];
  skins: StarterSkinResult[];
  limit: number;
}

export function toCharacterResult(
  character: Character,
  world?: { name: string; region: string },
): CharacterResult {
  return {
    id: character.id,
    displayName: character.displayName.value,
    skinId: character.skinId.value,
    worldId: character.worldId,
    worldName: world?.name,
    worldRegion: world?.region,
    createdAt: character.createdAt.toISOString(),
  };
}
