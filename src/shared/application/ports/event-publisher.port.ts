import type { DomainEvent } from '../../domain/domain-event.js';

export const EVENT_PUBLISHER = Symbol('EVENT_PUBLISHER');

export interface EventPublisher {
  publish(events: DomainEvent[]): Promise<void>;
}
