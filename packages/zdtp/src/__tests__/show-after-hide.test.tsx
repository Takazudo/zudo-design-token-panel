// @vitest-environment jsdom

/**
 * Regression test for issue #223 — programmatic show-after-hide.
 *
 * Reported symptom:
 *
 *   1. `showDesignTokenPanel()` — panel mounts open.
 *   2. `hideDesignTokenPanel()` — OPEN_KEY removed, panel renders null.
 *   3. `showDesignTokenPanel()` again — Expected: panel re-renders open.
 *      Actual (pre-fix): nothing happens; panel stays invisible.
 *
 * Root cause
 * ----------
 * `showDesignTokenPanel()` gated its `notifyPanelOpenChanged()` call on
 * `isPanelCurrentlyOpen() === false`. But `seedOpenStateBeforeMount(true)`
 * runs first and writes `OPEN_KEY = '1'`, so the post-seed probe always
 * reads "open" and the gate is never satisfied on the steady-state re-show
 * path. The mounted panel's sync-event listener never fired, so `setOpen`
 * never flipped back to `true`.
 *
 * Fix: always notify on the non-fresh-mount path, mirroring
 * `hideDesignTokenPanel()`. The sync event is idempotent.
 *
 * This complements `toggle-event-after-close.test.tsx`, which only covers
 * the header-button `toggle-design-token-panel` event path — not the
 * programmatic `show`/`hide` API.
 */

import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { getOpenKey } from '../state/tweak-state';
import { __resetPanelConfigForTests, getPanelConfig, panelRootId } from '../config/panel-config';
import { flushEffects } from './_test-helpers';

const PANEL_ROOT_ID = panelRootId(getPanelConfig());
const OPEN_PANEL_HEADER_TEXT = 'Design Tokens';

describe('design-token-panel — programmatic show after hide', () => {
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

  it('re-renders the panel on show → hide → show, repeatable 3×', async () => {
    const { showDesignTokenPanel, hideDesignTokenPanel } = await import('../index');

    // --- Initial show: fresh mount ---
    showDesignTokenPanel();
    await flushEffects();

    const root = document.getElementById(PANEL_ROOT_ID);
    expect(root, 'panel root should mount on first show').not.toBeNull();
    expect(root!.textContent ?? '').toContain(OPEN_PANEL_HEADER_TEXT);
    expect(localStorage.getItem(getOpenKey())).toBe('1');

    // --- Three full hide → show cycles against the already-mounted panel ---
    for (let cycle = 1; cycle <= 3; cycle++) {
      hideDesignTokenPanel();
      await flushEffects();
      expect(
        localStorage.getItem(getOpenKey()),
        `cycle ${cycle}: OPEN_KEY removed after hide`,
      ).toBeNull();
      expect(root!.textContent ?? '', `cycle ${cycle}: panel content hidden`).not.toContain(
        OPEN_PANEL_HEADER_TEXT,
      );

      showDesignTokenPanel();
      await flushEffects();
      expect(localStorage.getItem(getOpenKey()), `cycle ${cycle}: OPEN_KEY back to "1"`).toBe('1');
      expect(
        root!.textContent ?? '',
        `cycle ${cycle}: panel content visible after re-show`,
      ).toContain(OPEN_PANEL_HEADER_TEXT);
    }
  });
});
