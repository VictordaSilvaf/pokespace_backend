export abstract class DomainEvent {
  readonly occurredAt: Date;
  readonly eventName: string;

  protected constructor(eventName: string, occurredAt: Date = new Date()) {
    this.eventName = eventName;
    this.occurredAt = occurredAt;
  }
}
