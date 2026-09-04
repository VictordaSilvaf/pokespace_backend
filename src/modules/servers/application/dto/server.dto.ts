import type { ServerStatusValue } from '../../domain/value-objects/server-status.vo.js';
import type { Server } from '../../domain/entities/server.entity.js';

export interface GetServerQuery {
  serverId: string;
}

export interface ServerResult {
  serverId: string;
  name: string;
  region: string;
  status: ServerStatusValue;
  maxPlayers: number;
}

export function toServerResult(server: Server): ServerResult {
  return {
    serverId: server.id,
    name: server.name.value,
    region: server.region,
    status: server.status.value,
    maxPlayers: server.maxPlayers,
  };
}

export type ListServersResult = ServerResult[];