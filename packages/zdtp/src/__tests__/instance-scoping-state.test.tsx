// @vitest-environment jsdom

/**
 * Regression tests for instance-scoped STATE operations (issue #357).
 *
 * The multi-instance epic (#353/#354/#356) made the panel's render / open-key /
 * toggle-event path per-instance, but a codex review found the STATE path was
 * still routed through `getPanelConfig()` (the most-recently-configured /
 * default instance): a mounted non-default panel's persist / apply / reset /
 * init calls — and the Astro console handlers — drove the DEFAULT instance, so
 * two coexisting instances contaminated each other's storage, apply-sink, and
 * root.
 *
 * Existing coverage these COMPLEMENT (do not duplicate):
 *  - multi-instance-sink-integration.test.ts — applyFullState/clearAppliedStyles
 *    scoping when the cfg is passed EXPLICITLY to the helper.
 *  - multi-instance-lifecycle.test.tsx — handle.open/close/toggle independence.
 *
 * Gap closed here — the STATE path specifically:
 *  1. The panel's own persist/apply/reset path (driven via A's `instanceConfig`,
 *     exactly as the mounted panel.tsx now threads it) writes/clears/persists to
 *     A's storage keys + A's sink, and NEVER B's — even while B is the default.
 *  2. A reset on a mounted non-default instance clears only that instance's
 *     vars/storage.
 *  3. (P2) The console-handler binding the Astro adapter installs (the instance
 *     `handle`, captured at install time) still targets instance A after B is
 *     configured — whereas the no-arg `getPanelConfig()`-resolving export would
 *     have driven B. Proves the order-sensitivity bug is fixed.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render } from 'preact';
import { useEffect } from 'preact/hooks';
import {
  __resetPanelConfigForTests,
  configurePanel,
  getPanelConfig,
  panelRootId,
  storageKey_stateV3,
  type ApplySink,
  type PanelConfig,
} from '../config/panel-config';
import {
  applyFullState,
  clearAppliedStyles,
  clearPersistedState,
  getActivePrimaryCluster,
  initColorFromScheme,
  loadPersistedState,
  savePersistedState,
  type TweakState,
} from '../state/tweak-state';
import { usePersist } from '../state/persist';
import { FIXTURE_TABS } from './_test-helpers';
import { __resetInstanceBindingsForTests } from '../index';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeConfig(prefix: string, overrides: Partial<PanelConfig> = {}): PanelConfig {
  return {
    storagePrefix: prefix,
    consoleNamespace: prefix,
    modalClassPrefix: `${prefix}-modal`,
    schemaId: `${prefix}/v1`,
    exportFilenameBase: prefix,
    tabs: FIXTURE_TABS,
    ...overrides,
  };
}

function makeSinkSpy(): ApplySink & {
  applyCalls: Array<ReadonlyArray<readonly [string, string]>>;
  clearCalls: Array<readonly string[]>;
} {
  const applyCalls: Array<ReadonlyArray<readonly [string, string]>> = [];
  const clearCalls: Array<readonly string[]> = [];
  return {
    applyCalls,
    clearCalls,
    apply(pairs) {
      applyCalls.push(pairs);
    },
    clear(names) {
      clearCalls.push(names);
    },
  };
}

function flatApplyPairs(
  calls: Array<ReadonlyArray<readonly [string, string]>>,
): Array<readonly [string, string]> {
  return calls.flat();
}

function flatClearNames(calls: Array<readonly string[]>): string[] {
  return calls.flat();
}

/** A fresh full TweakState seeded from the given instance's primary cluster. */
function fullTweakStateFor(cfg: PanelConfig): TweakState {
  return {
    color: initColorFromScheme(getActivePrimaryCluster(cfg)),
    spacing: { 'hsp-md': '20px' },
    typography: {},
    size: {},
  };
}

let setPropertySpy: ReturnType<typeof vi.spyOn>;
let removePropertySpy: ReturnType<typeof vi.spyOn>;

beforeEach(() => {
  setPropertySpy = vi.spyOn(document.documentElement.style, 'setProperty');
  removePropertySpy = vi.spyOn(document.documentElement.style, 'removeProperty');
  document.documentElement.removeAttribute('style');
  document.documentElement.removeAttribute('data-theme');
  __resetInstanceBindingsForTests();
  __resetPanelConfigForTests();
  localStorage.clear();
  document.body.innerHTML = '';
});

