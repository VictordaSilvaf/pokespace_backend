import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import cookieParser from 'cookie-parser';
import request from 'supertest';
import { io, type Socket } from 'socket.io-client';
import { AppModule } from '../src/app.module.js';
import { SEEDED_SERVER_IDS } from '../src/modules/servers/infrastructure/persistence/seed-servers.js';

async function registerAndCreateCharacter(
  app: INestApplication,
  username: string,
  name: string,
): Promise<{ token: string; characterId: string }> {
  const phone = String(Math.floor(10_000_000_000 + Math.random() * 1_000_000_000));
  const register = await request(app.getHttpServer())
    .post('/api/v1/auth/register')
    .send({
      email: `${username}@poke.space`,
      phone,
      username,
      password: 'pikachu123',
    })
    .expect(201);

  const token = register.body.accessToken as string;

  const character = await request(app.getHttpServer())
    .post('/api/v1/characters')
    .set('Authorization', `Bearer ${token}`)
    .send({ name, serverId: SEEDED_SERVER_IDS.mercury })
    .expect(201);

  return { token, characterId: character.body.character.id as string };
}

function connectWorld(port: number, token: string): Promise<Socket> {
  return new Promise((resolve, reject) => {
    const socket = io(`http://127.0.0.1:${port}/world`, {
      auth: { token },
      transports: ['websocket'],
      forceNew: true,
    });
    socket.on('connect', () => resolve(socket));
    socket.on('connect_error', reject);
  });
}

function once<T>(socket: Socket, event: string, timeoutMs = 5000): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(
      () => reject(new Error(`timeout waiting for ${event}`)),
      timeoutMs,
    );
    socket.once(event, (payload: T) => {
      clearTimeout(timer);
      resolve(payload);
    });
  });
}

describe('Laboratory multiplayer (e2e)', () => {
  let app: INestApplication;
  let port: number;

  beforeAll(async () => {
    process.env.USER_REPOSITORY_DRIVER = 'memory';
    process.env.REDIS_DRIVER = 'memory';

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.use(cookieParser());
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        transform: true,
        forbidNonWhitelisted: true,
      }),
    );
    app.setGlobalPrefix('api/v1');
    await app.listen(0);
    const address = app.getHttpServer().address();
    if (address && typeof address === 'object') {
      port = address.port;
    } else {
      throw new Error('failed to bind test server');
    }
  });

  afterAll(async () => {
    await app.close();
  });

  it(
    'two players see each other, move, despawn and respawn',
    async () => {
      const a = await registerAndCreateCharacter(app, 'player_a_lab', 'Ash');
      const b = await registerAndCreateCharacter(app, 'player_b_lab', 'Gary');

      const socketA = await connectWorld(port, a.token);
      const socketB = await connectWorld(port, b.token);

      const snapshotAPromise = once<{
        entities: Array<{ id: string; characterId?: string }>;
        selfEntityId: string;
      }>(socketA, 'WORLD_SNAPSHOT');
      socketA.emit('WORLD_ENTER', { characterId: a.characterId });
      const snapA = await snapshotAPromise;
      expect(snapA.entities.some((e) => e.characterId === a.characterId)).toBe(
        true,
      );

      const spawnedOnA = once<{ id: string; characterId?: string }>(
        socketA,
        'ENTITY_SPAWNED',
      );
      const snapshotBPromise = once<{
        entities: Array<{ id: string; characterId?: string }>;
        selfEntityId: string;
      }>(socketB, 'WORLD_SNAPSHOT');

      socketB.emit('WORLD_ENTER', { characterId: b.characterId });
      const snapB = await snapshotBPromise;
      const spawned = await spawnedOnA;

      expect(spawned.characterId).toBe(b.characterId);
      expect(snapB.entities.some((e) => e.characterId === a.characterId)).toBe(
        true,
      );
      expect(snapB.entities.some((e) => e.characterId === b.characterId)).toBe(
        true,
      );

      const movedOnB = once<{
        entityId: string;
        position: { x: number; y: number; z: number };
        sequence: number;
      }>(socketB, 'ENTITY_MOVED');

      socketA.emit('MOVE', { direction: 'RIGHT', sequence: 1 });
      const moved = await movedOnB;
      expect(moved.entityId).toBe(snapA.selfEntityId);
      expect(moved.sequence).toBe(1);

      const despawnedOnB = once<{ entityId: string }>(
        socketB,
        'ENTITY_DESPAWNED',
      );
      socketA.disconnect();
      const despawned = await despawnedOnB;
      expect(despawned.entityId).toBe(snapA.selfEntityId);

      const respawnedOnB = once<{ id: string; characterId?: string }>(
        socketB,
        'ENTITY_SPAWNED',
      );
      const socketA2 = await connectWorld(port, a.token);
      const snapshotA2 = once<{ selfEntityId: string }>(
        socketA2,
        'WORLD_SNAPSHOT',
      );
      socketA2.emit('WORLD_ENTER', { characterId: a.characterId });
      await snapshotA2;
      const respawned = await respawnedOnB;
      expect(respawned.characterId).toBe(a.characterId);

      socketA2.disconnect();
      socketB.disconnect();
    },
    20_000,
  );
});
