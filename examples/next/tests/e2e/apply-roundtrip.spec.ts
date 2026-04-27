/**
 * Apply-pipeline round-trip spec for the Next.js example.
 *
 * Drives the panel UI to tweak a token, click Apply, and asserts the demo
 * tokens CSS file on disk (`src/styles/tokens.css`) was rewritten by the
 * bin sidecar. The full bin → file rewrite path is what the spec proves;
 * the panel's in-memory `:root` override is exercised as a side effect.
 *
 * Prerequisites
 * -------------
 *  - Next dev server on port 44326 (started by the Playwright `webServer`
 *    config OR by an upstream `pnpm dev` invocation).
 *  - Bin sidecar `design-token-panel-server` on port 24684, with
 *    `--write-root .` and `--routing scaffold.routing.json` pointing at
 *    this example's tree.
 *
 * Both are wired by `pnpm dev` (concurrently), so the local-run flow is:
 *
 *   pnpm --filter next-example dev
 *   # in another shell:
 *   pnpm --filter next-example exec playwright test
 *
 * Visibility seed
 * ---------------
 * Step 1 seeds `${storagePrefix}:visible = '1'` (the canonical truthy value
 * the panel module writes; see `src/index.tsx` in the package). On reload,
 * the React app's `useEffect` (in `app/_components/PanelBootstrap.tsx`)
 * calls `mountPanel()`, which reads the flag and eagerly imports the panel
 * module before first paint — same code path the Astro host adapter takes
 * when the visible flag is set, and same code path the Vite + React
 * sibling spec exercises.
 *
 * Try/finally restores the original token value so re-running the spec is
 * idempotent. The original value is captured at the start; if any assertion
 * fails before restoration, the after-hook still rewrites the original
 * value via the bin so the file on disk lands in a known-good state.
 */

import { test, expect } from '@playwright/test';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const TOKENS_PATH = resolve(__dirname, '..', '..', 'src', 'styles', 'tokens.css');
const APPLY_URL = 'http://127.0.0.1:24684/apply';
const ORIGIN = 'http://localhost:44326';

const STORAGE_PREFIX = 'next-example-tokens';
const STORAGE_KEY_VISIBLE = `${STORAGE_PREFIX}:visible`;

async function readTokenValue(cssVar: string): Promise<string> {
  const css = await readFile(TOKENS_PATH, 'utf-8');
  const escaped = cssVar.replace(/-/g, '\\-');
  const re = new RegExp(`${escaped}:\\s*([^;]+);`);
  const m = css.match(re);
  if (!m) {
    throw new Error(`Could not find ${cssVar} in ${TOKENS_PATH}`);
  }
  return m[1].trim();
}

async function postApply(cssVar: string, value: string): Promise<void> {
  const response = await fetch(APPLY_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Origin: ORIGIN,
    },
    body: JSON.stringify({ tokens: { [cssVar]: value } }),
  });
  if (!response.ok) {
    const text = await response.text().catch(() => '');
    throw new Error(`POST /apply failed (${response.status}): ${text}`);
  }
}

test.describe('Next.js example — apply pipeline round-trip', () => {
  const TARGET_VAR = '--nextexample-radius';
  const TEST_VALUE = '1.25rem';
  let originalValue = '';

  test.beforeAll(async () => {
    originalValue = await readTokenValue(TARGET_VAR);
    if (originalValue === TEST_VALUE) {
      throw new Error(
        `Test value ${TEST_VALUE} matches original — pick a different test value.`,
      );
    }
  });

  test.afterAll(async () => {
    // Restore the original token value via the bin so the test file lands
    // in a known-good state regardless of how the test exited.
    if (originalValue) {
      try {
        await postApply(TARGET_VAR, originalValue);
      } catch {
        // Best-effort restoration — the in-band assertion already failed if
        // we get here; surfacing the secondary error would mask the primary.
      }
    }
  });

  test('panel-driven Apply rewrites the on-disk token value', async ({ page }) => {
    // Step 1: seed visibility intent so the host adapter eagerly mounts the
    // panel pre-paint (avoids needing a console-API call in the spec body).
    // The canonical truthy value is '1' — see packages/.../src/index.tsx.
    // Path includes the example's basePath ('/pj/zudo-design-token-panel/next') because the
    // dev server only serves the app under that subpath.
    await page.goto('/pj/zudo-design-token-panel/next/');
    await page.waitForLoadState('domcontentloaded');
    await page.evaluate((visibleKey) => {
      localStorage.setItem(visibleKey, '1');
    }, STORAGE_KEY_VISIBLE);

    // Step 2: hard-reload — adapter must mount the panel before paint.
    await page.reload();
    await page.waitForLoadState('domcontentloaded');

    // Step 3: open the Size tab and set the radius slider to TEST_VALUE.
    // The panel ships role-tagged tabs; pick the Size tab and drive the
    // first numeric input within it. The exact selector path depends on
    // the panel's rendered DOM; the deferred verification step in the
    // README covers the click-Apply phase manually.
    const sizeTab = page.getByRole('tab', { name: /size/i });
    await sizeTab.waitFor({ state: 'visible', timeout: 5000 });
    await sizeTab.click();

    const radiusInput = page.getByLabel(/border radius/i).first();
    await radiusInput.waitFor({ state: 'visible', timeout: 5000 });
    await radiusInput.fill('1.25');

    // Step 4: click the Apply button in the panel chrome and confirm in
    // the resulting modal.
    const applyButton = page.getByRole('button', { name: /^apply$/i }).first();
    await applyButton.waitFor({ state: 'visible', timeout: 5000 });
    await applyButton.click();

    const confirmButton = page.getByRole('button', { name: /confirm|apply now|write/i }).first();
    await confirmButton.waitFor({ state: 'visible', timeout: 5000 });
    await confirmButton.click();

    // Step 5: poll the file on disk for the rewritten value. The bin
    // writes atomically via a temp-file rename, so the new contents
    // appear in a single fs operation; polling avoids a race with the
    // server's HTTP response landing before the rename completes.
    await expect
      .poll(
        async () => {
          try {
            return await readTokenValue(TARGET_VAR);
          } catch {
            return '';
          }
        },
        { timeout: 5000, intervals: [100, 250, 500] },
      )
      .toBe(TEST_VALUE);
  });
});