afterEach(() => {
  setPropertySpy.mockRestore();
  removePropertySpy.mockRestore();
  document.documentElement.removeAttribute('style');
  document.documentElement.removeAttribute('data-theme');
  __resetInstanceBindingsForTests();
  __resetPanelConfigForTests();
  localStorage.clear();
  document.body.innerHTML = '';
});

// ---------------------------------------------------------------------------
// 1. The panel's persist path, scoped to A's instanceConfig, hits A only
// ---------------------------------------------------------------------------

describe('state path — usePersist scoped to a non-default instance writes to A only', () => {
  it('persistSpacing on A routes its CSS-var writes to A\'s sink and persists to A\'s storage key, never B', async () => {
    const sinkA = makeSinkSpy();
    const sinkB = makeSinkSpy();
    const cfgA = makeConfig('inst-alpha', { applySink: sinkA });
    const cfgB = makeConfig('inst-beta', { applySink: sinkB });
    configurePanel(cfgA);
    configurePanel(cfgB); // B is now the active default — getPanelConfig() → B

    // Drive the panel's persist pipeline exactly as panel.tsx does: render a
    // tiny component that calls `usePersist(setState, A's instanceConfig)` (the
    // real hook the mounted panel uses) and fires persistSpacing on mount.
    let stateRef: TweakState | null = fullTweakStateFor(cfgA);
    function Harness() {
      const setState = (updater: (prev: TweakState | null) => TweakState | null) => {
        stateRef = updater(stateRef);
      };
      const { persistSpacing } = usePersist(setState, cfgA);
      useEffect(() => {
        persistSpacing((prev) => ({ ...prev, 'hsp-md': '99px' }));
      }, [persistSpacing]);
      return null;
    }
    const host = document.createElement('div');
    document.body.appendChild(host);
    render(<Harness />, host);
    await new Promise<void>((resolve) =>
      requestAnimationFrame(() => requestAnimationFrame(() => resolve())),
    );

    // A's sink received writes; B's did not.
    expect(flatApplyPairs(sinkA.applyCalls).length).toBeGreaterThan(0);
    expect(flatApplyPairs(sinkB.applyCalls).length).toBe(0);
    // :root untouched — A has a sink.
    expect(setPropertySpy).not.toHaveBeenCalled();

    // Persisted to A's storage key, NOT B's.
    expect(localStorage.getItem(storageKey_stateV3(cfgA))).not.toBeNull();
    expect(localStorage.getItem(storageKey_stateV3(cfgB))).toBeNull();

    render(null, host);
  });
});

// ---------------------------------------------------------------------------
// 2. Apply / load / save / clear via A's cfg hit A's storage keys + sink only
// ---------------------------------------------------------------------------

