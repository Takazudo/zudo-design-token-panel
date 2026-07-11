import path from 'path';
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
    resolve: {
      alias: {
        // Map the package self-reference used by host-adapter.ts's
        // `import('@takazudo/zdtp')` (loadPanelModule) to the source entry so
        // tests don't need a compiled dist/ in the worktree. The alias is
        // test-only: vitest.config.ts is not read by `vite build`.
        '@takazudo/zdtp': path.resolve(__dirname, 'src/index.tsx'),
      },
    },
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
            // Stubs jsdom's unimplemented canvas getContext so the intermittent
            // "Not implemented" jsdomError can't fail the run. Node-project only
            // — the browser project keeps real Chromium canvas.
            setupFiles: ['./vitest-setup-node.ts'],
          },
        },
        {
          extends: true,
          test: {
            name: 'browser',
            include: ['src/**/*.browser.test.ts', 'src/**/*.browser.test.tsx'],
            // Parallel browser files share one origin, so tests that assert
            // persisted localStorage state race each other's clear() calls.
            fileParallelism: false,
            browser: {
              enabled: true,
              headless: true,
              provider: playwright(),
              // Wide viewport so container-query tests that seed a wide panel
              // (e.g. 700px in panel-header-responsive) aren't shrunk by
              // clampSize's `window.innerWidth - margin` cap (floor 320px).
              // A real desktop user always has a viewport wider than the panel.
              viewport: { width: 1280, height: 800 },
              instances: [{ browser: 'chromium' }],
            },
          },
        },
      ],
    },
  }),
);
