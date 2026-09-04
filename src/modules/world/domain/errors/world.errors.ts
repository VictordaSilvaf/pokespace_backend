export class WorldDomainError extends Error {
  readonly code?: string;
  readonly args?: Record<string, string | number | boolean>;

  constructor(message: string);
  constructor(
    code: string,
    message: string,
    args?: Record<string, string | number | boolean>,
  );
  constructor(
    codeOrMessage: string,
    message?: string,
    args?: Record<string, string | number | boolean>,
  ) {
    if (message === undefined) {
      super(codeOrMessage);
    } else {
      super(message);
      this.code = codeOrMessage;
      this.args = args;
    }
    this.name = new.target.name;
  }
}

export class InvalidSequenceError extends WorldDomainError {
  constructor(sequence: number, lastSequence: number) {
    super(
      'INVALID_SEQUENCE',
      `invalid sequence ${sequence}; last accepted was ${lastSequence}`,
      { sequence, lastSequence },
    );
  }
}

export class MovementBlockedError extends WorldDomainError {
  constructor() {
    super('MOVEMENT_BLOCKED', 'movement blocked by collision or bounds');
  }
}

export class SpawnUnavailableError extends WorldDomainError {
  constructor(mapId: string) {
    super('SPAWN_UNAVAILABLE', `no available spawn on map ${mapId}`, { mapId });
  }
}

export class InstanceFullError extends WorldDomainError {
  constructor(instanceId: string) {
    super('INSTANCE_FULL', `instance is full: ${instanceId}`, { instanceId });
  }
}

export class WorldSessionNotFoundError extends WorldDomainError {
  constructor(connectionId: string) {
    super(
      'WORLD_SESSION_NOT_FOUND',
      `world session not found: ${connectionId}`,
      { connectionId },
    );
  }
}

export class MapNotFoundError extends WorldDomainError {
  constructor(mapId: string) {
    super('MAP_NOT_FOUND', `map not found: ${mapId}`, { mapId });
  }
}
