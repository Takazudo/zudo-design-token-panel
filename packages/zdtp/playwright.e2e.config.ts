import { defineConfig } from '@playwright/test';

const windPort = 44331;
const cssModulesPort = 44341;

export default defineConfig({
  testDir: './tests/e2e',
  // Keep trace writes outside the linked package watched by zfb (upstream #3926).
  outputDir: '../../test-results/e2e',
  fullyParallel: false,
  workers: 1,
  retries: 1,
  reporter: 'line',
  use: {
    baseURL: `http://127.0.0.1:${windPort}`,
    trace: 'on',
  },
  webServer: [
    {
      command: 'pnpm --filter demo-zudowind run dev:zfb',
      cwd: '../..',
      url: `http://127.0.0.1:${windPort}`,
      reuseExistingServer: false,
      timeout: 180_000,
    },
    {
      command: 'pnpm --filter demo-cssmodules run dev:zfb',
      cwd: '../..',
      url: `http://127.0.0.1:${cssModulesPort}`,
      reuseExistingServer: false,
      timeout: 180_000,
    },
  ],
});
