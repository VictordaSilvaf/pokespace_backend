import { Injectable, Logger } from '@nestjs/common';
import type { DomainEvent } from '../../domain/domain-event.js';
import type { EventPublisher } from '../../application/ports/event-publisher.port.js';

/**
 * Publisher local para desenvolvimento.
 * Substituir por adapters RabbitMQ / Kafka em produção.
 */
@Injectable()
export class InMemoryEventPublisher implements EventPublisher {
  private readonly logger = new Logger(InMemoryEventPublisher.name);

  async publish(events: DomainEvent[]): Promise<void> {
    for (const event of events) {
      this.logger.debug(
        `domain event: ${event.eventName} @ ${event.occurredAt.toISOString()}`,
      );
    }
  }
}
