import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import cookieParser from 'cookie-parser';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from './../src/app.module.js';

describe('API (e2e)', () => {
  let app: INestApplication<App>;

  beforeEach(async () => {
    process.env.AUTH_EXPOSE_RESET_TOKEN = 'true';
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

  it('GET /api/v1/health', () => {
    return request(app.getHttpServer())
      .get('/api/v1/health')
      .expect(200)
      .expect(({ body }) => {
        expect(body.status).toBe('ok');
      });
  });

  it('auth flow: register → login → me → refresh → change-password → logout', async () => {
    const register = await request(app.getHttpServer())
      .post('/api/v1/auth/register')
      .send({
        email: 'misty@poke.space',
        phone: '21988887777',
        username: 'misty_water',
        password: 'staryu123',
      })
      .expect(201);

    const token = register.body.accessToken as string;
    const refreshToken = register.body.refreshToken as string;
    expect(token).toBeTruthy();
    expect(refreshToken).toBeTruthy();

    await request(app.getHttpServer())
      .get('/api/v1/auth/me')
      .set('Authorization', `Bearer ${token}`)
      .expect(200)
      .expect(({ body }) => {
        expect(body.username).toBe('misty_water');
      });

    const refreshed = await request(app.getHttpServer())
      .post('/api/v1/auth/refresh')
      .send({ refreshToken })
      .expect(200);

    const refreshedAccessToken = refreshed.body.accessToken as string;
    const refreshedRefreshToken = refreshed.body.refreshToken as string;
    expect(refreshedAccessToken).toBeTruthy();
    expect(refreshedRefreshToken).toBeTruthy();
    expect(refreshedRefreshToken).not.toBe(refreshToken);

    await request(app.getHttpServer())
      .post('/api/v1/auth/refresh')
      .send({ refreshToken })
      .expect(401);

    await request(app.getHttpServer())
      .post('/api/v1/auth/change-password')
      .set('Authorization', `Bearer ${refreshedAccessToken}`)
      .send({ currentPassword: 'staryu123', newPassword: 'gyarados123' })
      .expect(200);

    await request(app.getHttpServer())
      .get('/api/v1/auth/me')
      .set('Authorization', `Bearer ${refreshedAccessToken}`)
      .expect(401);

    const login = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ username: 'misty_water', password: 'gyarados123' })
      .expect(200);

    const newToken = login.body.accessToken as string;
    const newRefreshToken = login.body.refreshToken as string;

    await request(app.getHttpServer())
      .post('/api/v1/auth/logout')
      .set('Authorization', `Bearer ${newToken}`)
      .send({ refreshToken: newRefreshToken })
      .expect(204);

    await request(app.getHttpServer())
      .get('/api/v1/auth/me')
      .set('Authorization', `Bearer ${newToken}`)
      .expect(401);

    await request(app.getHttpServer())
      .post('/api/v1/auth/refresh')
      .send({ refreshToken: newRefreshToken })
      .expect(401);
  });

  it('forgot-password → reset-password → login', async () => {
    const register = await request(app.getHttpServer())
      .post('/api/v1/auth/register')
      .send({
        email: 'brock@poke.space',
        phone: '11966665555',
        username: 'brock_rock',
        password: 'onix12345',
      })
      .expect(201);

    const refreshToken = register.body.refreshToken as string;

    const forgot = await request(app.getHttpServer())
      .post('/api/v1/auth/forgot-password')
      .send({ username: 'brock_rock' })
      .expect(200);

    expect(forgot.body.resetToken).toBeTruthy();

    await request(app.getHttpServer())
      .post('/api/v1/auth/reset-password')
      .send({
        token: forgot.body.resetToken,
        newPassword: 'geodude123',
      })
      .expect(200);

    await request(app.getHttpServer())
      .post('/api/v1/auth/refresh')
      .send({ refreshToken })
      .expect(401);

    await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ username: 'brock_rock', password: 'geodude123' })
      .expect(200);
  });
});
