export const DATABASE_POOL = Symbol('DATABASE_POOL');

export function useInMemoryUserRepository(): boolean {
  return process.env.USER_REPOSITORY_DRIVER === 'memory';
}
