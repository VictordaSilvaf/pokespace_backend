import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import cookieParser from 'cookie-parser';
import request from 'supertest';
import { AppModule } from './../src/app.module.js';
import { SEEDED_WORLD_IDS } from '../src/modules/world/infrastructure/persistence/seed-worlds.js';
import { App } from 'supertest/types.js';

describe('World (e2e)', () => {
  let app: INestApplication<App>;

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
  });

  afterEach(async () => {
    await app.close();
  });

  it('GET /api/v1/worlds returns seeded worlds', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/v1/worlds')
      .expect(200);

    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body).toHaveLength(3);
    expect(res.body[0]).toEqual(
      expect.objectContaining({
        worldId: expect.any(String),
        name: expect.any(String),
        region: expect.any(String),
        status: expect.stringMatching(/^(online|maintenance|offline)$/),
        maxPlayers: expect.any(Number),
      }),
    );
  });

  it('GET /api/v1/worlds/:id returns one world', async () => {
    await request(app.getHttpServer())
      .get(`/api/v1/worlds/${SEEDED_WORLD_IDS.mars}`)
      .expect(200)
      .expect(({ body }) => {
        expect(body.name).toBe('Mars');
        expect(body.status).toBe('online');
      });
  });

  it('GET /api/v1/worlds/:id returns 404 when missing', async () => {
    await request(app.getHttpServer())
      .get('/api/v1/worlds/00000000-0000-4000-8000-000000000000')
      .expect(404);
  });

  it('GET /api/v1/worlds/:id returns 400 for invalid uuid', async () => {
    await request(app.getHttpServer())
      .get('/api/v1/worlds/not-a-uuid')
      .expect(400);
  });
});