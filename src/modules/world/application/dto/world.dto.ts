export interface EnterWorldCommand {
  connectionId: string;
  accountId: string;
  characterId: string;
  mapId?: string;
}

export interface LeaveWorldCommand {
  connectionId: string;
}

export interface MoveEntityCommand {
  connectionId: string;
  direction: 'UP' | 'DOWN' | 'LEFT' | 'RIGHT';
  sequence: number;
}

export interface WorldEntitySnapshot {
  id: string;
  type: string;
  position: { x: number; y: number; z: number };
  characterId?: string;
}

export interface WorldSnapshot {
  map: { id: string };
  instance: { id: string };
  selfEntityId: string;
  entities: WorldEntitySnapshot[];
}

export interface EnterWorldResult {
  snapshot: WorldSnapshot;
  spawned: WorldEntitySnapshot;
}

export interface LeaveWorldResult {
  instanceId: string;
  entityId: string;
  despawned: boolean;
}

export interface MoveEntityResult {
  accepted: boolean;
  reason?: string;
  entityId?: string;
  position?: { x: number; y: number; z: number };
  sequence?: number;
  instanceId?: string;
}

export interface LaboratorySpawnInfo {
  mapId: string;
  instanceId: string;
  position: { x: number; y: number; z: number };
}
