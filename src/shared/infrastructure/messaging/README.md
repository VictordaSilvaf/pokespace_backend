# Messaging adapters

Hoje o monólito publica eventos via `InMemoryEventPublisher`.

Próximos adapters (mesma porta `EventPublisher`):

- `rabbitmq-event-publisher.ts` — work queues / retries
- `kafka-event-publisher.ts` — event streaming

Consumidores ficam em `modules/<contexto>/infrastructure/messaging/`.
