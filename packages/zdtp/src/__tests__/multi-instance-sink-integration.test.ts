// @vitest-environment jsdom

/**
 * Complementary tests for the multi-instance + applySink model (Z4, issue #356).
 *
 * These tests COMPLEMENT the existing coverage in:
 *  - panel-config.test.ts          — registry model, idempotency, same-prefix rules
 *  - multi-instance-lifecycle.test.tsx — toggle events, DOM roots, handle methods
 *  - apply-sink.test.ts            — single-instance sink routing, full token-name clear
 *
 * Gaps covered here:
 *
 *  1. TWO COEXISTING INSTANCES — end-to-end assertion that separate storage keys,
 *     separate toggle events, AND separate mount roots are all independent in one test.
 *
 *  2. DESTROY ISOLATION WITH SINK — tear down one sink instance, assert the OTHER
 *     still applies/clears correctly through its own sink.
 *
 *  3. SAME-PREFIX RECONFIGURE VIA DESTROY — assert the escape hatch works:
 *     destroy() + configurePanel() with new config succeeds (no throw).
 *
 *  4. APPLY-SINK ROUTING WITH TWO INSTANCES — two panels each with a DISTINCT sink.
 *     Writes to one instance do NOT reach the other instance's sink.
 *
 *  5. DEFAULT-INSTANCE BACKWARD-COMPAT PARITY — spy parity for the no-sink default
 *     path when two instances exist simultaneously (one sink, one not).
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  __resetPanelConfigForTests,
  configurePanel,
  getPanelConfig,
  panelRootId,
  toggleEventName,
  storageKey_open,
  storageKey_stateV3,
  type PanelConfig,
} from '../config/panel-config';
import {
  applyColorState,
  applyFullState,
  clearAppliedStyles,
  initColorFromScheme,
  type ApplySink,
} from '../state/tweak-state';
import {
  FIXTURE_CLUSTER,
  FIXTURE_PANEL_CONFIG,
  FIXTURE_TABS,
} from './_test-helpers';
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

function fullTweakState() {
  return {
    color: initColorFromScheme(FIXTURE_CLUSTER),
    spacing: { 'hsp-md': '20px' },
    typography: {},
    size: {},
  };
}

// ---------------------------------------------------------------------------
// Setup / Teardown
// ---------------------------------------------------------------------------

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
// 1. Two coexisting instances — separate storage keys, toggle events, roots
// ---------------------------------------------------------------------------

describe('two coexisting instances — independence of storage keys, toggle events, and mount roots', () => {
  it('all three independence axes hold simultaneously for two registered instances', () => {
    const cfgA = makeConfig('inst-alpha');
    const cfgB = makeConfig('inst-beta');
    const handleA = configurePanel(cfgA);
    const handleB = configurePanel(cfgB);

    // Handles are distinct objects with distinct instanceIds
    expect(handleA).not.toBe(handleB);
    expect(handleA.instanceId).toBe('inst-alpha');
    expect(handleB.instanceId).toBe('inst-beta');

    // Toggle event channels are independent — derived from each instance's registered config
    expect(toggleEventName(cfgA)).toBe('toggle-inst-alpha');
    expect(toggleEventName(cfgB)).toBe('toggle-inst-beta');
    expect(toggleEventName(cfgA)).not.toBe(toggleEventName(cfgB));

    // Mount root ids are independent
    expect(panelRootId(cfgA)).toBe('inst-alpha-root');
    expect(panelRootId(cfgB)).toBe('inst-beta-root');
    expect(panelRootId(cfgA)).not.toBe(panelRootId(cfgB));

    // Storage keys are independent (derived from registered config prefix, not just pure function)
    expect(storageKey_open(cfgA)).not.toBe(storageKey_open(cfgB));
    expect(storageKey_stateV3(cfgA)).not.toBe(storageKey_stateV3(cfgB));
    expect(storageKey_stateV3(cfgA)).toBe('inst-alpha-state-v3');
    expect(storageKey_stateV3(cfgB)).toBe('inst-beta-state-v3');
  });

  it('writing a localStorage entry for one instance does NOT contaminate the other', () => {
    const cfgA = makeConfig('inst-alpha');
    const cfgB = makeConfig('inst-beta');
    configurePanel(cfgA);
    configurePanel(cfgB);

    // Simulate alpha writing its open-state key (keyed by prefix)
    localStorage.setItem(storageKey_open(cfgA), '1');

    expect(localStorage.getItem(storageKey_open(cfgA))).toBe('1');
    expect(localStorage.getItem(storageKey_open(cfgB))).toBeNull(); // beta unaffected
  });

  it('toggle event for the default prefix keeps the historical public name', () => {
    // The default prefix must use 'toggle-design-token-panel' for backward compat;
    // non-default prefixes get per-instance channels.
    const cfgDefault = makeConfig('zudo-design-token-panel');
    const cfgNonDefault = makeConfig('inst-alpha');
    configurePanel(cfgDefault);
    configurePanel(cfgNonDefault);

    expect(toggleEventName(cfgDefault)).toBe('toggle-design-token-panel');
    expect(toggleEventName(cfgNonDefault)).toBe('toggle-inst-alpha');
    expect(toggleEventName(cfgNonDefault)).not.toBe('toggle-design-token-panel');
  });
});

// ---------------------------------------------------------------------------
// 2. destroy() isolation — one sink instance torn down, other still applies
// ---------------------------------------------------------------------------

describe('destroy() isolation — sink instance torn down, other instance still applies', () => {
  it('after destroying instance A, instance B (the new default) routes apply through its sink via registry lookup', () => {
    // This test drives applyFullState WITHOUT an explicit cfg arg so it resolves
    // the default instance from the registry. After A is destroyed, B becomes the
    // default, so the no-arg call must reach sinkB — verifying the registry fallback.
    const sinkA = makeSinkSpy();
    const sinkB = makeSinkSpy();

    const cfgA = makeConfig('inst-alpha', { applySink: sinkA });
    const cfgB = makeConfig('inst-beta', { applySink: sinkB });
    const handleA = configurePanel(cfgA);
    configurePanel(cfgB); // B is now the default

    // Destroy A — B should become the new default
    handleA.destroy();

    // No-arg call resolves the default from the registry (should now be B)
    const state = fullTweakState();
    applyFullState(state); // no cfg — uses getPanelConfig() → B

    // B's sink must have received the writes via the registry default
    expect(flatApplyPairs(sinkB.applyCalls).length).toBeGreaterThan(0);
    // A's sink never received anything (A was destroyed before any apply)
    expect(flatApplyPairs(sinkA.applyCalls).length).toBe(0);
  });

  it('after destroying instance A, clearAppliedStyles via registry still routes to B\'s sink', () => {
    const sinkA = makeSinkSpy();
    const sinkB = makeSinkSpy();

    const cfgA = makeConfig('inst-alpha', { applySink: sinkA });
    const cfgB = makeConfig('inst-beta', { applySink: sinkB });
    const handleA = configurePanel(cfgA);
    configurePanel(cfgB);

    handleA.destroy();

    // No-arg clear — resolves default from registry (B), must route to sinkB
    clearAppliedStyles();

    expect(flatClearNames(sinkB.clearCalls).length).toBeGreaterThan(0);
    // :root must not be touched (B has a sink)
    expect(removePropertySpy).not.toHaveBeenCalled();
    // A's sink was never called
    expect(flatClearNames(sinkA.clearCalls).length).toBe(0);
  });

  it('after destroying one instance, getPanelConfig() resolves to the remaining instance', () => {
    const cfgA = makeConfig('inst-alpha');
    const cfgB = makeConfig('inst-beta');
    configurePanel(cfgA);
    configurePanel(cfgB); // B is the default after this

    expect(getPanelConfig().storagePrefix).toBe('inst-beta');

    // Destroy B — A should become the new default
    const handleB = configurePanel(cfgB); // idempotent — same handle
    handleB.destroy();

    // Registry should now resolve to A as the default instance
    expect(getPanelConfig().storagePrefix).toBe('inst-alpha');
  });
});

// ---------------------------------------------------------------------------
// 3. Same-prefix reconfigure rule: reject-with-error + destroy escape hatch
// ---------------------------------------------------------------------------

describe('same-prefix reconfigure rule (RECONFIGURE_RULE = reject-with-error) — destroy escape hatch', () => {
  it('destroy() then configurePanel() with new config for same prefix succeeds', () => {
    // Without destroy the same-prefix-different-config rule throws (covered in
    // panel-config.test.ts). This test exercises the escape hatch: destroy first,
    // then re-configure the same prefix with a structurally-different config.
    const cfg = makeConfig('inst-alpha');
    const handle = configurePanel(cfg);

    const newCfg = { ...cfg, consoleNamespace: 'alpha-v2' };
    // Pre-destroy: must still throw
    expect(() => configurePanel(newCfg)).toThrow(/already called with different values/);

    // Destroy first, then re-configure
    handle.destroy();
    expect(() => configurePanel(newCfg)).not.toThrow();
    // The re-configured instance is now the default
    expect(getPanelConfig().consoleNamespace).toBe('alpha-v2');
  });

  it('destroy() + re-configure + apply works end-to-end with a new sink', () => {
    const sinkV1 = makeSinkSpy();
    const sinkV2 = makeSinkSpy();

    const cfg = makeConfig('inst-alpha', { applySink: sinkV1 });
    const handle = configurePanel(cfg);
    handle.destroy();

    // Re-configure with new sink
    const newCfg = makeConfig('inst-alpha', { applySink: sinkV2 });
    const newHandle = configurePanel(newCfg);
    expect(newHandle.instanceId).toBe('inst-alpha');

    // Apply via the re-configured instance
    applyFullState(fullTweakState(), newCfg);

    // New sink received writes; old sink did not
    expect(flatApplyPairs(sinkV2.applyCalls).length).toBeGreaterThan(0);
    expect(flatApplyPairs(sinkV1.applyCalls).length).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// 4. Apply-sink routing with TWO instances — writes to A never reach B's sink
// ---------------------------------------------------------------------------

describe('apply-sink routing — two instances with distinct sinks do not cross-talk', () => {
  it('applyFullState on instance A only calls sinkA.apply, not sinkB.apply', () => {
    const sinkA = makeSinkSpy();
    const sinkB = makeSinkSpy();

    const cfgA = makeConfig('inst-alpha', { applySink: sinkA });
    const cfgB = makeConfig('inst-beta', { applySink: sinkB });
    configurePanel(cfgA);
    configurePanel(cfgB);

    const state = fullTweakState();
    applyFullState(state, cfgA);

    expect(flatApplyPairs(sinkA.applyCalls).length).toBeGreaterThan(0);
    expect(flatApplyPairs(sinkB.applyCalls).length).toBe(0);
  });

  it('applyFullState on instance B only calls sinkB.apply, not sinkA.apply', () => {
    const sinkA = makeSinkSpy();
    const sinkB = makeSinkSpy();

    const cfgA = makeConfig('inst-alpha', { applySink: sinkA });
    const cfgB = makeConfig('inst-beta', { applySink: sinkB });
    configurePanel(cfgA);
    configurePanel(cfgB);

    const state = fullTweakState();
    applyFullState(state, cfgB);

    expect(flatApplyPairs(sinkB.applyCalls).length).toBeGreaterThan(0);
    expect(flatApplyPairs(sinkA.applyCalls).length).toBe(0);
  });

  it('clearAppliedStyles on instance A only calls sinkA.clear, not sinkB.clear', () => {
    const sinkA = makeSinkSpy();
    const sinkB = makeSinkSpy();

    const cfgA = makeConfig('inst-alpha', { applySink: sinkA });
    const cfgB = makeConfig('inst-beta', { applySink: sinkB });
    configurePanel(cfgA);
    configurePanel(cfgB);

    clearAppliedStyles(undefined, cfgA);

    expect(flatClearNames(sinkA.clearCalls).length).toBeGreaterThan(0);
    expect(flatClearNames(sinkB.clearCalls).length).toBe(0);
    // :root must not be touched
    expect(removePropertySpy).not.toHaveBeenCalled();
  });

  it('applyColorState routes only to the explicitly provided sink, not to a second instance sink', () => {
    const sinkA = makeSinkSpy();
    const sinkB = makeSinkSpy();

    const cfgA = makeConfig('inst-alpha', { applySink: sinkA });
    const cfgB = makeConfig('inst-beta', { applySink: sinkB });
    configurePanel(cfgA);
    configurePanel(cfgB);

    // applyColorState takes the sink explicitly — call with sinkA
    const state = initColorFromScheme(FIXTURE_CLUSTER);
    applyColorState(state, FIXTURE_CLUSTER, sinkA);

    expect(flatApplyPairs(sinkA.applyCalls).length).toBeGreaterThan(0);
    expect(flatApplyPairs(sinkB.applyCalls).length).toBe(0);
    expect(setPropertySpy).not.toHaveBeenCalled();
  });

  it('apply from one instance does not write to :root when the other instance has no sink', () => {
    const sinkA = makeSinkSpy();
    // cfgB has NO sink — it would write to :root if called
    const cfgA = makeConfig('inst-alpha', { applySink: sinkA });
    const cfgB = makeConfig('inst-beta'); // no sink
    configurePanel(cfgA);
    configurePanel(cfgB);

    // Apply only via A (which has sink)
    applyFullState(fullTweakState(), cfgA);

    // :root still clean — A has a sink
    expect(setPropertySpy).not.toHaveBeenCalled();
    expect(flatApplyPairs(sinkA.applyCalls).length).toBeGreaterThan(0);
  });
});

// ---------------------------------------------------------------------------
// 5. Default-instance backward-compat parity — no-sink path unchanged
// ---------------------------------------------------------------------------

describe('default-instance backward compat — no-sink path writes to :root (spy parity)', () => {
  it('applyFullState without a sink calls setProperty on document.documentElement', () => {
    const cfgDefault = { ...FIXTURE_PANEL_CONFIG, tabs: FIXTURE_TABS };
    configurePanel(cfgDefault);

    applyFullState(fullTweakState(), cfgDefault);

    expect(setPropertySpy).toHaveBeenCalled();
    const calls = setPropertySpy.mock.calls.map(([name]: [string]) => name);
    // Palette vars
    for (let i = 0; i < FIXTURE_CLUSTER.paletteSize; i++) {
      expect(calls).toContain(`--fixture-p${i}`);
    }
    // Semantic vars
    expect(calls).toContain('--fixture-semantic-accent');
    // Spacing var
    expect(calls).toContain('--zd-spacing-hgap-md');
  });

  it('clearAppliedStyles without a sink calls removeProperty on document.documentElement', () => {
    const cfgDefault = { ...FIXTURE_PANEL_CONFIG, tabs: FIXTURE_TABS };
    configurePanel(cfgDefault);

    // Seed a var first
    document.documentElement.style.setProperty('--fixture-p0', '#ff0000');
    setPropertySpy.mockClear();

    clearAppliedStyles(undefined, cfgDefault);

    expect(removePropertySpy).toHaveBeenCalled();
  });

  it('when one instance has a sink and one does not, the no-sink instance still writes to :root', () => {
    const sinkA = makeSinkSpy();
    const cfgA = makeConfig('inst-alpha', { applySink: sinkA });
    const cfgB = { ...FIXTURE_PANEL_CONFIG, storagePrefix: 'inst-beta', tabs: FIXTURE_TABS };
    configurePanel(cfgA);
    configurePanel(cfgB);

    // Apply through the no-sink instance B
    applyFullState(fullTweakState(), cfgB);

    expect(setPropertySpy).toHaveBeenCalled();
    // sinkA was not involved
    expect(flatApplyPairs(sinkA.applyCalls).length).toBe(0);
  });

  it('default path setProperty calls are not affected by a separate sink-instance being registered', () => {
    const sinkA = makeSinkSpy();
    const cfgA = makeConfig('inst-alpha', { applySink: sinkA });
    const cfgDefault = { ...FIXTURE_PANEL_CONFIG, tabs: FIXTURE_TABS };
    configurePanel(cfgA);
    configurePanel(cfgDefault);

    applyFullState(fullTweakState(), cfgDefault);

    // The default path must still write its full set of vars
    const calls = setPropertySpy.mock.calls.map(([name]: [string]) => name);
    for (let i = 0; i < FIXTURE_CLUSTER.paletteSize; i++) {
      expect(calls).toContain(`--fixture-p${i}`);
    }
    expect(calls).toContain('--fixture-semantic-accent');
  });

  it('resetted no-sink instance calls removeProperty for all tab vars', () => {
    const cfgDefault = { ...FIXTURE_PANEL_CONFIG, tabs: FIXTURE_TABS };
    configurePanel(cfgDefault);

    // Seed a spacing var
    document.documentElement.style.setProperty('--zd-spacing-hgap-md', '99px');
    setPropertySpy.mockClear();

    clearAppliedStyles(undefined, cfgDefault);

    const removedNames = removePropertySpy.mock.calls.map(([name]: [string]) => name);
    expect(removedNames).toContain('--zd-spacing-hgap-md');
  });
});

// ---------------------------------------------------------------------------
// 6. apply + clear pair — same sink instance, complete upsert/remove cycle
// ---------------------------------------------------------------------------

describe('apply + clear cycle — sink upsert then remove', () => {
  it('apply followed by clear sends all names through the same sink', () => {
    const sink = makeSinkSpy();
    const cfg = makeConfig('inst-alpha', { applySink: sink });
    configurePanel(cfg);

    // Apply (upsert)
    applyFullState(fullTweakState(), cfg);
    const applied = flatApplyPairs(sink.applyCalls);
    expect(applied.length).toBeGreaterThan(0);

    // Clear (remove) — must receive all var names known to this instance
    clearAppliedStyles(undefined, cfg);
    const cleared = flatClearNames(sink.clearCalls);
    expect(cleared.length).toBeGreaterThan(0);

    // :root not touched throughout
    expect(setPropertySpy).not.toHaveBeenCalled();
    expect(removePropertySpy).not.toHaveBeenCalled();
  });

  it('clear sends the FULL token-name set even when no previous apply was called', () => {
    const sink = makeSinkSpy();
    const cfg = makeConfig('inst-alpha', { applySink: sink });
    configurePanel(cfg);

    // Clear without any prior apply — must still send the full set
    clearAppliedStyles(undefined, cfg);

    const cleared = flatClearNames(sink.clearCalls);
    expect(cleared.length).toBeGreaterThan(0);
    // Should contain palette vars
    expect(cleared).toContain('--fixture-p0');
    // Should contain non-color tab vars
    expect(cleared).toContain('--zd-spacing-hgap-md');
  });
});
