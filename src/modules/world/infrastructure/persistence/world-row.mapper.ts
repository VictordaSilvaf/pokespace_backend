import { World } from '../../domain/entities/world.entity.js';
import { WorldName } from '../../domain/value-objects/world-name.vo.js';
import { WorldStatus } from '../../domain/value-objects/world-status.vo.js';

export const WORLD_SELECTED_COLUMNS =
  'id, name, region, status, max_players, created_at';

export interface WorldRow {
  id: string;
  name: string;
  region: string;
  status: string;
  max_players: number;
  created_at: Date;
}

export function mapRowToWorld(row: WorldRow): World {
  return World.rehydrate({
    id: row.id,
    name: WorldName.create(row.name),
    region: row.region,
    status: WorldStatus.create(row.status),
    maxPlayers: row.max_players,
    createdAt: row.created_at,
  });
}
