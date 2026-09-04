import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import cookieParser from 'cookie-parser';
import request from 'supertest';
import { AppModule } from '../src/app.module.js';
import { SEEDED_SERVER_IDS } from '../src/modules/servers/infrastructure/persistence/seed-servers.js';
import { App } from 'supertest/types.js';

describe('Characters (e2e)', () => {
  let app: INestApplication<App>;
  let token: string;

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

    const register = await request(app.getHttpServer())
      .post('/api/v1/auth/register')
      .send({
        email: 'oak@poke.space',
        phone: '11911112222',
        username: 'prof_oak',
        password: 'pokeball1',
      })
      .expect(201);
    token = register.body.accessToken as string;
  });

  afterEach(async () => {
    await app.close();
  });

  it('POST /api/v1/characters creates character with laboratory spawn', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/v1/characters')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Ash', serverId: SEEDED_SERVER_IDS.mercury })
      .expect(201);

    expect(res.body.character.name).toBe('Ash');
    expect(res.body.spawn.mapId).toBe('laboratory');
    expect(res.body.spawn.position).toEqual(
      expect.objectContaining({
        x: expect.any(Number),
        y: expect.any(Number),
        z: 0,
      }),
    );
  });

  it('rejects create on maintenance server', async () => {
    await request(app.getHttpServer())
      .post('/api/v1/characters')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Ash', serverId: SEEDED_SERVER_IDS.earth })
      .expect(400);
  });
});
