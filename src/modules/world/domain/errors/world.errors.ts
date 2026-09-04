export class WorldDomainError extends Error {
  readonly code: string;
  readonly args?: Record<string, string | number | boolean>;

  constructor(
    code: string,
    message: string,
    args?: Record<string, string | number | boolean>,
  ) {
    super(message);
    this.name = new.target.name;
    this.code = code;
    this.args = args;
  }
}

export class WorldNotFoundError extends WorldDomainError {
  constructor(worldId: string) {
    super('WORLD_NOT_FOUND', `World not found: ${worldId}`, { worldId });
  }
}

export class InvalidWorldStatusError extends WorldDomainError {
  constructor(status: string) {
    super('INVALID_WORLD_STATUS', `Invalid world status: ${status}`, {
      status,
    });
  }
}
