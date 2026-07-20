import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    globals: false,
    setupFiles: ['./tests/setup.js'],
    // Keep every test file on the single in-memory MongoDB instance.
    fileParallelism: false,
    testTimeout: 30000,
    hookTimeout: 180000,
  },
});
