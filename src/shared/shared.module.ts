import { Global, Module } from '@nestjs/common';
import { EVENT_PUBLISHER } from './application/ports/event-publisher.port.js';
import { InMemoryEventPublisher } from './infrastructure/messaging/in-memory-event-publisher.js';

@Global()
@Module({
  providers: [
    {
      provide: EVENT_PUBLISHER,
      useClass: InMemoryEventPublisher,
    },
  ],
  exports: [EVENT_PUBLISHER],
})
export class SharedModule {}
