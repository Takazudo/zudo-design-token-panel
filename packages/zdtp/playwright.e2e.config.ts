import { defineConfig } from '@playwright/test';

const playgroundPort = 44327;

export default defineConfig({
  testDir: './tests/e2e',
  // Keep trace writes outside the linked package watched by zfb (upstream #3926).
  outputDir: '../../test-results/e2e',
  fullyParallel: false,
  workers: 1,
  retries: 1,
  reporter: 'line',
  use: {
    baseURL: `http://127.0.0.1:${playgroundPort}`,
    trace: 'on',
  },
  webServer: {
    command: 'pnpm --filter playground run dev:zfb',
    cwd: '../..',
    url: `http://127.0.0.1:${playgroundPort}`,
    reuseExistingServer: false,
    timeout: 120_000,
  },
});
