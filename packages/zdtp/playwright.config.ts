/**
 * Playwright config for visual-regression tests (VRT).
 *
 * Tests live in tests/visual/ and use page.setContent() with inline
 * dist/zdtp.css — no dev server needed. The build step (pnpm build) must
 * run before these tests to produce dist/zdtp.css.
 *
 * Two projects — light + dark — capture the panel chrome against both light
 * and dark host-page backgrounds (the panel itself is always dark).
 *
 * Snapshot update flow (local):
 *   pnpm build && pnpm --filter @takazudo/zdtp test:vrt:update
 *
 * Normal gate run:
 *   pnpm build && pnpm --filter @takazudo/zdtp test:vrt
 *
 * CI:
 *   A dedicated "Visual regression tests" step after "Build panel" in ci.yml
 *   runs pnpm --filter @takazudo/zdtp test:vrt on ubuntu-latest, the same OS
 *   the committed baselines were captured on. Baselines are linux-keyed
 *   ({projectName} only, no {platform} suffix) so the names stay stable
 *   across CI worker restarts.
 */

import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests/visual',

  // Baselines stored next to the test file, keyed by test name + project.
  // No {platform} token — baselines are linux-only (CI runner = ubuntu-latest;
  // WSL2 kernel = linux, same rendering).
  snapshotPathTemplate:
    '{testDir}/__snapshots__/{testFilePath}/{arg}-{projectName}{ext}',

  expect: {
    toHaveScreenshot: {
      // ≤1% of pixels may differ. Absorbs sub-pixel antialiasing noise on
      // SVG curve edges and rounded corners without hiding real regressions.
      maxDiffPixelRatio: 0.01,
      // Per-pixel color-distance sensitivity (0–1). 0.2 is the Playwright
      // default; explicit here so a future default change is visible in diff.
      threshold: 0.2,
      // Freeze CSS animations / transitions before the shot. Matches the
      // prefers-reduced-motion emulation applied in each test as belt-and-braces.
      animations: 'disabled',
    },
  },

  use: {
    // Fixed 800×600 viewport — wide enough to lay out the panel chrome,
    // palette chart (600px container), and color picker (320px card).
    viewport: { width: 800, height: 600 },
  },

  projects: [
    {
      name: 'light',
      use: {
        colorScheme: 'light',
      },
    },
    {
      name: 'dark',
      use: {
        colorScheme: 'dark',
      },
    },
  ],
});
