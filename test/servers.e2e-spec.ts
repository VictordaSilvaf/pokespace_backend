import { describe, expect, it } from 'vitest';
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import cookieParser from 'cookie-parser';
import request from 'supertest';
import { AppModule } from './../src/app.module.js';
import { SEEDED_SERVER_IDS } from '../src/modules/servers/infrastructure/persistence/seed-servers.js';
import { App } from 'supertest/types.js';

describe('Servers (e2e)', () => {
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

  it('GET /api/v1/servers returns seeded servers', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/v1/servers')
      .expect(200);

    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body).toHaveLength(9);
    expect(res.body[0]).toEqual(
      expect.objectContaining({
        serverId: expect.any(String),
        name: expect.any(String),
        region: expect.any(String),
        status: expect.stringMatching(/^(online|maintenance|offline)$/),
        maxPlayers: expect.any(Number),
      }),
    );
  });

  it('GET /api/v1/servers/:id returns one server', async () => {
    await request(app.getHttpServer())
      .get(`/api/v1/servers/${SEEDED_SERVER_IDS.mars}`)
      .expect(200)
      .expect(({ body }) => {
        expect(body.name).toBe('Mars');
        expect(body.status).toBe('online');
        expect(body.serverId).toBe(SEEDED_SERVER_IDS.mars);
      });
  });

  it('GET /api/v1/servers/:id returns 404 when missing', async () => {
    await request(app.getHttpServer())
      .get('/api/v1/servers/00000000-0000-4000-8000-000000000000')
      .expect(404);
  });

  it('GET /api/v1/servers/:id returns 400 for invalid uuid', async () => {
    await request(app.getHttpServer())
      .get('/api/v1/servers/not-a-uuid')
      .expect(400);
  });
});
