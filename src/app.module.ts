import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { config as loadEnv } from 'dotenv';
import { createObserveModule } from '@nestjs/observe';
import { SharedModule } from './shared/shared.module.js';
import { IdentityModule } from './modules/identity/identity.module.js';
import { HealthController } from './health/health.controller.js';

// Carrega .env antes do ObserveModule.forRoot ler process.env
loadEnv();

export const { ObserveModule, ObserveInstrument } = createObserveModule();

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    ObserveModule.forRoot({
      appKey: process.env.OBSERVE_APP_KEY ?? 'YOUR_APP_KEY',
      appSecret: process.env.OBSERVE_APP_SECRET ?? 'YOUR_APP_SECRET',
      serviceId: 'pokespace',
    }),
    SharedModule,
    IdentityModule,
  ],
  controllers: [HealthController],
})
export class AppModule {}
