import { Server } from '../../domain/entities/server.entity.js';
import { ServerName } from '../../domain/value-objects/server-name.vo.js';
import { ServerStatus } from '../../domain/value-objects/server-status.vo.js';

export const SERVER_SELECTED_COLUMNS =
  'id, name, region, status, max_players, created_at';

export interface ServerRow {
  id: string;
  name: string;
  region: string;
  status: string;
  max_players: number;
  created_at: Date;
}

export function mapRowToServer(row: ServerRow): Server {
  return Server.rehydrate({
    id: row.id,
    name: ServerName.create(row.name),
    region: row.region,
    status: ServerStatus.create(row.status),
    maxPlayers: row.max_players,
    createdAt: row.created_at,
  });
}
