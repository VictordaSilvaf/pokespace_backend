import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Inject, Logger } from '@nestjs/common';
import { SkipThrottle } from '@nestjs/throttler';
import { Server, Socket } from 'socket.io';
import {
  TOKEN_SERVICE,
  type TokenService,
} from '../../../identity/application/ports/token-service.port.js';
import {
  TOKEN_DENYLIST,
  type TokenDenylist,
} from '../../../identity/application/ports/token-denylist.port.js';
import { GetCharacterForAccountUseCase } from '../../../character/application/use-cases/get-character-for-account.use-case.js';
import { EnterWorldUseCase } from '../../../world/application/use-cases/enter-world.use-case.js';
import { LeaveWorldUseCase } from '../../../world/application/use-cases/leave-world.use-case.js';
import { MoveEntityUseCase } from '../../../world/application/use-cases/move-entity.use-case.js';
import {
  InvalidSequenceError,
  MovementBlockedError,
  WorldDomainError,
  WorldSessionNotFoundError,
} from '../../../world/domain/errors/world.errors.js';
import {
  CharacterAccessDeniedError,
  CharacterDomainError,
  CharacterNotFoundError,
} from '../../../character/domain/errors/character.errors.js';

type AuthedSocket = Socket & {
  data: {
    userId?: string;
    authenticated?: boolean;
  };
};

