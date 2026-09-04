import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import cookieParser from 'cookie-parser';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from '../src/app.module.js';
import { SEEDED_WORLD_IDS } from '../src/modules/world/infrastructure/persistence/seed-worlds.js';

describe('Characters (e2e)', () => {
  let app: INestApplication<App>;
  let accessToken: string;

  beforeEach(async () => {
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
    await app.init();

    const suffix = `${Date.now()}${Math.floor(Math.random() * 1000)}`;
    const register = await request(app.getHttpServer())
      .post('/api/v1/auth/register')
      .send({
        email: `char${suffix}@poke.space`,
        phone: `219${String(suffix).slice(-8).padStart(8, '0')}`,
        username: `char_${suffix}`.slice(0, 20),
        password: 'staryu123',
      })
      .expect(201);

    accessToken = register.body.accessToken as string;
  });

  afterEach(async () => {
    await app?.close();
  });

  it('lists empty, returns creation options, creates character', async () => {
    const empty = await request(app.getHttpServer())
      .get('/api/v1/characters')
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);

    expect(empty.body.items).toEqual([]);
    expect(empty.body.limit).toBe(4);
    expect(empty.body.canCreate).toBe(true);

    const options = await request(app.getHttpServer())
      .get('/api/v1/characters/creation-options')
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);

    expect(options.body.skins.length).toBeGreaterThanOrEqual(2);
    expect(
      options.body.worlds.every(
        (world: { status: string }) => world.status === 'online',
      ),
    ).toBe(true);
    expect(
      options.body.worlds.some(
        (world: { worldId: string }) =>
          world.worldId === SEEDED_WORLD_IDS.earth,
      ),
    ).toBe(false);

    const created = await request(app.getHttpServer())
      .post('/api/v1/characters')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        worldId: SEEDED_WORLD_IDS.mercury,
        skinId: 'starter-boy-01',
        displayName: 'Ash',
      })
      .expect(201);

    expect(created.body.displayName).toBe('Ash');
    expect(created.body.worldId).toBe(SEEDED_WORLD_IDS.mercury);
    expect(created.body.skinId).toBe('starter-boy-01');

    const listed = await request(app.getHttpServer())
      .get('/api/v1/characters')
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);

    expect(listed.body.items).toHaveLength(1);
    expect(listed.body.canCreate).toBe(true);

    await request(app.getHttpServer())
      .get(`/api/v1/characters/${created.body.id}`)
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200)
      .expect(({ body }) => {
        expect(body.worldName).toBe('Mercury');
      });
  });

  it('rejects creation on maintenance world and localizes pt-BR', async () => {
    await request(app.getHttpServer())
      .post('/api/v1/characters')
      .set('Authorization', `Bearer ${accessToken}`)
      .set('Accept-Language', 'pt-BR')
      .send({
        worldId: SEEDED_WORLD_IDS.earth,
        skinId: 'starter-girl-01',
        displayName: 'Misty',
      })
      .expect(400)
      .expect(({ body }) => {
        expect(String(body.message)).toContain('indisponível');
      });
  });
});
