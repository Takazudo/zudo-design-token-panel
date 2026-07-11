// @vitest-environment jsdom

/**
 * Multi-instance Astro soft-nav lifecycle tests for issue #449.
 *
 * Verifies that unmountForSwap / reapplyFromStorage loop ALL registered panel
 * instances instead of only the default one.
 *
 * Acceptance criteria (issue #449):
 *   1. Two prefixes configured and mounted; astro:before-swap unmounts both
 *      cleanly (render(null)); astro:page-load re-materialises the visible ones.
 *   2. No window/document listener growth across repeated simulated soft
 *      navigations (leak assertion).
 *   3. Existing lifecycle/host-adapter tests remain green (verified separately).
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { __resetInstanceBindingsForTests } from '../index';
import {
  __resetPanelConfigForTests,
  configurePanel,
  panelRootId,
  storageKey_visible,
  type PanelConfig,
} from '../config/panel-config';

// -------------------------------------------------------------------------
// Helpers
// -------------------------------------------------------------------------

function makeConfig(prefix: string, overrides: Partial<PanelConfig> = {}): PanelConfig {
  return {
    storagePrefix: prefix,
    consoleNamespace: prefix,
    modalClassPrefix: `${prefix}-modal`,
    schemaId: `${prefix}/v1`,
    exportFilenameBase: prefix,
    tabs: [],
    ...overrides,
  };
}

const OPEN_PANEL_HEADER_TEXT = 'zdtp';

async function waitForEffectFlush(): Promise<void> {
  await new Promise<void>((resolve) =>
    requestAnimationFrame(() => requestAnimationFrame(() => resolve())),
  );
  await new Promise<void>((resolve) => setTimeout(resolve, 50));
}

function rootFor(cfg: PanelConfig): HTMLElement | null {
  return document.getElementById(panelRootId(cfg));
}

function isMounted(cfg: PanelConfig): boolean {
  return rootFor(cfg) !== null;
}

function isOpen(cfg: PanelConfig): boolean {
  const root = rootFor(cfg);
  return !!root && (root.textContent ?? '').includes(OPEN_PANEL_HEADER_TEXT);
}

function setVisible(cfg: PanelConfig, visible: boolean): void {
  localStorage.setItem(storageKey_visible(cfg), visible ? '1' : '0');
}

function dispatchBeforeSwap(): void {
  document.dispatchEvent(new CustomEvent('astro:before-swap'));
}

function dispatchPageLoad(): void {
  document.dispatchEvent(new CustomEvent('astro:page-load'));
}

// -------------------------------------------------------------------------
// Test setup
// -------------------------------------------------------------------------

describe('Astro multi-instance soft-nav lifecycle (#449)', () => {
  beforeEach(() => {
    __resetInstanceBindingsForTests();
    __resetPanelConfigForTests();
    localStorage.clear();
    document.body.innerHTML = '';
    // Clear per-test window adapter state so the astro fallback re-binds.
    const w = window as unknown as Record<string, unknown>;
    delete w.__zudoDesignTokenPanelAdapter;
    delete w.__zudoDesignTokenPanelLifecycle;
    delete w.__zudoDesignTokenPanelInstanceBindings;
  });

  afterEach(() => {
    __resetInstanceBindingsForTests();
    document.body.innerHTML = '';
    localStorage.clear();
  });

  // -----------------------------------------------------------------------
  // Test 1: before-swap unmounts ALL instances; page-load re-materialises
  // the visible ones.
  // -----------------------------------------------------------------------
  it('before-swap unmounts both panels; page-load re-materialises the visible one', async () => {
    // Import the module (installs astro fallback listeners).
    await import('../index');

    const cfgA = makeConfig('alpha');
    const cfgB = makeConfig('beta');
    configurePanel(cfgA);
    configurePanel(cfgB);

    // Mark A as visible, B as not visible.
    setVisible(cfgA, true);
    setVisible(cfgB, false);

    // Page-load: A should mount and open; B should not mount (no overrides/autoload).
    dispatchPageLoad();
    await waitForEffectFlush();

    expect(isMounted(cfgA), 'A mounts on page-load when visible').toBe(true);
    expect(isOpen(cfgA), 'A opens on page-load when visible').toBe(true);
    expect(isMounted(cfgB), 'B stays unmounted (not visible, no overrides)').toBe(false);

    // Before-swap: A must be cleanly unmounted (render(null) fires its useEffect
    // cleanups). B was not mounted so there is nothing to unmount.
    dispatchBeforeSwap();
    await waitForEffectFlush();

    expect(isMounted(cfgA), 'A unmounted on before-swap').toBe(false);
    expect(isMounted(cfgB), 'B stays unmounted after before-swap').toBe(false);

    // Page-load again: A is visible → re-materialises; B is not → stays down.
    dispatchPageLoad();
    await waitForEffectFlush();

    expect(isMounted(cfgA), 'A re-materialises on second page-load').toBe(true);
    expect(isOpen(cfgA), 'A opens on second page-load').toBe(true);
    expect(isMounted(cfgB), 'B still unmounted on second page-load').toBe(false);
  });

  it('before-swap unmounts BOTH mounted panels; page-load remounts each visible one', async () => {
    await import('../index');

    const cfgA = makeConfig('alpha');
    const cfgB = makeConfig('beta');
    configurePanel(cfgA);
    configurePanel(cfgB);

    // Mark both as visible.
    setVisible(cfgA, true);
    setVisible(cfgB, true);

    dispatchPageLoad();
    await waitForEffectFlush();

    expect(isMounted(cfgA), 'A mounts on page-load').toBe(true);
    expect(isMounted(cfgB), 'B mounts on page-load').toBe(true);
    expect(isOpen(cfgA), 'A is open').toBe(true);
    expect(isOpen(cfgB), 'B is open').toBe(true);

    // Before-swap: BOTH must be unmounted.
    dispatchBeforeSwap();
    await waitForEffectFlush();

    expect(isMounted(cfgA), 'A unmounted on before-swap').toBe(false);
    expect(isMounted(cfgB), 'B unmounted on before-swap').toBe(false);

    // Page-load: both visible → both remount.
    dispatchPageLoad();
    await waitForEffectFlush();

    expect(isMounted(cfgA), 'A remounts on page-load').toBe(true);
    expect(isMounted(cfgB), 'B remounts on page-load').toBe(true);
  });

  // -----------------------------------------------------------------------
  // Test 2: No window/document listener growth across repeated soft navs.
  //
  // With the bug: each soft nav accumulates an extra set of listeners for
  // the non-default panel because render(null) was never called for it, so
  // its useEffect cleanups never fired and the panel re-mounted without
  // removing the previous listeners. The expected call count should be
  // roughly constant between cycles (±small tolerance for internal bookkeeping).
  // -----------------------------------------------------------------------
  it('window.addEventListener call count does not grow across repeated soft navigations', async () => {
    await import('../index');

    const cfgA = makeConfig('alpha');
    const cfgB = makeConfig('beta');
    configurePanel(cfgA);
    configurePanel(cfgB);

    setVisible(cfgA, true);
    setVisible(cfgB, true);

    // First page-load: mount both.
    dispatchPageLoad();
    await waitForEffectFlush();

    // Start counting window.addEventListener calls from this point.
    // Each full cycle (before-swap + page-load) should add the same number
    // of listeners as the previous one — constant, not growing.
    const addEventListenerSpy = vi.spyOn(window, 'addEventListener');

    const callCountsPerCycle: number[] = [];

    for (let cycle = 0; cycle < 3; cycle++) {
      addEventListenerSpy.mockClear();

      dispatchBeforeSwap();
      await waitForEffectFlush();
      dispatchPageLoad();
      await waitForEffectFlush();

      callCountsPerCycle.push(addEventListenerSpy.mock.calls.length);
    }

    addEventListenerSpy.mockRestore();

    // Each cycle must have the same addEventListener call count. A growing
    // count means listeners are leaking (old ones not cleaned up, new ones
    // accumulating).
    const [first, ...rest] = callCountsPerCycle;
    for (const count of rest) {
      expect(count, `listener count grew from ${first} to ${count} — leak detected`).toBe(first);
    }
  });
});
