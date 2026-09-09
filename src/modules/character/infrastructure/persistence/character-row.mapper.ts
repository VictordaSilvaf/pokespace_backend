import { Character } from '../../domain/entities/character.entity.js';
import { CharacterName } from '../../domain/value-objects/character-name.vo.js';
import { CharacterWorldState } from '../../domain/value-objects/character-world-state.vo.js';
import type { FacingDirection } from '../../domain/value-objects/character-world-state.vo.js';

export const CHARACTER_SELECTED_COLUMNS = `
  c.id, c.account_id, c.server_id, c.name, c.created_at, c.updated_at,
  ws.map_id AS ws_map_id, ws.x AS ws_x, ws.y AS ws_y, ws.z AS ws_z,
  ws.direction AS ws_direction
`.trim();

export interface CharacterRow {
  id: string;
  account_id: string;
  server_id: string;
  name: string;
  created_at: Date;
  updated_at: Date;
  ws_map_id: string | null;
  ws_x: number | null;
  ws_y: number | null;
  ws_z: number | null;
  ws_direction: string | null;
}

export function mapRowToCharacter(row: CharacterRow): Character {
  let worldState: CharacterWorldState | null = null;
  if (
    row.ws_map_id != null &&
    row.ws_x != null &&
    row.ws_y != null &&
    row.ws_z != null &&
    row.ws_direction != null
  ) {
    worldState = CharacterWorldState.create({
      mapId: row.ws_map_id,
      x: row.ws_x,
      y: row.ws_y,
      z: row.ws_z,
      direction: row.ws_direction as FacingDirection,
    });
  }

  return Character.rehydrate({
    id: row.id,
    accountId: row.account_id,
    serverId: row.server_id,
    name: CharacterName.create(row.name),
    worldState,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  });
}