describe('state path — apply/save/load/clear scoped to A do not touch B', () => {
  it('savePersistedState + loadPersistedState round-trip on A\'s key, with B configured as default', () => {
    const cfgA = makeConfig('inst-alpha');
    const cfgB = makeConfig('inst-beta');
    configurePanel(cfgA);
    configurePanel(cfgB); // B is the default

    const stateA = fullTweakStateFor(cfgA);
    // Save scoped to A (panel.tsx passes instanceConfig as the 3rd arg).
    savePersistedState(stateA, undefined, cfgA);

    // A's key written, B's key absent.
    expect(localStorage.getItem(storageKey_stateV3(cfgA))).not.toBeNull();
    expect(localStorage.getItem(storageKey_stateV3(cfgB))).toBeNull();

    // Load scoped to A reads A's key back; load scoped to B finds nothing.
    const loadedA = loadPersistedState(
      undefined,
      undefined,
      getActivePrimaryCluster(cfgA),
      cfgA,
    );
    expect(loadedA).not.toBeNull();
    expect(loadedA?.spacing['hsp-md']).toBe('20px');

    const loadedB = loadPersistedState(
      undefined,
      undefined,
      getActivePrimaryCluster(cfgB),
      cfgB,
    );
    expect(loadedB).toBeNull();
  });

  it('applyFullState scoped to A routes to sinkA only, not sinkB, while B is default', () => {
    const sinkA = makeSinkSpy();
    const sinkB = makeSinkSpy();
    const cfgA = makeConfig('inst-alpha', { applySink: sinkA });
    const cfgB = makeConfig('inst-beta', { applySink: sinkB });
    configurePanel(cfgA);
    configurePanel(cfgB);

    applyFullState(fullTweakStateFor(cfgA), cfgA);

    expect(flatApplyPairs(sinkA.applyCalls).length).toBeGreaterThan(0);
    expect(flatApplyPairs(sinkB.applyCalls).length).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// 3. Reset on a mounted non-default instance clears only that instance
// ---------------------------------------------------------------------------

describe('state path — reset (handleResetAll) on a non-default instance clears only that instance', () => {
  it('clearPersistedState + clearAppliedStyles scoped to A clear A\'s storage + A\'s sink, leaving B intact', () => {
    const sinkA = makeSinkSpy();
    const sinkB = makeSinkSpy();
    const cfgA = makeConfig('inst-alpha', { applySink: sinkA });
    const cfgB = makeConfig('inst-beta', { applySink: sinkB });
    configurePanel(cfgA);
    configurePanel(cfgB); // B is the active default

    // Seed BOTH instances' persisted state.
    savePersistedState(fullTweakStateFor(cfgA), undefined, cfgA);
    savePersistedState(fullTweakStateFor(cfgB), undefined, cfgB);
    expect(localStorage.getItem(storageKey_stateV3(cfgA))).not.toBeNull();
    expect(localStorage.getItem(storageKey_stateV3(cfgB))).not.toBeNull();

    // Reset A only (the two calls panel.tsx's handleResetAll makes, scoped to A).
    clearPersistedState(undefined, cfgA);
    clearAppliedStyles(undefined, cfgA);

    // A's storage gone; B's storage survives.
    expect(localStorage.getItem(storageKey_stateV3(cfgA))).toBeNull();
    expect(localStorage.getItem(storageKey_stateV3(cfgB))).not.toBeNull();

    // A's sink received the clear; B's sink never did.
    expect(flatClearNames(sinkA.clearCalls).length).toBeGreaterThan(0);
    expect(flatClearNames(sinkB.clearCalls).length).toBe(0);
    // :root untouched — A has a sink.
    expect(removePropertySpy).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// 4. (P2) console handler binding targets its configured instance, not default
// ---------------------------------------------------------------------------

describe('console handler binding (P2) — handle targets its own instance after another is configured', () => {
  it('instance A\'s handle (what the console handler now binds to) drives A even when B is the default', async () => {
    await import('../index');

    const cfgA = makeConfig('inst-alpha');
    const cfgB = makeConfig('inst-beta');
    // A configured first, then B — so getPanelConfig() (the OLD no-arg console
    // path) resolves to B, the most-recently-configured default.
    const handleA = configurePanel(cfgA);
    configurePanel(cfgB);
    expect(getPanelConfig().storagePrefix).toBe('inst-beta');

    // The adapter now binds the console handler to A's handle. Driving it must
    // open A's root, NOT B's — proving the binding is instance-bound, not
    // resolved via the default at call time.
    handleA.open();
    await new Promise<void>((resolve) =>
      requestAnimationFrame(() => requestAnimationFrame(() => resolve())),
    );

    expect(document.getElementById(panelRootId(cfgA)), 'A mounted').not.toBeNull();
    expect(document.getElementById(panelRootId(cfgB)), 'B did NOT mount').toBeNull();
  });

  it('the no-arg default-resolving export drives the DEFAULT instance (B) — contrast that motivated the P2 fix', async () => {
    const mod = await import('../index');

    const cfgA = makeConfig('inst-alpha');
    const cfgB = makeConfig('inst-beta');
    configurePanel(cfgA);
    configurePanel(cfgB); // B is the default

    // showDesignTokenPanel() resolves getPanelConfig() at call time → B. This is
    // the historical single-default-instance behaviour (preserved for back-compat);
    // the P2 bug was that the Astro console handler for namespace A ALSO used this
    // no-arg path, so A's console call drove B. The adapter now binds the handle
    // instead (covered above).
    mod.showDesignTokenPanel();
    await new Promise<void>((resolve) =>
      requestAnimationFrame(() => requestAnimationFrame(() => resolve())),
    );

    expect(document.getElementById(panelRootId(cfgB)), 'default (B) mounted').not.toBeNull();
    expect(document.getElementById(panelRootId(cfgA)), 'A not driven by no-arg export').toBeNull();
  });
});
