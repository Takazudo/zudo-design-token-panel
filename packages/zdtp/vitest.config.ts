import { defineConfig, mergeConfig } from 'vitest/config';
import { playwright } from '@vitest/browser-playwright';
import viteConfig from './vite.config';

/**
 * Vitest config — two projects:
 *
 * - node: default (node) environment for all existing unit tests (*.test.ts /
 *   *.test.tsx, excluding *.browser.test.ts). Individual tests that need jsdom
 *   use the `// @vitest-environment jsdom` doc-comment directive, exactly as
 *   they did before this projects split was introduced.
 * - browser: Playwright Chromium for *.browser.test.ts files, where real CSS
 *   computed-style resolution (e.g. var() expansion) is required.
 *
 * Both projects inherit the Preact compat alias from vite.config so that test
 * files importing `from "react"` resolve against `preact/compat`.
 */
export default mergeConfig(
  viteConfig,
  defineConfig({
    test: {
      globals: true,
      projects: [
        {
          extends: true,
          test: {
            name: 'node',
            // No environment override — individual test files use
            // `// @vitest-environment jsdom` (or node) as needed, matching the
            // behavior of the original single-project config.
            include: ['src/**/*.test.ts', 'src/**/*.test.tsx'],
            exclude: ['src/**/*.browser.test.ts', 'src/**/*.browser.test.tsx'],
          },
        },
        {
          extends: true,
          test: {
            name: 'browser',
            include: ['src/**/*.browser.test.ts', 'src/**/*.browser.test.tsx'],
            browser: {
              enabled: true,
              headless: true,
              provider: playwright(),
              instances: [{ browser: 'chromium' }],
            },
          },
        },
      ],
    },
  }),
);
