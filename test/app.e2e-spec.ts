import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from './../src/app.module.js';

describe('API (e2e)', () => {
  let app: INestApplication<App>;

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api');
    await app.init();
  });

  afterEach(async () => {
    await app.close();
  });

  it('GET /api/health', () => {
    return request(app.getHttpServer())
      .get('/api/health')
      .expect(200)
      .expect(({ body }) => {
        expect(body.status).toBe('ok');
      });
  });

  it('POST /api/auth/register → login', async () => {
    const register = await request(app.getHttpServer())
      .post('/api/auth/register')
      .send({ email: 'misty@poke.space', password: 'staryu123' })
      .expect(201);

    expect(register.body.accessToken).toBeTruthy();

    const login = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ email: 'misty@poke.space', password: 'staryu123' })
      .expect(200);

    expect(login.body.userId).toBe(register.body.userId);
  });
});
