import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { config as loadEnv } from 'dotenv';
import { createObserveModule } from '@nestjs/observe';
import { SharedModule } from './shared/shared.module.js';
import { IdentityModule } from './modules/identity/identity.module.js';
import { HealthController } from './health/health.controller.js';
import {
  REDIS_CLIENT,
  useInMemoryRedis,
  type RedisClient,
} from './shared/infrastructure/redis/redis.client.port.js';
import { RedisThrottlerStorage } from './shared/infrastructure/redis/redis-throttler.storage.js';
import { ServersModule } from './modules/servers/servers.module.js';
import { CharacterModule } from './modules/character/character.module.js';
import { WorldModule } from './modules/world/world.module.js';
import { RealtimeModule } from './modules/realtime/realtime.module.js';
import { IdempotencyModule } from './modules/idempotency/idempotency.module.js';
import { AppI18nModule } from './shared/infrastructure/i18n/app-i18n.module.js';
import { LocalizedMessageInterceptor } from './shared/infrastructure/i18n/localized-message.interceptor.js';

loadEnv();

export const { ObserveModule, ObserveInstrument } = createObserveModule();

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    AppI18nModule,
    ThrottlerModule.forRootAsync({
      imports: [SharedModule],
      inject: [REDIS_CLIENT],
      useFactory: (redis: RedisClient) => ({
        throttlers: [{ name: 'default', ttl: 60_000, limit: 100 }],
        storage:
          redis && !useInMemoryRedis()
            ? new RedisThrottlerStorage(redis)
            : undefined,
      }),
    }),
    ObserveModule.forRoot({
      appKey: process.env.OBSERVE_APP_KEY ?? 'YOUR_APP_KEY',
      appSecret: process.env.OBSERVE_APP_SECRET ?? 'YOUR_APP_SECRET',
      serviceId: 'pokespace',
    }),
    SharedModule,
    IdempotencyModule,
    IdentityModule,
    ServersModule,
    CharacterModule,
    WorldModule,
    RealtimeModule,
  ],
  controllers: [HealthController],
  providers: [
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: LocalizedMessageInterceptor,
    },
  ],
})
export class AppModule {}
