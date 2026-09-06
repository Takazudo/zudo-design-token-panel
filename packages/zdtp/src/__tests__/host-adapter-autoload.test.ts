// @vitest-environment jsdom

/**
 * Tests for the host-adapter owner-autoload wiring added in #419 (S2).
 *
 * Coverage:
 *   1. Eager-load gate fires on each signal (wasVisible, the `-open` mirror,
 *      hasPersistedOverrides — now content-checked and matched across the
 *      whole `-state` family, #577 — shouldAutoload, loadElementPathEnabled,
 *      loadDomTweakerEnabled).
 *   2. enableAutoload() / disableAutoload() set/clear the right storage keys,
 *      including the open key on disable.
 *   3. Auto-remember: showDesignPanel() and toggleDesignPanel() write
 *      :autoload = 'auto' when the action results in the panel being open,
 *      leaving an explicit '1' untouched (#576).
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
  domTweaker: {},
};

// Derived storage key strings — computed from the static config object, safe
// to call before any configurePanel() because they only compute strings.
const AUTOLOAD_KEY = storageKey_autoload(CFG); // 'test-hdal:autoload'
const VISIBLE_KEY = storageKey_visible(CFG); // 'test-hdal:visible'
const OPEN_KEY = getOpenKey(CFG); // 'test-hdal-open'
const ELPATH_KEY = `${CFG.storagePrefix}-elpath-enabled`; // 'test-hdal-elpath-enabled'
const DOMTWEAKER_KEY = `${CFG.storagePrefix}-domtweaker-enabled`; // 'test-hdal-domtweaker-enabled'
const STATEV1_KEY = `${CFG.storagePrefix}-state`; // 'test-hdal-state'
const STATEV3_KEY = `${CFG.storagePrefix}-state-v3`; // 'test-hdal-state-v3'
const STATEV4_KEY = `${CFG.storagePrefix}-state-v4`; // 'test-hdal-state-v4'

/** Set up the inline-config script element the adapter reads on bootstrap. */
function setupConfigScript(cfg: PanelConfig = CFG): void {
  let el = document.getElementById('tokenpanel-config');
  if (!el) {
    const script = document.createElement('script');
    script.id = 'tokenpanel-config';
    (script as HTMLScriptElement).type = 'application/json';
    document.head.appendChild(script);
    el = script;
  }
  el.textContent = JSON.stringify(cfg);
}

/**
 * Bootstrap the adapter fresh for a test:
 *   1. vi.resetModules() — clear the module cache so the adapter IIFE and
 *      the panel module (src/index.tsx) re-run on the next import.
 *   2. __resetPanelConfigForTests() — clear the shared globalThis panel-
 *      config registry so configurePanel() treats this as a first-time call.
 *   3. import('../astro/host-adapter') — run the adapter IIFE with the
 *      current localStorage / DOM state.
 *
 * Accepts an optional `cfg` for tests that need a non-default
 * `storagePrefix` (e.g. the sibling-prefix collision cases) — it re-writes
 * the inline config script before importing so the adapter reads it.
 */
async function bootstrapAdapter(cfg: PanelConfig = CFG): Promise<void> {
  setupConfigScript(cfg);
  vi.resetModules();
  const { __resetPanelConfigForTests: reset } = await import('../config/panel-config');
  reset();
  await import('../astro/host-adapter');
}

/** Read the adapter's per-prefix runtime state from the window slot. */
function adapterStateFor(prefix: string): { bound: boolean; modulePromise: unknown } | null {
  const map = (window as unknown as Record<string, unknown>).__zudoDesignTokenPanelAdapter as
    | Record<string, unknown>
    | undefined;
  return (map?.[prefix] ?? null) as { bound: boolean; modulePromise: unknown } | null;
}

