import { Module } from '@nestjs/common';
import { IdentityModule } from '../identity/identity.module.js';
import { CharacterModule } from '../character/character.module.js';
import { WorldModule } from '../world/world.module.js';
import { WorldGateway } from './infrastructure/websocket/world.gateway.js';

/**
 * Realtime presentation for the World Engine.
 * Gateway stays thin — business rules live in World / Character use cases.
 */
@Module({
  imports: [IdentityModule, CharacterModule, WorldModule],
  providers: [WorldGateway],
})
export class RealtimeModule {}