@SkipThrottle()
@WebSocketGateway({
  namespace: '/world',
  cors: { origin: true, credentials: true },
})
export class WorldGateway
  implements OnGatewayConnection, OnGatewayDisconnect
{
  private readonly logger = new Logger(WorldGateway.name);

  @WebSocketServer()
  server!: Server;

  constructor(
    @Inject(TOKEN_SERVICE)
    private readonly tokens: TokenService,
    @Inject(TOKEN_DENYLIST)
    private readonly denylist: TokenDenylist,
    private readonly getCharacter: GetCharacterForAccountUseCase,
    private readonly enterWorld: EnterWorldUseCase,
    private readonly leaveWorld: LeaveWorldUseCase,
    private readonly moveEntity: MoveEntityUseCase,
  ) {}

  async handleConnection(client: AuthedSocket): Promise<void> {
    try {
      const token = this.extractToken(client);
      if (!token) {
        client.emit('WORLD_ERROR', { code: 'UNAUTHORIZED', message: 'missing token' });
        client.disconnect(true);
        return;
      }
      if (await this.denylist.isRevoked(token)) {
        client.emit('WORLD_ERROR', { code: 'UNAUTHORIZED', message: 'token revoked' });
        client.disconnect(true);
        return;
      }
      const payload = await this.tokens.verify(token);
      client.data.userId = payload.sub;
      client.data.authenticated = true;
    } catch (error) {
      this.logger.warn(`WS auth failed: ${(error as Error).message}`);
      client.emit('WORLD_ERROR', { code: 'UNAUTHORIZED', message: 'invalid token' });
      client.disconnect(true);
    }
  }

  async handleDisconnect(client: AuthedSocket): Promise<void> {
    await this.leaveAndBroadcast(client.id);
  }

  @SubscribeMessage('WORLD_ENTER')
  async onEnter(
    @ConnectedSocket() client: AuthedSocket,
    @MessageBody() body: { characterId?: string; mapId?: string },
  ) {
    if (!client.data.authenticated || !client.data.userId) {
      return this.error(client, 'UNAUTHORIZED', 'not authenticated');
    }
    if (!body?.characterId) {
      return this.error(client, 'BAD_REQUEST', 'characterId required');
    }

    try {
      await this.getCharacter.execute({
        characterId: body.characterId,
        accountId: client.data.userId,
      });

      // If reconnecting from another socket, leave previous first for broadcast.
      // EnterWorldUseCase also cleans prior session for the character.

      const result = await this.enterWorld.execute({
        connectionId: client.id,
        accountId: client.data.userId,
        characterId: body.characterId,
        mapId: body.mapId ?? 'laboratory',
      });

      const room = this.room(result.snapshot.instance.id);
      await client.join(room);

      client.emit('WORLD_SNAPSHOT', result.snapshot);
      client.to(room).emit('ENTITY_SPAWNED', result.spawned);

      return { ok: true };
    } catch (error) {
      return this.mapError(client, error);
    }
  }

  @SubscribeMessage('WORLD_LEAVE')
  async onLeave(@ConnectedSocket() client: AuthedSocket) {
    await this.leaveAndBroadcast(client.id);
    return { ok: true };
  }

  @SubscribeMessage('MOVE')
  async onMove(
    @ConnectedSocket() client: AuthedSocket,
    @MessageBody()
    body: { direction?: string; sequence?: number },
  ) {
    if (!client.data.authenticated) {
      return this.error(client, 'UNAUTHORIZED', 'not authenticated');
    }

    const direction = body?.direction;
    const sequence = body?.sequence;
    if (
      direction !== 'UP' &&
      direction !== 'DOWN' &&
      direction !== 'LEFT' &&
      direction !== 'RIGHT'
    ) {
      return this.error(client, 'BAD_REQUEST', 'invalid direction');
    }
    if (typeof sequence !== 'number') {
      return this.error(client, 'BAD_REQUEST', 'sequence required');
    }

    try {
      const result = await this.moveEntity.execute({
        connectionId: client.id,
        direction,
        sequence,
      });

      if (result.accepted && result.instanceId) {
        this.server.to(this.room(result.instanceId)).emit('ENTITY_MOVED', {
          type: 'ENTITY_MOVED',
          entityId: result.entityId,
          position: result.position,
          sequence: result.sequence,
        });
      }

      return result;
    } catch (error) {
      if (error instanceof InvalidSequenceError) {
        return this.error(client, 'INVALID_SEQUENCE', error.message);
      }
      if (error instanceof MovementBlockedError) {
        return this.error(client, 'MOVEMENT_BLOCKED', error.message);
      }
      return this.mapError(client, error);
    }
  }

  // mapError handles unknown below

  private async leaveAndBroadcast(connectionId: string): Promise<void> {
    const result = await this.leaveWorld.execute({ connectionId });
    if (result.despawned && result.instanceId) {
      this.server
        .to(this.room(result.instanceId))
        .emit('ENTITY_DESPAWNED', {
          type: 'ENTITY_DESPAWNED',
          entityId: result.entityId,
        });
    }
  }

  private room(instanceId: string): string {
    return `instance:${instanceId}`;
  }

  private extractToken(client: Socket): string | undefined {
    const auth = client.handshake.auth as { token?: string } | undefined;
    if (auth?.token) {
      return auth.token;
    }
    const header = client.handshake.headers.authorization;
    if (typeof header === 'string' && header.startsWith('Bearer ')) {
      return header.slice('Bearer '.length);
    }
    const queryToken = client.handshake.query.token;
    if (typeof queryToken === 'string') {
      return queryToken;
    }
    return undefined;
  }

  private error(
    client: Socket,
    code: string,
    message: string,
  ): { ok: false } {
    client.emit('WORLD_ERROR', { code, message });
    return { ok: false };
  }

  private mapError(client: Socket, error: unknown): { ok: false } {
    if (
      error instanceof CharacterNotFoundError ||
      error instanceof CharacterAccessDeniedError ||
      error instanceof CharacterDomainError
    ) {
      return this.error(client, 'CHARACTER_ERROR', (error as Error).message);
    }
    if (
      error instanceof WorldSessionNotFoundError ||
      error instanceof WorldDomainError
    ) {
      return this.error(client, 'WORLD_ERROR', (error as Error).message);
    }
    this.logger.error(error);
    return this.error(client, 'INTERNAL', 'unexpected error');
  }
}
