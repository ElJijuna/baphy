import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: false,
    environment: 'node',
    coverage: {
      include: ['src/**'],
      exclude: ['src/**/*.bench.ts'],
    },
  },
});
