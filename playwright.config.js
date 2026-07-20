import { defineConfig, devices } from '@playwright/test';

const API_PORT = 5050;
const WEB_PORT = 4173;

export default defineConfig({
  testDir: './e2e',
  fullyParallel: false,
  workers: 1,
  retries: process.env.CI ? 2 : 0,
  timeout: 60000,
  expect: { timeout: 10000 },
  reporter: process.env.CI ? [['github'], ['html', { open: 'never' }]] : [['list']],

  use: {
    baseURL: `http://localhost:${WEB_PORT}`,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },

  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],

  webServer: [
    {
      // Real API + Socket.io against a throwaway in-memory database.
      command: 'node tests/e2eServer.js',
      cwd: './backend',
      port: API_PORT,
      reuseExistingServer: !process.env.CI,
      // Generous: the very first run downloads a ~780MB mongod binary.
      // Subsequent runs start in seconds from the local cache.
      timeout: 600000,
      stdout: 'pipe',
    },
    {
      // Production build, so the E2E run exercises what actually ships.
      command: `npm run build && npm run preview -- --port ${WEB_PORT} --strictPort`,
      cwd: './frontend',
      port: WEB_PORT,
      reuseExistingServer: !process.env.CI,
      // Generous: the very first run downloads a ~780MB mongod binary.
      // Subsequent runs start in seconds from the local cache.
      timeout: 600000,
      env: { VITE_API_URL: `http://localhost:${API_PORT}/api` },
    },
  ],
});
