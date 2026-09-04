export class WorldDomainError extends Error {
  constructor(message: string) {
    super(message);
    this.name = new.target.name;
  }
}

export class InvalidSequenceError extends WorldDomainError {
  constructor(sequence: number, lastSequence: number) {
    super(
      `invalid sequence ${sequence}; last accepted was ${lastSequence}`,
    );
  }
}

export class MovementBlockedError extends WorldDomainError {
  constructor() {
    super('movement blocked by collision or bounds');
  }
}

export class SpawnUnavailableError extends WorldDomainError {
  constructor(mapId: string) {
    super(`no available spawn on map ${mapId}`);
  }
}

export class InstanceFullError extends WorldDomainError {
  constructor(instanceId: string) {
    super(`instance is full: ${instanceId}`);
  }
}

export class WorldSessionNotFoundError extends WorldDomainError {
  constructor(connectionId: string) {
    super(`world session not found: ${connectionId}`);
  }
}

export class MapNotFoundError extends WorldDomainError {
  constructor(mapId: string) {
    super(`map not found: ${mapId}`);
  }
}
