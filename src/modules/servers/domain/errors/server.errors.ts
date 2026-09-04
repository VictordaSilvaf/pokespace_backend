export class ServerDomainError extends Error {
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

export class ServerNotFoundError extends ServerDomainError {
  constructor(serverId: string) {
    super('SERVER_NOT_FOUND', `server not found: ${serverId}`, { serverId });
  }
}

export class InvalidServerStatusError extends ServerDomainError {
  constructor(status: string) {
    super('INVALID_SERVER_STATUS', `invalid server status: ${status}`, {
      status,
    });
  }
}
