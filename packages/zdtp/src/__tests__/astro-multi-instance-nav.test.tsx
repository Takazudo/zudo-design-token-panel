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
import { act } from 'preact/test-utils';
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

async function dispatchAndFlush(dispatch: () => void): Promise<void> {
  await act(() => {
    dispatch();
  });
}

interface ListenerRegistration {
  target: EventTarget;
  type: string;
  listener: EventListenerOrEventListenerObject;
  capture: boolean;
}

function captureOption(options?: boolean | AddEventListenerOptions | EventListenerOptions): boolean {
  return typeof options === 'boolean' ? options : (options?.capture ?? false);
}

/**
 * Track listeners installed after this helper starts. The DOM deduplicates
 * registrations by target, type, callback, and capture flag, so the tracker
 * mirrors that identity instead of comparing timing-sensitive call totals.
 */
function trackActiveListeners(...targets: EventTarget[]) {
  const active: ListenerRegistration[] = [];
  const spies = targets.flatMap((target) => {
    const originalAdd = target.addEventListener;
    const originalRemove = target.removeEventListener;
    const addSpy = vi.spyOn(target, 'addEventListener').mockImplementation(
      (type, listener, options) => {
        const capture = captureOption(options);
        if (listener !== null) {
          const alreadyActive = active.some(
            (entry) =>
              entry.target === target &&
              entry.type === type &&
              entry.listener === listener &&
              entry.capture === capture,
          );
          if (!alreadyActive) active.push({ target, type, listener, capture });
        }
        originalAdd.call(target, type, listener, options);
      },
    );
    const removeSpy = vi.spyOn(target, 'removeEventListener').mockImplementation(
      (type, listener, options) => {
        const capture = captureOption(options);
        const index = listener === null
          ? -1
          : active.findIndex(
              (entry) =>
                entry.target === target &&
                entry.type === type &&
                entry.listener === listener &&
                entry.capture === capture,
            );
        if (index !== -1) active.splice(index, 1);
        originalRemove.call(target, type, listener, options);
      },
    );
    return [addSpy, removeSpy];
  });

  return {
    activeCount: (target?: EventTarget) =>
      target ? active.filter((entry) => entry.target === target).length : active.length,
    restore: () => spies.forEach((spy) => spy.mockRestore()),
  };
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
    await dispatchAndFlush(dispatchPageLoad);

    expect(isMounted(cfgA), 'A mounts on page-load when visible').toBe(true);
    expect(isOpen(cfgA), 'A opens on page-load when visible').toBe(true);
    expect(isMounted(cfgB), 'B stays unmounted (not visible, no overrides)').toBe(false);

    // Before-swap: A must be cleanly unmounted (render(null) fires its useEffect
    // cleanups). B was not mounted so there is nothing to unmount.
    await dispatchAndFlush(dispatchBeforeSwap);

    expect(isMounted(cfgA), 'A unmounted on before-swap').toBe(false);
    expect(isMounted(cfgB), 'B stays unmounted after before-swap').toBe(false);

    // Page-load again: A is visible → re-materialises; B is not → stays down.
    await dispatchAndFlush(dispatchPageLoad);

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

    await dispatchAndFlush(dispatchPageLoad);

    expect(isMounted(cfgA), 'A mounts on page-load').toBe(true);
    expect(isMounted(cfgB), 'B mounts on page-load').toBe(true);
    expect(isOpen(cfgA), 'A is open').toBe(true);
    expect(isOpen(cfgB), 'B is open').toBe(true);

    // Before-swap: BOTH must be unmounted.
    await dispatchAndFlush(dispatchBeforeSwap);

    expect(isMounted(cfgA), 'A unmounted on before-swap').toBe(false);
    expect(isMounted(cfgB), 'B unmounted on before-swap').toBe(false);

    // Page-load: both visible → both remount.
    await dispatchAndFlush(dispatchPageLoad);

    expect(isMounted(cfgA), 'A remounts on page-load').toBe(true);
    expect(isMounted(cfgB), 'B remounts on page-load').toBe(true);
  });

  // -----------------------------------------------------------------------
  // Test 2: No window/document listener growth across repeated soft navs.
  //
  // With the bug: each soft nav accumulates an extra set of listeners for
  // the non-default panel because render(null) was never called for it, so
  // its useEffect cleanups never fired and the panel re-mounted without
  // removing the previous listeners. Track listener identity across each
  // unmount/remount so stale callbacks increase the active count immediately.
  // -----------------------------------------------------------------------
  it('active window/document listeners do not grow across repeated soft navigations', async () => {
    await import('../index');

    const listeners = trackActiveListeners(window, document);
    try {
      const cfgA = makeConfig('alpha');
      const cfgB = makeConfig('beta');
      configurePanel(cfgA);
      configurePanel(cfgB);

      setVisible(cfgA, true);
      setVisible(cfgB, true);

      // First page-load: mount both.
      await dispatchAndFlush(dispatchPageLoad);
      const mountedListenerCount = listeners.activeCount();
      const mountedWindowListenerCount = listeners.activeCount(window);
      const mountedDocumentListenerCount = listeners.activeCount(document);
      expect(mountedListenerCount, 'mounted panels install tracked listeners').toBeGreaterThan(0);

      for (let cycle = 0; cycle < 3; cycle++) {
        await dispatchAndFlush(dispatchBeforeSwap);
        expect(
          listeners.activeCount(),
          `cycle ${cycle + 1} before-swap removes mounted-panel listeners`,
        ).toBeLessThan(mountedListenerCount);

        await dispatchAndFlush(dispatchPageLoad);
        expect(
          listeners.activeCount(window),
          `cycle ${cycle + 1} page-load restores stable window listeners`,
        ).toBe(mountedWindowListenerCount);
        expect(
          listeners.activeCount(document),
          `cycle ${cycle + 1} page-load restores stable document listeners`,
        ).toBe(mountedDocumentListenerCount);
      }
    } finally {
      listeners.restore();
    }
  });
});
