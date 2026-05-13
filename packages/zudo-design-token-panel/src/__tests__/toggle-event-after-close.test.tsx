// @vitest-environment jsdom

/**
 * Regression test for the click-twice-after-close bug.
 *
 * Reported symptom:
 *
 *   1. Page loads. User clicks header palette button → first event
 *      dispatches `toggle-design-token-panel`. Panel mounts open.
 *   2. User clicks the in-panel close (X) button → `open=false`,
 *      OPEN_KEY removed from localStorage. Panel renders null.
 *   3. User clicks header palette button again. Expected: panel
 *      re-opens with one click. Actual (pre-fix): nothing happens.
 *      A second click is required to re-open.
 *
 * Why the previous design was brittle
 * -----------------------------------
 * The dual-listener pattern registered two handlers for
 * `toggle-design-token-panel`:
 *
 *   - Module-scope handler (`onMaybeMount` in `index.tsx`) —
 *     short-circuited when the panel root div existed.
 *   - In-component handler (`handleToggle` in `panel.tsx`'s
 *     `useEffect`) — toggled internal `open` state via
 *     `setOpen((prev) => !prev)`.
 *
 * After mount the toggle relied entirely on the in-component
 * handler. That listener is only attached after Preact flushes
 * effects on `requestAnimationFrame`, and host wrappers (deferred
 * Islands, SSR shims, SPA-nav bridges) can detach it in subtle
 * ways. Whenever the listener is missing, the click is silently
 * dropped.
 *
 * The fix consolidates authority into `localStorage[OPEN_KEY]`:
 * the module-scope handler flips it on every event and dispatches
 * an internal `__zdtp:open-state-changed` sync event; the panel's
 * listener just re-reads storage. No `prev`-based arithmetic, no
 * dual-listener race.
 */

import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { getOpenKey } from '../state/tweak-state';
import {
  __resetPanelConfigForTests,
  getPanelConfig,
  panelRootId,
} from '../config/panel-config';

const PANEL_ROOT_ID = panelRootId(getPanelConfig());
const OPEN_PANEL_HEADER_TEXT = 'Design Tokens';
const TOGGLE_EVENT = 'toggle-design-token-panel';

async function waitForEffectFlush(): Promise<void> {
  await new Promise<void>((resolve) =>
    requestAnimationFrame(() => requestAnimationFrame(() => resolve())),
  );
  await new Promise<void>((resolve) => setTimeout(resolve, 50));
}

describe('design-token-panel — toggle event after close', () => {
  beforeEach(() => {
    __resetPanelConfigForTests();
    localStorage.clear();
    document.body.innerHTML = '';
    const w = window as unknown as Record<string, unknown>;
    delete w.__zudoDesignTokenPanelAdapter;
    delete w.__zudoDesignTokenPanelLifecycle;
  });

  afterEach(() => {
    document.body.innerHTML = '';
    localStorage.clear();
  });

  it('re-opens with one click after the in-panel close button hides the panel', async () => {
    // Force module init to run with our clean slate.
    await import('../index');

    // --- Click 1: open ---
    window.dispatchEvent(new CustomEvent(TOGGLE_EVENT));
    await waitForEffectFlush();

    const root = document.getElementById(PANEL_ROOT_ID);
    expect(root, 'panel root should mount on first event').not.toBeNull();
    expect(root!.textContent ?? '').toContain(OPEN_PANEL_HEADER_TEXT);
    expect(localStorage.getItem(getOpenKey())).toBe('1');

    // --- Simulate the in-panel close button ---
    // The close button calls `setOpen(false)`; the open-state effect
    // then removes OPEN_KEY. We can't reach the button directly here
    // (it would couple us to ARIA selectors), so we drive the same
    // observable outcome by reading the close button from the DOM
    // and clicking it.
    // Close button is now a div[role=button] per #149 chrome-button policy
    const closeBtn = root!.querySelector<HTMLElement>('.tokenpanel-close-btn');
    expect(closeBtn, 'close button should render while panel is open').not.toBeNull();
    closeBtn!.click();
    await waitForEffectFlush();

    expect(localStorage.getItem(getOpenKey()), 'OPEN_KEY removed after close').toBeNull();
    // Panel component is still mounted; its render is null, so the root is empty.
    expect(root!.textContent ?? '').not.toContain(OPEN_PANEL_HEADER_TEXT);

    // --- Click 2: re-open. THIS is the regression assertion. ---
    window.dispatchEvent(new CustomEvent(TOGGLE_EVENT));
    await waitForEffectFlush();

    expect(localStorage.getItem(getOpenKey()), 'OPEN_KEY back to "1" after one event').toBe('1');
    expect(root!.textContent ?? '', 'panel content visible after one re-open click').toContain(
      OPEN_PANEL_HEADER_TEXT,
    );
  });
});
