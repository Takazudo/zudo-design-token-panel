// @vitest-environment jsdom

/**
 * Regression test for the auto-mount-with-visibility-flag pre-mount-seed
 * pattern.
 *
 * Repro recipe:
 *
 *   1. localStorage.setItem('<storagePrefix>:visible', '1');
 *   2. (Do NOT touch the OPEN_KEY — leave it absent.)
 *   3. Hard reload.
 *   4. Expected: panel auto-mounts visibly.
 *      Actual (pre-fix): panel does not auto-mount; user has to call
 *      `window.<consoleNamespace>.showDesignPanel()` manually each time.
 *
 * Root cause: `ensureMounted()` renders the Preact shell, then
 * `showDesignTokenPanel` used to call `dispatchToggleAfterMount()`, which
 * queued the toggle event on the microtask queue. But `panel.tsx` registers
 * its toggle listener inside a `useEffect`, and Preact flushes effects via
 * `requestAnimationFrame`. The microtask drained long before the next
 * animation frame, so the dispatched event landed before the listener
 * attached, and the panel stayed closed.
 *
 * When the user had previously opened-then-closed the panel, OPEN_KEY=='1'
 * had been written by panel.tsx; the mount-effect would then read that key
 * and set `open=true` directly, masking the dispatch race. The bug only
 * surfaced when visibility was set without OPEN_KEY.
 *
 * Fix (`seedOpenStateBeforeMount` in index.tsx): on a fresh mount, write
 * OPEN_KEY synchronously *before* calling `render`. `panel.tsx`'s
 * mount-effect then reads the seeded value and sets `open` correctly —
 * no event dispatch, no rAF dependency.
 */

import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { getOpenKey } from '../state/tweak-state';
import {
  __resetPanelConfigForTests,
  getPanelConfig,
  panelRootId,
  storageKey_visible,
} from '../config/panel-config';

// Derived under the default config — under the package's documented
// neutral defaults these MUST match the literals below (see
// panel-config.test.ts for the explicit literal assertions).
const STORAGE_KEY_VISIBLE = storageKey_visible(getPanelConfig());
const PANEL_ROOT_ID = panelRootId(getPanelConfig());

// Sanity-check the literal contract directly here too, so a future config
// drift surfaces in this test file before the e2e behavioural assertions
// even run.
if (STORAGE_KEY_VISIBLE !== 'zudo-design-token-panel:visible') {
  throw new Error(`STORAGE_KEY_VISIBLE drifted: ${STORAGE_KEY_VISIBLE}`);
}
if (PANEL_ROOT_ID !== 'zudo-design-token-panel-root') {
  throw new Error(`PANEL_ROOT_ID drifted: ${PANEL_ROOT_ID}`);
}

/** Tag used in the panel header — see panel.tsx. */
const OPEN_PANEL_HEADER_TEXT = 'Design Tokens';

/**
 * Wait until Preact has flushed pending effects. Preact uses
 * `requestAnimationFrame` to flush effects (with a `setTimeout(35)` fallback
 * inside `w`), so we wait long enough for either path to fire and then yield
 * to any further microtasks.
 */
async function waitForEffectFlush(): Promise<void> {
  await new Promise<void>((resolve) =>
    requestAnimationFrame(() => requestAnimationFrame(() => resolve())),
  );
  // One macrotask tick after the rAFs to let any setTimeout(0) fallbacks run.
  await new Promise<void>((resolve) => setTimeout(resolve, 50));
}

describe('design-token-panel adapter — auto-mount with visibility flag', () => {
  beforeEach(() => {
    // Fresh DOM + storage between tests. Vitest's jsdom env shares one window
    // per test file by default, so we need to reset state explicitly.
    __resetPanelConfigForTests();
    localStorage.clear();
    document.body.innerHTML = '';
    // Drop adapter and module caches so the top-level bootstrap re-runs in
    // each test. Both window slots are cleared because `host-adapter.ts`
    // owns `__zudoDesignTokenPanelAdapter` (per-storagePrefix map) and
    // `index.tsx` owns `__zudoDesignTokenPanelLifecycle` (panel module bind
    // flag). Either could leak into the next test if not reset.
    const adapterWin = window as unknown as Record<string, unknown>;
    delete adapterWin.__zudoDesignTokenPanelAdapter;
    delete adapterWin.__zudoDesignTokenPanelLifecycle;
  });

  afterEach(() => {
    document.body.innerHTML = '';
    localStorage.clear();
  });

  it('renders open panel content when STORAGE_KEY is set without OPEN_KEY', async () => {
    // Set up the canonical bug repro: visibility=1, OPEN_KEY absent.
    localStorage.setItem(STORAGE_KEY_VISIBLE, '1');
    expect(localStorage.getItem(getOpenKey())).toBeNull();

    // Use vi.resetModules + dynamic import so the adapter's top-level
    // bootstrap runs cleanly. We also import inside the test to avoid the
    // module-init side effects firing at file evaluation time (which would
    // happen before our beforeEach storage setup).
    const { showDesignTokenPanel } = await import('../index');

    // The adapter's module-init bootstrap calls `reapplyFromStorage`, which
    // calls `showDesignTokenPanel` internally when wasVisible() is true. But
    // since the import is async and runs once per test process (vitest
    // re-imports between tests via cache reset only when configured), we
    // call `showDesignTokenPanel` explicitly to make the test independent of
    // import timing. The fix path is the same either way.
    showDesignTokenPanel();

    // The panel root must be appended.
    const root = document.getElementById(PANEL_ROOT_ID);
    expect(root).not.toBeNull();

    // Primary user-observable assertion: after Preact flushes the
    // mount-effect, `panel.tsx` must render its open content (the "Design
    // Tokens" header is the easiest unique sentinel). Without the fix,
    // `panel.tsx` reads OPEN_KEY at mount-time, sees it absent, and stays at
    // `open=false` — which renders `null`, leaving the root empty.
    await waitForEffectFlush();
    expect(root!.textContent ?? '').toContain(OPEN_PANEL_HEADER_TEXT);

    // Implementation contract: the fix path seeds OPEN_KEY before mount.
    // Asserted separately so a future change that drives the panel open via
    // a different mechanism would still pass the user-observable check above
    // but flag this assertion as needing the comment above to be revisited.
    expect(localStorage.getItem(getOpenKey())).toBe('1');
  });
});
