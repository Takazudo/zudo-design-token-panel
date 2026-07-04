// @vitest-environment jsdom

/**
 * Tests for the host-adapter owner-autoload wiring added in #419 (S2).
 *
 * Coverage:
 *   1. Eager-load gate fires on each of the 4 signals (wasVisible,
 *      hasPersistedOverrides, shouldAutoload, loadElementPathEnabled).
 *   2. enableAutoload() / disableAutoload() set/clear the right storage keys,
 *      including the open key on disable.
 *   3. Auto-remember: showDesignPanel() and toggleDesignPanel() write
 *      :autoload = '1' when the action results in the panel being open.
 *   4. Console global installs idempotently across view-transition reruns.
 *
 * Bootstrap strategy
 * ------------------
 * Each test calls bootstrapAdapter(), which:
 *   (a) calls vi.resetModules() so the adapter IIFE re-runs on the next import;
 *   (b) clears the shared globalThis panel-config registry via
 *       __resetPanelConfigForTests() from the freshly-imported module;
 *   (c) imports the adapter so its IIFE runs with the current localStorage /
 *       window state.
 *
 * Module resolution for @takazudo/zdtp
 * -------------------------------------
 * The adapter calls `import('@takazudo/zdtp')` (package self-reference) inside
 * loadPanelModule. In tests there is no compiled dist/. vitest.config.ts adds a
 * resolve alias so that import resolves to src/index.tsx (the real source). This
 * means the panel module's top-level code runs when loadPanelModule is called —
 * the same pattern the existing panel-lifecycle tests follow (they import
 * ../index directly). Both the adapter and the panel module share the same
 * panel-config module instance (and therefore the same globalThis registry), so
 * the singleton-sharing check inside loadPanelModule passes without a warning.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  __resetPanelConfigForTests,
  storageKey_autoload,
  storageKey_visible,
  type PanelConfig,
} from '../config/panel-config';
import { getOpenKey } from '../state/tweak-state';
import { flushEffects } from './_test-helpers';

const CFG: PanelConfig = {
  storagePrefix: 'test-hdal',
  consoleNamespace: 'testHdal',
  modalClassPrefix: 'test-hdal-modal',
  schemaId: 'test-hdal/v1',
  exportFilenameBase: 'test-hdal-tokens',
  tabs: [],
  colorPresets: {},
  applyEndpoint: undefined,
  applyRouting: undefined,
};

// Derived storage key strings — computed from the static config object, safe
// to call before any configurePanel() because they only compute strings.
const AUTOLOAD_KEY = storageKey_autoload(CFG); // 'test-hdal:autoload'
const VISIBLE_KEY = storageKey_visible(CFG); // 'test-hdal:visible'
const OPEN_KEY = getOpenKey(CFG); // 'test-hdal-open'
const ELPATH_KEY = `${CFG.storagePrefix}-elpath-enabled`; // 'test-hdal-elpath-enabled'
const STATEV3_KEY = `${CFG.storagePrefix}-state-v3`; // 'test-hdal-state-v3'

/** Set up the inline-config script element the adapter reads on bootstrap. */
function setupConfigScript(): void {
  let el = document.getElementById('tokenpanel-config');
  if (!el) {
    const script = document.createElement('script');
    script.id = 'tokenpanel-config';
    (script as HTMLScriptElement).type = 'application/json';
    document.head.appendChild(script);
    el = script;
  }
  el.textContent = JSON.stringify(CFG);
}

/**
 * Bootstrap the adapter fresh for a test:
 *   1. vi.resetModules() — clear the module cache so the adapter IIFE and
 *      the panel module (src/index.tsx) re-run on the next import.
 *   2. __resetPanelConfigForTests() — clear the shared globalThis panel-
 *      config registry so configurePanel() treats this as a first-time call.
 *   3. import('../astro/host-adapter') — run the adapter IIFE with the
 *      current localStorage / DOM state.
 */
async function bootstrapAdapter(): Promise<void> {
  vi.resetModules();
  const { __resetPanelConfigForTests: reset } = await import('../config/panel-config');
  reset();
  await import('../astro/host-adapter');
}

