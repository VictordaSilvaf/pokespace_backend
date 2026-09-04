import { Character } from '../../domain/entities/character.entity.js';
import { CharacterName } from '../../domain/value-objects/character-name.vo.js';

export const CHARACTER_SELECTED_COLUMNS =
  'id, account_id, server_id, name, created_at, updated_at';

export interface CharacterRow {
  id: string;
  account_id: string;
  server_id: string;
  name: string;
  created_at: Date;
  updated_at: Date;
}

export function mapRowToCharacter(row: CharacterRow): Character {
  return Character.rehydrate({
    id: row.id,
    accountId: row.account_id,
    serverId: row.server_id,
    name: CharacterName.create(row.name),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  });
}
