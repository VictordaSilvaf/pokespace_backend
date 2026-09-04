export type IdempotencyStatus = 'PROCESSING' | 'COMPLETED' | 'FAILED';

export interface IdempotencyResultPayload {
  statusCode?: number;
  body: unknown;
}

export interface IdempotencyFailurePayload {
  code?: string;
  message: string;
}

export class IdempotencyRecord {
  readonly key: string;
  readonly status: IdempotencyStatus;
  readonly requestHash: string;
  readonly response: IdempotencyResultPayload | null;
  readonly failure: IdempotencyFailurePayload | null;
  readonly createdAt: Date;
  readonly expiresAt: Date;
  readonly processingExpiresAt: Date;

  private constructor(props: {
    key: string;
    status: IdempotencyStatus;
    requestHash: string;
    response: IdempotencyResultPayload | null;
    failure: IdempotencyFailurePayload | null;
    createdAt: Date;
    expiresAt: Date;
    processingExpiresAt: Date;
  }) {
    this.key = props.key;
    this.status = props.status;
    this.requestHash = props.requestHash;
    this.response = props.response;
    this.failure = props.failure;
    this.createdAt = props.createdAt;
    this.expiresAt = props.expiresAt;
    this.processingExpiresAt = props.processingExpiresAt;
  }

  static createProcessing(input: {
    key: string;
    requestHash: string;
    ttlSeconds: number;
    processingTimeoutSeconds: number;
    now?: Date;
  }): IdempotencyRecord {
    const now = input.now ?? new Date();
    return new IdempotencyRecord({
      key: input.key,
      status: 'PROCESSING',
      requestHash: input.requestHash,
      response: null,
      failure: null,
      createdAt: now,
      expiresAt: new Date(now.getTime() + input.ttlSeconds * 1000),
      processingExpiresAt: new Date(
        now.getTime() + input.processingTimeoutSeconds * 1000,
      ),
    });
  }

  static rehydrate(props: {
    key: string;
    status: IdempotencyStatus;
    requestHash: string;
    response: IdempotencyResultPayload | null;
    failure: IdempotencyFailurePayload | null;
    createdAt: Date;
    expiresAt: Date;
    processingExpiresAt: Date;
  }): IdempotencyRecord {
    return new IdempotencyRecord(props);
  }

  isProcessingExpired(now = new Date()): boolean {
    return (
      this.status === 'PROCESSING' && this.processingExpiresAt.getTime() <= now.getTime()
    );
  }

  matchesRequestHash(requestHash: string): boolean {
    return this.requestHash === requestHash;
  }
}
