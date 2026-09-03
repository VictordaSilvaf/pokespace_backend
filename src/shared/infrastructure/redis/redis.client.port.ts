import { Redis, type Redis as RedisClientType } from 'ioredis';

export const REDIS_CLIENT = Symbol('REDIS_CLIENT');

export type RedisClient = RedisClientType | null;

export function useInMemoryRedis(): boolean {
  return process.env.REDIS_DRIVER === 'memory' || !process.env.REDIS_URL;
}

export function getRedisKeyPrefix(): string {
  return process.env.REDIS_KEY_PREFIX ?? 'pokespace:';
}