/** Read the adapter's per-prefix runtime state from the window slot. */
function adapterState(): { bound: boolean; modulePromise: unknown } | null {
  const map = (window as unknown as Record<string, unknown>).__zudoDesignTokenPanelAdapter as
    | Record<string, unknown>
    | undefined;
  return (map?.[CFG.storagePrefix] ?? null) as { bound: boolean; modulePromise: unknown } | null;
}

/** Typed access to the console namespace the adapter installs. */
type ConsoleApiSurface = {
  showDesignPanel: () => Promise<void>;
  hideDesignPanel: () => Promise<void>;
  toggleDesignPanel: () => Promise<void>;
  enableAutoload: () => Promise<void>;
  disableAutoload: () => Promise<void>;
};
function api(): ConsoleApiSurface {
  return (window as unknown as Record<string, unknown>)[CFG.consoleNamespace] as ConsoleApiSurface;
}

describe('host-adapter owner-autoload wiring (S2 #419)', () => {
  beforeEach(() => {
    setupConfigScript();
    localStorage.clear();
    document.body.innerHTML = '';
    // Clear all window adapter slots so each test gets a clean runtime state.
    const w = window as unknown as Record<string, unknown>;
    delete w.__zudoDesignTokenPanelAdapter;
    delete w.__zudoDesignTokenPanelLifecycle; // panel module's own lifecycle flag
    delete w[CFG.consoleNamespace];
    __resetPanelConfigForTests();
  });

  afterEach(() => {
    localStorage.clear();
    document.body.innerHTML = '';
    document.head.innerHTML = '';
    vi.restoreAllMocks();
  });

  // ---------------------------------------------------------------------------
  // 1. Eager-load gate — each of the 4 signals triggers loadPanelModule
  // ---------------------------------------------------------------------------

  describe('eager-load gate', () => {
    it('does NOT fire when no signal is set (baseline)', async () => {
      await bootstrapAdapter();
      expect(adapterState()?.modulePromise).toBeNull();
    });

    it('fires on wasVisible signal (:visible = "1")', async () => {
      localStorage.setItem(VISIBLE_KEY, '1');
      await bootstrapAdapter();
      expect(adapterState()?.modulePromise).not.toBeNull();
    });

    it('fires on hasPersistedOverrides signal (v3 state key present)', async () => {
      localStorage.setItem(STATEV3_KEY, '{}');
      await bootstrapAdapter();
      expect(adapterState()?.modulePromise).not.toBeNull();
    });

    it('fires on shouldAutoload signal (:autoload = "1")', async () => {
      localStorage.setItem(AUTOLOAD_KEY, '1');
      await bootstrapAdapter();
      expect(adapterState()?.modulePromise).not.toBeNull();
    });

    it('fires on loadElementPathEnabled signal (elpath-enabled = "1")', async () => {
      localStorage.setItem(ELPATH_KEY, '1');
      await bootstrapAdapter();
      expect(adapterState()?.modulePromise).not.toBeNull();
    });
  });

  // ---------------------------------------------------------------------------
  // 2. enableAutoload() / disableAutoload() storage keys
  // ---------------------------------------------------------------------------

  describe('enableAutoload()', () => {
    it('sets :autoload to "1"', async () => {
      await bootstrapAdapter();
      await api().enableAutoload();
      expect(localStorage.getItem(AUTOLOAD_KEY)).toBe('1');
    });

    it('sets elpath-enabled to "1"', async () => {
      await bootstrapAdapter();
      await api().enableAutoload();
      expect(localStorage.getItem(ELPATH_KEY)).toBe('1');
    });

    it('triggers module load (modulePromise becomes non-null)', async () => {
      await bootstrapAdapter();
      expect(adapterState()?.modulePromise).toBeNull();
      await api().enableAutoload();
      expect(adapterState()?.modulePromise).not.toBeNull();
    });
  });

  describe('disableAutoload()', () => {
    it('removes :autoload key entirely', async () => {
      localStorage.setItem(AUTOLOAD_KEY, '1');
      await bootstrapAdapter();
      await api().disableAutoload();
      expect(localStorage.getItem(AUTOLOAD_KEY)).toBeNull();
    });

    it('sets elpath-enabled to "0"', async () => {
      localStorage.setItem(ELPATH_KEY, '1');
      await bootstrapAdapter();
      await api().disableAutoload();
      expect(localStorage.getItem(ELPATH_KEY)).toBe('0');
    });

    it('sets :visible to "0"', async () => {
      localStorage.setItem(VISIBLE_KEY, '1');
      await bootstrapAdapter();
      await flushEffects(); // let panel module mount/show if gate fired
      await api().disableAutoload();
      expect(localStorage.getItem(VISIBLE_KEY)).toBe('0');
    });

    it('removes the open key', async () => {
      // OPEN_KEY is not a gate signal, so loadPanelModule does not fire.
      localStorage.setItem(OPEN_KEY, '1');
      await bootstrapAdapter();
      await api().disableAutoload();
      expect(localStorage.getItem(OPEN_KEY)).toBeNull();
    });
  });

  // ---------------------------------------------------------------------------
  // 3. Auto-remember — open actions arm :autoload = '1'
  // ---------------------------------------------------------------------------

  describe('auto-remember', () => {
    it('showDesignPanel() sets :autoload to "1"', async () => {
      await bootstrapAdapter();
      await api().showDesignPanel();
      expect(localStorage.getItem(AUTOLOAD_KEY)).toBe('1');
    });

    it('toggleDesignPanel() sets :autoload = "1" when panel opens (OPEN_KEY absent → will open)', async () => {
      // Panel is currently closed — OPEN_KEY is absent.
      await bootstrapAdapter();
      await api().toggleDesignPanel();
      expect(localStorage.getItem(AUTOLOAD_KEY)).toBe('1');
    });

    it('toggleDesignPanel() DOES set :autoload when OPEN_KEY="1" but panel root absent (fresh mount → opens)', async () => {
      // OPEN_KEY='1' with no mounted root — zombie state left by a
      // handle.destroy() + re-configure cycle or an SPA nav that cleared the
      // DOM but left OPEN_KEY behind. The old code incorrectly treated
      // OPEN_KEY='1' as "currently open" and predicted a close. The fix:
      // fresh mount (no root) always opens, so autoload MUST be armed here.
      localStorage.setItem(OPEN_KEY, '1');
      await bootstrapAdapter();
      await api().toggleDesignPanel();
      expect(localStorage.getItem(AUTOLOAD_KEY)).toBe('1');
    });
  });

  // ---------------------------------------------------------------------------
  // 4. Idempotent installation across view-transition reruns
  // ---------------------------------------------------------------------------

  describe('idempotent installation', () => {
    it('installs all five console methods on first bootstrap', async () => {
      await bootstrapAdapter();
      const surface = api();
      expect(typeof surface.showDesignPanel).toBe('function');
      expect(typeof surface.hideDesignPanel).toBe('function');
      expect(typeof surface.toggleDesignPanel).toBe('function');
      expect(typeof surface.enableAutoload).toBe('function');
      expect(typeof surface.disableAutoload).toBe('function');
    });

    it('keeps the API functional after a view-transition rerun (second IIFE with same config)', async () => {
      // First bootstrap — full reset + adapter import.
      await bootstrapAdapter();
      expect(typeof api().enableAutoload).toBe('function');

      // Simulate view-transition rerun: the browser re-executes the adapter
      // script but the panel-config registry (on globalThis) is NOT cleared —
      // it persists across soft-nav. configurePanel() for the same prefix + same
      // config is a no-op (structurally-equal idempotent path). The console API
      // is re-assigned (same closures) and state.bound short-circuits the gate.
      vi.resetModules();
      await import('../astro/host-adapter');

      // API is re-installed and still functional.
      const surface = api();
      expect(typeof surface.enableAutoload).toBe('function');
      expect(typeof surface.disableAutoload).toBe('function');
      // Gate did not re-fire (no signal set, state.bound = true), so
      // modulePromise remains null.
      expect(adapterState()?.modulePromise).toBeNull();
    });
  });
});
