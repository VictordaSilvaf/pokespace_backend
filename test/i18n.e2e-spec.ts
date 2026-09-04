import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import cookieParser from 'cookie-parser';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from './../src/app.module.js';

describe('i18n (e2e)', () => {
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

  it('returns Portuguese error for invalid credentials', async () => {
    await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .set('Accept-Language', 'pt-BR')
      .send({ username: 'nobody_here', password: 'wrongpass' })
      .expect(401)
      .expect(({ body }) => {
        expect(body.message).toBe('Credenciais inválidas');
      });
  });

  it('returns Spanish error via x-lang header', async () => {
    await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .set('x-lang', 'es')
      .send({ username: 'nobody_here', password: 'wrongpass' })
      .expect(401)
      .expect(({ body }) => {
        expect(body.message).toBe('Credenciales inválidas');
      });
  });

  it('returns English by default', async () => {
    await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ username: 'nobody_here', password: 'wrongpass' })
      .expect(401)
      .expect(({ body }) => {
        expect(body.message).toBe('Invalid credentials');
      });
  });
});
