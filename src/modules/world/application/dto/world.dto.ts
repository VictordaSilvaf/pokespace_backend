export interface EnterWorldCommand {
  connectionId: string;
  accountId: string;
  characterId: string;
  mapId?: string;
  direction?: 'UP' | 'DOWN' | 'LEFT' | 'RIGHT';
  savedPosition?: {
    mapId: string;
    x: number;
    y: number;
    z: number;
  };
  visual?: {
    dexId?: number;
    assetKey?: string;
    path?: string;
  };
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
  direction?: string;
  characterId?: string;
  dexId?: number;
  level?: number;
  visual?: {
    dexId?: number;
    assetKey?: string;
    path?: string;
  };
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
  wildSpawned?: WorldEntitySnapshot[];
}

export interface LeaveWorldResult {
  instanceId: string;
  entityId: string;
  despawned: boolean;
  characterId?: string;
  accountId?: string;
  mapId?: string;
  position?: { x: number; y: number; z: number };
  direction?: 'UP' | 'DOWN' | 'LEFT' | 'RIGHT';
}

export interface MoveEntityResult {
  accepted: boolean;
  reason?: string;
  entityId?: string;
  position?: { x: number; y: number; z: number };
  direction?: 'UP' | 'DOWN' | 'LEFT' | 'RIGHT';
  sequence?: number;
  instanceId?: string;
  characterId?: string;
  accountId?: string;
  mapId?: string;
}

export interface LaboratorySpawnInfo {
  mapId: string;
  instanceId: string;
  position: { x: number; y: number; z: number };
}
