import { defineConfig } from '@playwright/test';

const playgroundPort = 44327;

export default defineConfig({
  testDir: './tests/e2e',
  outputDir: './test-results/e2e',
  fullyParallel: false,
  workers: 1,
  retries: 1,
  reporter: 'line',
  use: {
    baseURL: `http://127.0.0.1:${playgroundPort}`,
    trace: 'on-first-retry',
  },
  webServer: {
    command: `pnpm --filter playground exec zfb dev --port ${playgroundPort}`,
    cwd: '../..',
    url: `http://127.0.0.1:${playgroundPort}`,
    reuseExistingServer: false,
    timeout: 120_000,
  },
});
