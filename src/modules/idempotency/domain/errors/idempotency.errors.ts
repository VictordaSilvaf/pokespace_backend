export class IdempotencyDomainError extends Error {
  readonly code?: string;
  readonly args?: Record<string, string | number | boolean>;

  constructor(
    code: string | undefined,
    message: string,
    args?: Record<string, string | number | boolean>,
  ) {
    super(message);
    this.name = new.target.name;
    this.code = code;
    this.args = args;
  }
}

export class IdempotencyKeyMismatchError extends IdempotencyDomainError {
  constructor() {
    super(
      'IDEMPOTENCY_KEY_MISMATCH',
      'Idempotency-Key was reused with a different request payload',
    );
  }
}

export class IdempotencyInProgressError extends IdempotencyDomainError {
  constructor() {
    super(
      'IDEMPOTENCY_IN_PROGRESS',
      'A request with this Idempotency-Key is already being processed',
    );
  }
}

export class IdempotencyInvalidKeyError extends IdempotencyDomainError {
  constructor() {
    super(
      'IDEMPOTENCY_INVALID_KEY',
      'Idempotency-Key must be 1–128 printable ASCII characters',
    );
  }
}

export class IdempotencyFailedReplayError extends IdempotencyDomainError {
  constructor(message: string, code?: string) {
    super(
      'IDEMPOTENCY_FAILED_REPLAY',
      message,
      code ? { originalCode: code } : undefined,
    );
  }
}
