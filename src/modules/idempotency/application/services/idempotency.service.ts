import { Inject, Injectable, Logger } from '@nestjs/common';
import { IdempotencyRecord } from '../../domain/entities/idempotency-record.entity.js';
import {
  IdempotencyFailedReplayError,
  IdempotencyInProgressError,
  IdempotencyInvalidKeyError,
  IdempotencyKeyMismatchError,
} from '../../domain/errors/idempotency.errors.js';
import {
  IDEMPOTENCY_REPOSITORY,
  type IdempotencyRepository,
} from '../../domain/repositories/idempotency.repository.js';
import { assertValidIdempotencyKey } from '../idempotency-hash.js';

export interface RunIdempotentOptions<T> {
  key: string;
  requestHash: string;
  ttlSeconds?: number;
  processingTimeoutSeconds?: number;
  execute: () => Promise<T>;
  /** Map a thrown error into a storable failure (optional). */
  mapFailure?: (error: unknown) => { code?: string; message: string };
}

const DEFAULT_TTL_SECONDS = 86_400;
const DEFAULT_PROCESSING_TIMEOUT_SECONDS = 30;

@Injectable()
export class IdempotencyService {
  private readonly logger = new Logger(IdempotencyService.name);
  private hits = 0;
  private conflicts = 0;
  private executes = 0;

  constructor(
    @Inject(IDEMPOTENCY_REPOSITORY)
    private readonly repository: IdempotencyRepository,
  ) {}

  async run<T>(options: RunIdempotentOptions<T>): Promise<T> {
    if (!assertValidIdempotencyKey(options.key)) {
      throw new IdempotencyInvalidKeyError();
    }

    const ttlSeconds = options.ttlSeconds ?? DEFAULT_TTL_SECONDS;
    const processingTimeoutSeconds =
      options.processingTimeoutSeconds ?? DEFAULT_PROCESSING_TIMEOUT_SECONDS;

    const processing = IdempotencyRecord.createProcessing({
      key: options.key,
      requestHash: options.requestHash,
      ttlSeconds,
      processingTimeoutSeconds,
    });

    const createResult = await this.repository.createProcessing(processing);

    if (createResult === 'created') {
      return this.executeAndPersist(options);
    }

    this.conflicts += 1;
    return this.handleExisting(options, ttlSeconds, processingTimeoutSeconds);
  }

  getMetrics(): { hits: number; conflicts: number; executes: number } {
    return {
      hits: this.hits,
      conflicts: this.conflicts,
      executes: this.executes,
    };
  }

  private async handleExisting<T>(
    options: RunIdempotentOptions<T>,
    ttlSeconds: number,
    processingTimeoutSeconds: number,
  ): Promise<T> {
    const existing = await this.repository.find(options.key, {
      consistent: true,
    });

    if (!existing) {
      // Race: item vanished (TTL) — try create again once
      const retry = IdempotencyRecord.createProcessing({
        key: options.key,
        requestHash: options.requestHash,
        ttlSeconds,
        processingTimeoutSeconds,
      });
      const created = await this.repository.createProcessing(retry);
      if (created === 'created') {
        return this.executeAndPersist(options);
      }
      throw new IdempotencyInProgressError();
    }

    if (!existing.matchesRequestHash(options.requestHash)) {
      throw new IdempotencyKeyMismatchError();
    }

    if (existing.status === 'COMPLETED' && existing.response) {
      this.hits += 1;
      this.logger.debug(
        JSON.stringify({
          event: 'idempotency.hit',
          status: 'COMPLETED',
        }),
      );
      return existing.response.body as T;
    }

    if (existing.status === 'FAILED' && existing.failure) {
      this.hits += 1;
      throw new IdempotencyFailedReplayError(
        existing.failure.message,
        existing.failure.code,
      );
    }

    if (existing.status === 'PROCESSING') {
      if (existing.isProcessingExpired()) {
        const reclaimRecord = IdempotencyRecord.createProcessing({
          key: options.key,
          requestHash: options.requestHash,
          ttlSeconds,
          processingTimeoutSeconds,
        });
        const reclaimed = await this.repository.reclaimExpiredProcessing(
          options.key,
          reclaimRecord,
        );
        if (reclaimed === 'reclaimed') {
          return this.executeAndPersist(options);
        }
      }
      throw new IdempotencyInProgressError();
    }

    throw new IdempotencyInProgressError();
  }

  private async executeAndPersist<T>(
    options: RunIdempotentOptions<T>,
  ): Promise<T> {
    this.executes += 1;
    try {
      const body = await options.execute();
      await this.repository.complete(options.key, {
        response: { body },
      });
      return body;
    } catch (error) {
      const failure = options.mapFailure
        ? options.mapFailure(error)
        : {
            message: error instanceof Error ? error.message : 'Unknown error',
            code: error instanceof Error ? error.name : undefined,
          };
      await this.repository.fail(options.key, { failure });
      throw error;
    }
  }
}