function adapterState(): { bound: boolean; modulePromise: unknown } | null {
  return adapterStateFor(CFG.storagePrefix);
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

    it('cold visitor neither enumerates storage nor fetches the panel bundle', async () => {
      const lengthSpy = vi.spyOn(Storage.prototype, 'length', 'get').mockImplementation(() => {
        throw new Error('cold path must not read localStorage.length');
      });
      const keySpy = vi.spyOn(Storage.prototype, 'key').mockImplementation(() => {
        throw new Error('cold path must not call localStorage.key()');
      });
      try {
        await bootstrapAdapter();
        expect(adapterState()?.modulePromise, 'no dynamic panel import').toBeNull();
        expect(lengthSpy).not.toHaveBeenCalled();
        expect(keySpy).not.toHaveBeenCalled();
      } finally {
        lengthSpy.mockRestore();
        keySpy.mockRestore();
      }
    });

    it('fires on wasVisible signal (:visible = "1")', async () => {
      localStorage.setItem(VISIBLE_KEY, '1');
      await bootstrapAdapter();
      expect(adapterState()?.modulePromise).not.toBeNull();
    });

    it('fires on hasPersistedOverrides signal (v3 state key holds a non-empty envelope)', async () => {
      localStorage.setItem(STATEV3_KEY, '{"--x":"1"}');
      await bootstrapAdapter();
      expect(adapterState()?.modulePromise).not.toBeNull();
    });

    it('does NOT fire when the v3 state key holds an empty envelope ({}) — #577', async () => {
      localStorage.setItem(STATEV3_KEY, '{}');
      await bootstrapAdapter();
      expect(adapterState()?.modulePromise).toBeNull();
    });

    it('fires on the -open mirror signal (${prefix}-open = "1")', async () => {
      localStorage.setItem(OPEN_KEY, '1');
      await bootstrapAdapter();
      expect(adapterState()?.modulePromise).not.toBeNull();
    });

    it('fires on shouldAutoload signal (:autoload = "1")', async () => {
      localStorage.setItem(AUTOLOAD_KEY, '1');
      await bootstrapAdapter();
      expect(adapterState()?.modulePromise).not.toBeNull();
    });

    it('fires on the auto-remembered shouldAutoload signal (:autoload = "auto")', async () => {
      localStorage.setItem(AUTOLOAD_KEY, 'auto');
      await bootstrapAdapter();
      expect(adapterState()?.modulePromise).not.toBeNull();
    });

    it('does NOT fire on an unrecognised :autoload value', async () => {
      localStorage.setItem(AUTOLOAD_KEY, '0');
      await bootstrapAdapter();
      expect(adapterState()?.modulePromise).toBeNull();
    });

    it('fires on loadElementPathEnabled signal (elpath-enabled = "1")', async () => {
      localStorage.setItem(ELPATH_KEY, '1');
      await bootstrapAdapter();
      expect(adapterState()?.modulePromise).not.toBeNull();
    });

    it('fires on loadDomTweakerEnabled signal (domtweaker-enabled = "1")', async () => {
      localStorage.setItem(DOMTWEAKER_KEY, '1');
      await bootstrapAdapter();
      expect(adapterState()?.modulePromise).not.toBeNull();
    });
  });

  // ---------------------------------------------------------------------------
  // 1b. Content-checked persisted-override probe (#577) — presence alone
  //     does not count; the envelope must be provably non-empty. Exact
  //     `-state` family matching (v1 through vN), not a prefix scan.
  // ---------------------------------------------------------------------------

  describe('content-checked persisted-override probe (#577)', () => {
    it('does NOT fire on an empty v4 envelope ({})', async () => {
      localStorage.setItem(STATEV4_KEY, '{}');
      await bootstrapAdapter();
      expect(adapterState()?.modulePromise).toBeNull();
    });

    it('does NOT fire on an empty-array v4 envelope ([])', async () => {
      localStorage.setItem(STATEV4_KEY, '[]');
      await bootstrapAdapter();
      expect(adapterState()?.modulePromise).toBeNull();
    });

    it('does NOT fire on a JSON null v4 envelope ("null")', async () => {
      localStorage.setItem(STATEV4_KEY, 'null');
      await bootstrapAdapter();
      expect(adapterState()?.modulePromise).toBeNull();
    });

    it('does NOT fire on an empty-string v4 value', async () => {
      localStorage.setItem(STATEV4_KEY, '');
      await bootstrapAdapter();
      expect(adapterState()?.modulePromise).toBeNull();
    });

    it('fires on a non-empty v4 envelope ({"--x":"1"})', async () => {
      localStorage.setItem(STATEV4_KEY, '{"--x":"1"}');
      await bootstrapAdapter();
      expect(adapterState()?.modulePromise).not.toBeNull();
    });

    it('fires on a malformed v4 value ("{oops") — fail open so the panel can migrate/reject it', async () => {
      localStorage.setItem(STATEV4_KEY, '{oops');
      await bootstrapAdapter();
      expect(adapterState()?.modulePromise).not.toBeNull();
    });

    it('fires on a non-empty v1 envelope (legacy ${prefix}-state key, no -vN suffix)', async () => {
      localStorage.setItem(STATEV1_KEY, '{"color":"#fff"}');
      await bootstrapAdapter();
      expect(adapterState()?.modulePromise).not.toBeNull();
    });

    it("sibling-prefix collision: 'myapp-state' instance's own v1 key does not trigger the 'myapp' instance", async () => {
      // Two instances configured on the same page: 'myapp' and
      // 'myapp-state'. The 'myapp-state' instance's OWN v1 key is
      // `${storagePrefix}-state` = 'myapp-state-state' (storageKey_stateV1).
      // A naive `startsWith(prefix + '-state')` scan for the 'myapp'
      // instance would match this ('myapp-state-state'.startsWith(
      // 'myapp-state') === true) even though it belongs to the OTHER
      // instance (epic #575 decision 6). The bounded probe constructs
      // `myapp`'s complete readable keys literally, so it never requests
      // 'myapp-state-state'.
      localStorage.setItem('myapp-state-state', '{"--x":"1"}');
      const myappCfg: PanelConfig = { ...CFG, storagePrefix: 'myapp', consoleNamespace: 'myappNs' };
      await bootstrapAdapter(myappCfg);
      expect(adapterStateFor('myapp')?.modulePromise ?? null).toBeNull();
    });

    it("sibling-prefix collision: the owning 'myapp-state' instance still fires on its own v1 key", async () => {
      localStorage.setItem('myapp-state-state', '{"--x":"1"}');
      const myappStateCfg: PanelConfig = {
        ...CFG,
        storagePrefix: 'myapp-state',
        consoleNamespace: 'myappStateNs',
      };
      await bootstrapAdapter(myappStateCfg);
      expect(adapterStateFor('myapp-state')?.modulePromise).not.toBeNull();
    });

    it("sibling-prefix collision: 'myapp' instance's own v4 key does not trigger the 'myapp-state' instance", async () => {
      // The inverse direction: 'myapp-state-v4' is 'myapp's own v4 key
      // (storageKey_stateV4 with storagePrefix='myapp'). The 'myapp-state'
      // instance's real v4 key is 'myapp-state-state-v4' (its storagePrefix
      // plus the same '-state-v4' suffix) — a different string — so it must
      // not see 'myapp-state-v4' as its own.
      localStorage.setItem('myapp-state-v4', '{"--x":"1"}');
      const myappStateCfg: PanelConfig = {
        ...CFG,
        storagePrefix: 'myapp-state',
        consoleNamespace: 'myappStateNs',
      };
      await bootstrapAdapter(myappStateCfg);
      expect(adapterStateFor('myapp-state')?.modulePromise ?? null).toBeNull();
    });

    it('uses bounded getItem probes without reading localStorage length or key()', async () => {
      localStorage.setItem(STATEV4_KEY, '{"--x":"1"}');
      const lengthSpy = vi.spyOn(Storage.prototype, 'length', 'get').mockImplementation(() => {
        throw new Error('length enumeration is forbidden');
      });
      const keySpy = vi.spyOn(Storage.prototype, 'key').mockImplementation(() => {
        throw new Error('SecurityError');
      });
      try {
        await bootstrapAdapter();
        expect(adapterState()?.modulePromise).not.toBeNull();
        expect(lengthSpy).not.toHaveBeenCalled();
        expect(keySpy).not.toHaveBeenCalled();
      } finally {
        lengthSpy.mockRestore();
        keySpy.mockRestore();
      }
    });

    // epic #575 confirm-gate (#581) — the CORRECTED sibling-collision form.
    // `myapp-state-state-v4` is the 'myapp-state' instance's OWN v4 key
    // (storageKey_stateV4({storagePrefix:'myapp-state'})), not 'myapp's. The
    // v1-form pair above already proves literal complete-key construction
    // excludes the sibling. This pair confirms the readable -v4 suffix
    // specifically, since #581 corrects an earlier draft that named the wrong
    // key ('myapp-state-v4', which is actually 'myapp's own key).
    it("sibling-prefix collision (v4 form): 'myapp-state' instance's own v4 key does not trigger the 'myapp' instance", async () => {
      localStorage.setItem('myapp-state-state-v4', '{"--x":"1"}');
      const myappCfg: PanelConfig = { ...CFG, storagePrefix: 'myapp', consoleNamespace: 'myappNs' };
      await bootstrapAdapter(myappCfg);
      expect(adapterStateFor('myapp')?.modulePromise ?? null).toBeNull();
    });

    it("sibling-prefix collision (v4 form): the owning 'myapp-state' instance still fires on its own v4 key", async () => {
      localStorage.setItem('myapp-state-state-v4', '{"--x":"1"}');
      const myappStateCfg: PanelConfig = {
        ...CFG,
        storagePrefix: 'myapp-state',
        consoleNamespace: 'myappStateNs',
      };
      await bootstrapAdapter(myappStateCfg);
      expect(adapterStateFor('myapp-state')?.modulePromise).not.toBeNull();
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
      // OPEN_KEY='1' is itself a gate signal (#577) so loadPanelModule
      // fires here, but disableAutoload() clears the key regardless.
      localStorage.setItem(OPEN_KEY, '1');
      await bootstrapAdapter();
      await api().disableAutoload();
      expect(localStorage.getItem(OPEN_KEY)).toBeNull();
    });
  });

  // ---------------------------------------------------------------------------
  // 3. Auto-remember — open actions arm :autoload = 'auto'
  // ---------------------------------------------------------------------------

  describe('auto-remember', () => {
    it('showDesignPanel() sets :autoload to "auto"', async () => {
      await bootstrapAdapter();
      await api().showDesignPanel();
      expect(localStorage.getItem(AUTOLOAD_KEY)).toBe('auto');
    });

    it('showDesignPanel() does NOT downgrade an existing explicit "1"', async () => {
      localStorage.setItem(AUTOLOAD_KEY, '1');
      await bootstrapAdapter();
      await api().showDesignPanel();
      expect(localStorage.getItem(AUTOLOAD_KEY)).toBe('1');
    });

    it('toggleDesignPanel() sets :autoload = "auto" when panel opens (OPEN_KEY absent → will open)', async () => {
      // Panel is currently closed — OPEN_KEY is absent.
      await bootstrapAdapter();
      await api().toggleDesignPanel();
      expect(localStorage.getItem(AUTOLOAD_KEY)).toBe('auto');
    });

    it('toggleDesignPanel() does NOT downgrade an existing explicit "1"', async () => {
      localStorage.setItem(AUTOLOAD_KEY, '1');
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
      expect(localStorage.getItem(AUTOLOAD_KEY)).toBe('auto');
    });
  });

  // ---------------------------------------------------------------------------
  // 3b. autoRememberOnOpen: false (#578) — an open-then-close cycle must never
  //     arm the gate. This is the epic #575 confirm-gate (#581) matrix's last
  //     scenario row, exercised end-to-end through the host-adapter rather
  //     than at the autoload-state unit level (already covered by
  //     state/__tests__/autoload-state.test.ts).
  // ---------------------------------------------------------------------------

  describe('autoRememberOnOpen: false — open-then-close cycle never arms the gate', () => {
    it('writes no :autoload key across an open+close cycle, and a subsequent load does not fetch', async () => {
      const cfg: PanelConfig = { ...CFG, autoRememberOnOpen: false };
      await bootstrapAdapter(cfg);

      await api().showDesignPanel();
      await flushEffects();
      expect(localStorage.getItem(AUTOLOAD_KEY)).toBeNull();

      await api().hideDesignPanel();
      expect(localStorage.getItem(AUTOLOAD_KEY)).toBeNull();

      // Simulate the next page load: a real page load starts with an empty
      // window, so clear the adapter's window-scoped runtime state (the
      // `bound` flag + memoised modulePromise from the open/close cycle
      // above) in addition to the module-graph + registry reset that
      // bootstrapAdapter already performs — otherwise `state.bound` from the
      // PREVIOUS bootstrap short-circuits the gate re-check entirely and this
      // assertion would trivially see the stale open-cycle modulePromise
      // rather than a fresh gate decision.
      const w = window as unknown as Record<string, unknown>;
      delete w.__zudoDesignTokenPanelAdapter;
      delete w.__zudoDesignTokenPanelLifecycle;
      delete w[CFG.consoleNamespace];
      await bootstrapAdapter(cfg);
      expect(adapterState()?.modulePromise).toBeNull();
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
