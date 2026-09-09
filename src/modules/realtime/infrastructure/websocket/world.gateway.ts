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
import { SaveCharacterWorldStateUseCase } from '../../../character/application/use-cases/save-character-world-state.use-case.js';
import { EnterWorldUseCase } from '../../../world/application/use-cases/enter-world.use-case.js';
import { LeaveWorldUseCase } from '../../../world/application/use-cases/leave-world.use-case.js';
import { MoveEntityUseCase } from '../../../world/application/use-cases/move-entity.use-case.js';
import { InterestAreaService } from '../../../world/application/services/interest-area.service.js';
import { SessionManager } from '../../../world/application/services/session-manager.service.js';
import { StartWildBattleUseCase } from '../../../battle/application/use-cases/start-wild-battle.use-case.js';
import { ExecuteBattleActionUseCase } from '../../../battle/application/use-cases/execute-battle-action.use-case.js';
import {
  BattleDomainError,
  BattleNotFoundError,
} from '../../../battle/domain/errors/battle.errors.js';
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
import type { FacingDirection } from '../../../character/domain/value-objects/character-world-state.vo.js';

/** MVP default party lead until inventory/party is wired into encounter. */
const DEFAULT_PLAYER_DEX_ID = 25;
const DEFAULT_PLAYER_LEVEL = 5;

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
    private readonly saveWorldState: SaveCharacterWorldStateUseCase,
    private readonly enterWorld: EnterWorldUseCase,
    private readonly leaveWorld: LeaveWorldUseCase,
    private readonly moveEntity: MoveEntityUseCase,
    private readonly interest: InterestAreaService,
    private readonly sessions: SessionManager,
    private readonly startWildBattle: StartWildBattleUseCase,
    private readonly executeBattleAction: ExecuteBattleActionUseCase,
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
      const character = await this.getCharacter.execute({
        characterId: body.characterId,
        accountId: client.data.userId,
      });

      const saved = character.worldState;
      const result = await this.enterWorld.execute({
        connectionId: client.id,
        accountId: client.data.userId,
        characterId: body.characterId,
        mapId: body.mapId ?? saved?.mapId ?? 'laboratory',
        direction: (saved?.direction as FacingDirection | undefined) ?? 'DOWN',
        savedPosition: saved
          ? {
              mapId: saved.mapId,
              x: saved.x,
              y: saved.y,
              z: saved.z,
            }
          : undefined,
      });

      const room = this.room(result.snapshot.instance.id);
      await client.join(room);

      client.emit('WORLD_SNAPSHOT', result.snapshot);
      client.to(room).emit('ENTITY_SPAWNED', result.spawned);

      for (const wild of result.wildSpawned ?? []) {
        this.server.to(room).emit('pokemon.spawned', {
          type: 'pokemon.spawned',
          entity: wild,
        });
      }

      for (const npc of result.npcSpawned ?? []) {
        client.to(room).emit('ENTITY_SPAWNED', npc);
      }

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
        const payload = {
          type: 'ENTITY_MOVED' as const,
          entityId: result.entityId,
          position: result.position,
          direction: result.direction,
          sequence: result.sequence,
        };
        // Interest-filtered broadcast: only peers within Chebyshev radius
        if (result.position) {
          const peers = this.sessions.listByInstance(result.instanceId);
          for (const peer of peers) {
            if (peer.connectionId === client.id) continue;
            if (
              this.interest.within(result.position, peer.position) ||
              peer.entityId === result.entityId
            ) {
              this.server.to(peer.connectionId).emit('ENTITY_MOVED', payload);
            }
          }
        } else {
          this.server.to(this.room(result.instanceId)).emit('ENTITY_MOVED', payload);
        }

        if (
          result.characterId &&
          result.accountId &&
          result.mapId &&
          result.position &&
          result.direction
        ) {
          await this.saveWorldState.execute({
            characterId: result.characterId,
            accountId: result.accountId,
            mapId: result.mapId,
            x: result.position.x,
            y: result.position.y,
            z: result.position.z,
            direction: result.direction,
          });
        }

        if (
          result.encounter?.triggered &&
          result.encounter.dexId != null &&
          result.encounter.level != null &&
          result.characterId &&
          result.accountId
        ) {
          const encounterPayload = {
            type: 'battle.encounter' as const,
            dexId: result.encounter.dexId,
            level: result.encounter.level,
            zoneId: result.encounter.zoneId,
            position: result.position,
          };
          client.emit('battle.encounter', encounterPayload);

          try {
            const battle = await this.startWildBattle.execute({
              accountId: result.accountId,
              characterId: result.characterId,
              playerDexId: DEFAULT_PLAYER_DEX_ID,
              playerLevel: DEFAULT_PLAYER_LEVEL,
              wildDexId: result.encounter.dexId,
              wildLevel: result.encounter.level,
            });
            client.emit('battle.started', {
              type: 'battle.started',
              encounter: encounterPayload,
              battle,
              effects: (battle.playerMoves ?? [])
                .concat(battle.wildMoves ?? [])
                .map((m) => m.missileAssetKey)
                .filter(Boolean),
            });
          } catch (battleError) {
            this.logger.warn(
              `encounter→battle failed: ${(battleError as Error).message}`,
            );
            client.emit('battle.error', {
              type: 'battle.error',
              code: 'BATTLE_START_FAILED',
              message: (battleError as Error).message,
            });
          }
        }
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

  @SubscribeMessage('BATTLE_ACTION')
  async onBattleAction(
    @ConnectedSocket() client: AuthedSocket,
    @MessageBody()
    body: {
      battleId?: string;
      characterId?: string;
      action?: 'move' | 'capture' | 'flee';
      moveId?: string;
      ballBonus?: number;
    },
  ) {
    if (!client.data.authenticated || !client.data.userId) {
      return this.error(client, 'UNAUTHORIZED', 'not authenticated');
    }
    if (!body?.battleId || !body?.characterId || !body?.action) {
      return this.error(
        client,
        'BAD_REQUEST',
        'battleId, characterId, action required',
      );
    }

    try {
      const battle = await this.executeBattleAction.execute({
        battleId: body.battleId,
        accountId: client.data.userId,
        characterId: body.characterId,
        action: body.action,
        moveId: body.moveId,
        ballBonus: body.ballBonus,
      });
      const payload = {
        type: 'battle.updated' as const,
        battle,
        effects: [battle.lastAction?.appliedEffect].filter(Boolean),
        missiles: battle.lastAction?.moveId
          ? [`effects/${battle.lastAction.moveId}`]
          : [],
      };
      client.emit('battle.updated', payload);
      return { ok: true, battle };
    } catch (error) {
      if (error instanceof BattleNotFoundError) {
        return this.error(client, 'BATTLE_NOT_FOUND', error.message);
      }
      if (error instanceof BattleDomainError) {
        return this.error(client, error.code, error.message);
      }
      return this.mapError(client, error);
    }
  }

  private async leaveAndBroadcast(connectionId: string): Promise<void> {
    const result = await this.leaveWorld.execute({ connectionId });
    if (result.despawned && result.instanceId) {
      this.server.to(this.room(result.instanceId)).emit('ENTITY_DESPAWNED', {
        type: 'ENTITY_DESPAWNED',
        entityId: result.entityId,
      });

      if (result.entityId.startsWith('pokemon-')) {
        this.server.to(this.room(result.instanceId)).emit('pokemon.despawned', {
          type: 'pokemon.despawned',
          entityId: result.entityId,
        });
      }
    }

    if (
      result.characterId &&
      result.accountId &&
      result.mapId &&
      result.position &&
      result.direction
    ) {
      try {
        await this.saveWorldState.execute({
          characterId: result.characterId,
          accountId: result.accountId,
          mapId: result.mapId,
          x: result.position.x,
          y: result.position.y,
          z: result.position.z,
          direction: result.direction,
        });
      } catch (error) {
        this.logger.warn(
          `failed to persist world state: ${(error as Error).message}`,
        );
      }
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
