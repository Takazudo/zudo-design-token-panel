/**
 * Tests that verify the globalThis singleton slot behaviour introduced in
 * epic #108 / issue #109.
 *
 * The core regression: Vite multi-entry builds can produce two separate module
 * instances of panel-config.ts (host-adapter chunk + panel chunk). Module-scope
 * `let` bindings are per-instance; globalThis slots are shared. These tests
 * simulate two-instance access by using vi.resetModules() between dynamic
 * imports and assert that state written through instance A is visible via
 * instance B.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type {
  configurePanel as ConfigurePanelFn,
  getPanelConfig as GetPanelConfigFn,
  __resetPanelConfigForTests as ResetFn,
  PanelConfig,
} from '../config/panel-config';

const SLOT_SYMBOL = Symbol.for('@takazudo/zudo-design-token-panel:singleton');

const BASE_CONFIG: PanelConfig = {
  storagePrefix: 'test-singleton',
  consoleNamespace: 'test',
  modalClassPrefix: 'test-modal',
  schemaId: 'test/v1',
  exportFilenameBase: 'test-tokens',
  tabs: [],
};

/**
 * Clear the globalThis slot between tests so each test starts from a known
 * clean state regardless of which module instance reset last.
 */
function clearGlobalThisSlot() {
  delete (globalThis as unknown as Record<symbol, unknown>)[SLOT_SYMBOL];
}

beforeEach(() => {
  clearGlobalThisSlot();
});

afterEach(() => {
  clearGlobalThisSlot();
  vi.resetModules();
});

describe('panel-config globalThis singleton — multi-instance isolation', () => {
  it('configurePanel called on instance A is visible via getPanelConfig on instance B', async () => {
    // Dynamic import gives us instance A.
    const instanceA = await import('../config/panel-config');

    // Reset the module registry so the next import produces a fresh module
    // instance — simulating the two-chunk scenario. globalThis is left intact.
    vi.resetModules();

    // Dynamic import gives us instance B (different module object, same globalThis).
    const instanceB = await import('../config/panel-config');

    // Confirm the two instances ARE actually different module objects.
    expect(instanceA.configurePanel).not.toBe(instanceB.configurePanel);

    // Call configurePanel through instance A.
    (instanceA.configurePanel as typeof ConfigurePanelFn)(BASE_CONFIG);

    // getPanelConfig through instance B must return the same object — reference
    // equality, not merely structural equality. This is the exact check that
    // host-adapter.ts uses (adapterView !== panelView) to detect singleton
    // fragmentation.
    const cfgA = (instanceA.getPanelConfig as typeof GetPanelConfigFn)();
    const cfgB = (instanceB.getPanelConfig as typeof GetPanelConfigFn)();

    expect(cfgB).toBe(cfgA);
  });

  it('__resetPanelConfigForTests on instance A also resets what instance B sees', async () => {
    const instanceA = await import('../config/panel-config');
    (instanceA.configurePanel as typeof ConfigurePanelFn)(BASE_CONFIG);

    vi.resetModules();
    const instanceB = await import('../config/panel-config');

    // Sanity: B sees the configured config before reset.
    expect((instanceB.getPanelConfig as typeof GetPanelConfigFn)()).not.toBe(
      instanceB.DEFAULT_PANEL_CONFIG,
    );

    // Reset through A — should clear the shared globalThis slot.
    (instanceA.__resetPanelConfigForTests as typeof ResetFn)();

    // B must now return DEFAULT_PANEL_CONFIG (slot is empty).
    expect((instanceB.getPanelConfig as typeof GetPanelConfigFn)()).toEqual(
      instanceB.DEFAULT_PANEL_CONFIG,
    );
  });

  it('singleton-sharing check: no "Singleton-sharing check failed" warning is emitted', async () => {
    // This test maps directly to acceptance criterion 3 of issue #109.
    // host-adapter.ts emits a console.warn with the prefix
    // "Singleton-sharing check failed:" when adapterView !== panelView.
    // After the globalThis fix, both instances observe the same slot object,
    // so the condition is always false and no warning is emitted.
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

    try {
      const instanceA = await import('../config/panel-config');
      (instanceA.configurePanel as typeof ConfigurePanelFn)(BASE_CONFIG);

      vi.resetModules();
      const instanceB = await import('../config/panel-config');

      const adapterView = (instanceA.getPanelConfig as typeof GetPanelConfigFn)();
      const panelView = (instanceB.getPanelConfig as typeof GetPanelConfigFn)();

      // The two views ARE the same object — this is what prevents the warning.
      expect(adapterView).toBe(panelView);

      // Simulate the exact check from host-adapter.ts line 196.
      // The guard only fires when adapterView !== panelView. Since they are
      // equal here, no warn call should have occurred.
      if (adapterView !== panelView) {
        console.warn(
          '[design-token-panel] Singleton-sharing check failed: the host adapter and ' +
            'the panel module observed different PanelConfig singletons.',
        );
      }

      const singletonFailCalls = warnSpy.mock.calls.filter((args) =>
        String(args[0]).includes('Singleton-sharing check failed:'),
      );
      expect(singletonFailCalls).toHaveLength(0);
    } finally {
      warnSpy.mockRestore();
    }
  });
});
