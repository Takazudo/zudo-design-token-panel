/**
 * Playwright config for the Vite + React example's apply-pipeline e2e spec.
 *
 * Local runs: webServer auto-starts the example's dev server.
 * On CI / when BASE_URL is supplied externally: the caller manages the
 * server lifecycle (so a separate workflow step can boot the bin sidecar
 * + Vite dev server together via `pnpm dev`).
 */

import { defineConfig, devices } from '@playwright/test';

const hasExternalBaseUrl = Boolean(process.env.BASE_URL);

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: 1,
  reporter: process.env.CI ? 'list' : 'html',
  maxFailures: 0,
  timeout: process.env.CI ? 60 * 1000 : 30 * 1000,
  use: {
    baseURL: process.env.BASE_URL || 'http://localhost:44325',
    trace: 'on-first-retry',
    viewport: { width: 1280, height: 720 },
    ignoreHTTPSErrors: true,
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },
  projects: [
    {
      name: 'apply-roundtrip',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  webServer:
    process.env.CI || hasExternalBaseUrl
      ? undefined
      : {
          command: 'pnpm dev',
          port: 44325,
          reuseExistingServer: true,
          timeout: 120 * 1000,
        },
});
