import type { Character } from '../../domain/entities/character.entity.js';
import { Character as CharacterEntity } from '../../domain/entities/character.entity.js';
import { DisplayName } from '../../domain/value-objects/display-name.vo.js';
import { SkinId } from '../../domain/value-objects/skin-id.vo.js';

export interface CharacterRow {
  id: string;
  user_id: string;
  world_id: string;
  display_name: string;
  display_name_normalized: string;
  skin_id: string;
  created_at: Date;
  updated_at: Date;
}

export const CHARACTER_SELECTED_COLUMNS = `
  id,
  user_id,
  world_id,
  display_name,
  display_name_normalized,
  skin_id,
  created_at,
  updated_at
`;

export function mapRowToCharacter(row: CharacterRow): Character {
  return CharacterEntity.rehydrate({
    id: row.id,
    userId: row.user_id,
    worldId: row.world_id,
    displayName: DisplayName.create(row.display_name),
    skinId: SkinId.create(row.skin_id),
    createdAt: new Date(row.created_at),
    updatedAt: new Date(row.updated_at),
  });
}

export function mapCharacterToRow(character: Character): CharacterRow {
  return {
    id: character.id,
    user_id: character.userId,
    world_id: character.worldId,
    display_name: character.displayName.value,
    display_name_normalized: character.displayName.normalized,
    skin_id: character.skinId.value,
    created_at: character.createdAt,
    updated_at: character.updatedAt,
  };
}
