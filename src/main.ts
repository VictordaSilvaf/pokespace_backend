import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import cookieParser from 'cookie-parser';
import { AppModule, ObserveInstrument } from './app.module.js';
import { MigrationRunner } from './shared/infrastructure/database/migration.runner.js';
import { useInMemoryUserRepository } from './shared/infrastructure/database/database.pool.port.js';

async function bootstrap() {
  const app = await NestFactory.create(
    AppModule,
    useInMemoryUserRepository() ? { instrument: ObserveInstrument } : {},
  );

  if (!useInMemoryUserRepository()) {
    const migrationRunner = app.get(MigrationRunner);
    await migrationRunner.run();
  }

  app.use(cookieParser());
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    }),
  );

  app.setGlobalPrefix('api/v1', {
    exclude: ['api/docs', 'api/docs-json', 'api/docs-yaml'],
  });

  const swaggerConfig = new DocumentBuilder()
    .setTitle('PokeSpace API')
    .setDescription('PokeSpace backend REST API')
    .setVersion('1.0')
    .addBearerAuth()
    .build();
  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('api/docs', app, document);

  await app.listen(process.env.PORT ?? 3000);
}

await bootstrap();
