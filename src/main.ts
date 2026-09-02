import { NestFactory } from '@nestjs/core';
import { AppModule, ObserveInstrument } from './app.module.js';
import { MigrationRunner } from './shared/infrastructure/database/migration.runner.js';
import { useInMemoryUserRepository } from './shared/infrastructure/database/database.pool.port.js';

async function bootstrap() {
  // ObserveInstrument breaks pg Pool.query (Promise patching). HTTP telemetry
  // still works via ObserveModule when Postgres persistence is enabled.
  const app = await NestFactory.create(
    AppModule,
    useInMemoryUserRepository() ? { instrument: ObserveInstrument } : {},
  );

  if (!useInMemoryUserRepository()) {
    const migrationRunner = app.get(MigrationRunner);
    await migrationRunner.run();
  }

  app.setGlobalPrefix('api/v1');

  await app.listen(process.env.PORT ?? 3000);
}

await bootstrap();
