import { defineConfig } from 'vitest/config';
import tsconfigPaths from 'vite-tsconfig-paths';

export default defineConfig({
  plugins: [tsconfigPaths()],
  test: {
    globals: true,
    root: './',
    include: ['**/*.e2e-spec.ts'],
    fileParallelism: false,
    env: {
      USER_REPOSITORY_DRIVER: 'memory',
      REDIS_DRIVER: 'memory',
      DYNAMODB_DRIVER: 'memory',
    },
  },
});
