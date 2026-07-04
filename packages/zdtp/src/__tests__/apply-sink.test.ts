// @vitest-environment jsdom

/**
 * Tests for the `applySink` feature (issue #355 Z3).
 *
 * Acceptance criteria:
 * - With an `applySink`, token changes invoke `sink.apply`/`sink.clear`
 *   and `document.documentElement.style.setProperty`/`removeProperty`
 *   records ZERO calls.
 * - Reset calls `sink.clear` with the instance's FULL token-name set (not
 *   just currently-dirty ones).
 * - A sink that throws does NOT break the panel.
 * - Without a sink, behavior is byte-identical (spy parity vs. current).
 * - Scheme switch on a sink instance touches only its own vars; the default
 *   instance still reads host theme from `data-theme`.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { __resetPanelConfigForTests, configurePanel } from '../config/panel-config';
import type { ApplySink } from '../state/tweak-state';
import {
  applyColorState,
  applyFullState,
  clearAppliedColorStyles,
  clearAppliedStyles,
  getActiveSchemeName,
  initColorFromScheme,
} from '../state/tweak-state';
import {
  FIXTURE_CLUSTER,
  FIXTURE_PANEL_CONFIG,
  FIXTURE_TABS,
  installFixturePanelConfig,
} from './_test-helpers';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

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

/** Flatten all pairs from all sink.apply() calls into one array. */
function flatApplyPairs(
  calls: Array<ReadonlyArray<readonly [string, string]>>,
): Array<readonly [string, string]> {
  return calls.flat();
}

/** Flatten all names from all sink.clear() calls into one array. */
function flatClearNames(calls: Array<readonly string[]>): string[] {
  return calls.flat();
}

// ---------------------------------------------------------------------------
// Setup
// ---------------------------------------------------------------------------

let setPropertySpy: ReturnType<typeof vi.spyOn>;
let removePropertySpy: ReturnType<typeof vi.spyOn>;

beforeEach(() => {
  // Spy on document.documentElement.style mutations so we can verify that
  // the sink path does NOT touch :root.
  setPropertySpy = vi.spyOn(document.documentElement.style, 'setProperty');
  removePropertySpy = vi.spyOn(document.documentElement.style, 'removeProperty');
  document.documentElement.removeAttribute('style');
  document.documentElement.removeAttribute('data-theme');
});

afterEach(() => {
  setPropertySpy.mockRestore();
  removePropertySpy.mockRestore();
  document.documentElement.removeAttribute('style');
  document.documentElement.removeAttribute('data-theme');
  __resetPanelConfigForTests();
});

// ---------------------------------------------------------------------------
// applyColorState — sink routing
// ---------------------------------------------------------------------------

describe('applyColorState with sink', () => {
  it('routes writes to sink and does NOT touch document.documentElement', () => {
    const sink = makeSinkSpy();
    const state = initColorFromScheme(FIXTURE_CLUSTER);
    applyColorState(state, FIXTURE_CLUSTER, sink);

    // Sink received all writes.
    const pairs = flatApplyPairs(sink.applyCalls);
    expect(pairs.length).toBeGreaterThan(0);

    // None reached :root.
    expect(setPropertySpy).not.toHaveBeenCalled();
    expect(removePropertySpy).not.toHaveBeenCalled();
  });

  it('writes all palette slots to the sink', () => {
    const sink = makeSinkSpy();
    const state = initColorFromScheme(FIXTURE_CLUSTER);
    applyColorState(state, FIXTURE_CLUSTER, sink);

    const pairs = flatApplyPairs(sink.applyCalls);
    const names = pairs.map(([name]) => name);
    for (let i = 0; i < FIXTURE_CLUSTER.paletteSize; i++) {
      expect(names).toContain(`--fixture-p${i}`);
    }
  });

  it('writes semantic vars to the sink', () => {
    const sink = makeSinkSpy();
    const state = initColorFromScheme(FIXTURE_CLUSTER);
    applyColorState(state, FIXTURE_CLUSTER, sink);

    const names = flatApplyPairs(sink.applyCalls).map(([n]) => n);
    expect(names).toContain('--fixture-semantic-accent');
    expect(names).toContain('--fixture-semantic-muted');
    expect(names).toContain('--fixture-semantic-active');
  });

  it('without sink writes to document.documentElement (default path unchanged)', () => {
    const state = initColorFromScheme(FIXTURE_CLUSTER);
    applyColorState(state, FIXTURE_CLUSTER); // no sink

    expect(setPropertySpy).toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// applyFullState — sink routing end-to-end
// ---------------------------------------------------------------------------

describe('applyFullState with sink', () => {
  it('routes all writes through sink and keeps :root pristine', () => {
    const sink = makeSinkSpy();
    installFixturePanelConfig({ applySink: sink });

    const state = {
      color: initColorFromScheme(FIXTURE_CLUSTER),
      spacing: { 'hsp-md': '20px' },
      typography: {},
      size: {},
    };

    applyFullState(state, { ...FIXTURE_PANEL_CONFIG, tabs: FIXTURE_TABS, applySink: sink });

    // Sink received writes.
    const pairs = flatApplyPairs(sink.applyCalls);
    expect(pairs.length).toBeGreaterThan(0);

    // :root was not touched.
    expect(setPropertySpy).not.toHaveBeenCalled();
    expect(removePropertySpy).not.toHaveBeenCalled();
  });

  it('spacing override appears in sink apply pairs', () => {
    const sink = makeSinkSpy();
    const cfg = { ...FIXTURE_PANEL_CONFIG, tabs: FIXTURE_TABS, applySink: sink };
    installFixturePanelConfig({ applySink: sink });

    const state = {
      color: initColorFromScheme(FIXTURE_CLUSTER),
      spacing: { 'hsp-md': '99px' },
      typography: {},
      size: {},
    };

    applyFullState(state, cfg);

    const pairs = flatApplyPairs(sink.applyCalls);
    const spacingPair = pairs.find(([name]) => name === '--zd-spacing-hgap-md');
    expect(spacingPair).toBeDefined();
    expect(spacingPair?.[1]).toBe('99px');
  });

  it('without sink writes to :root (default path unchanged)', () => {
    installFixturePanelConfig();

    const state = {
      color: initColorFromScheme(FIXTURE_CLUSTER),
      spacing: {},
      typography: {},
      size: {},
    };

    applyFullState(state); // no cfg → uses getPanelConfig()

    expect(setPropertySpy).toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// clearAppliedStyles — full token-name set for sink instances
// ---------------------------------------------------------------------------

describe('clearAppliedStyles with sink — Reset sends full token-name set', () => {
  it('calls sink.clear with the full token-name set (palette + semantic + non-color tabs)', () => {
    const sink = makeSinkSpy();
    const cfg = { ...FIXTURE_PANEL_CONFIG, tabs: FIXTURE_TABS, applySink: sink };
    installFixturePanelConfig({ applySink: sink });

    clearAppliedStyles(undefined, cfg);

    // :root was not touched.
    expect(removePropertySpy).not.toHaveBeenCalled();

    const cleared = flatClearNames(sink.clearCalls);

    // All palette slots present.
    for (let i = 0; i < FIXTURE_CLUSTER.paletteSize; i++) {
      expect(cleared).toContain(`--fixture-p${i}`);
    }
    // Semantic vars present.
    expect(cleared).toContain('--fixture-semantic-accent');
    expect(cleared).toContain('--fixture-semantic-muted');
    expect(cleared).toContain('--fixture-semantic-active');
    // Non-color tab vars present.
    expect(cleared).toContain('--zd-spacing-hgap-md');
    expect(cleared).toContain('--zd-spacing-vgap-sm');
    expect(cleared).toContain('--zd-font-base-size');
    expect(cleared).toContain('--radius-lg');
  });

  it('full token-name set covers even vars that were never set (not just dirty ones)', () => {
    const sink = makeSinkSpy();
    const cfg = { ...FIXTURE_PANEL_CONFIG, tabs: FIXTURE_TABS, applySink: sink };
    installFixturePanelConfig({ applySink: sink });

    // Simulate Reset from a fresh state — nothing was applied before.
    clearAppliedStyles(undefined, cfg);

    const cleared = flatClearNames(sink.clearCalls);
    // Even though no overrides were applied, all vars are in the clear set.
    expect(cleared).toContain('--fixture-p0');
    expect(cleared).toContain('--zd-spacing-hgap-md');
  });

  it('without sink clears document.documentElement (default path unchanged)', () => {
    installFixturePanelConfig();
    // Seed a var so there's something to clear.
    document.documentElement.style.setProperty('--fixture-p0', '#ff0000');
    setPropertySpy.mockClear();

    clearAppliedStyles();

    expect(removePropertySpy).toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// clearAppliedColorStyles — sink routing
// ---------------------------------------------------------------------------

describe('clearAppliedColorStyles with sink', () => {
  it('routes clears through sink only', () => {
    const sink = makeSinkSpy();
    installFixturePanelConfig({ applySink: sink });

    clearAppliedColorStyles([FIXTURE_CLUSTER], sink);

    expect(removePropertySpy).not.toHaveBeenCalled();
    const cleared = flatClearNames(sink.clearCalls);
    expect(cleared).toContain('--fixture-p0');
    expect(cleared).toContain('--fixture-semantic-accent');
  });
});

// ---------------------------------------------------------------------------
// Sink errors are non-fatal
// ---------------------------------------------------------------------------

describe('applySink error handling', () => {
  it('sink.apply throwing does not throw from applyColorState', () => {
    const throwingSink: ApplySink = {
      apply() {
        throw new Error('sink error');
      },
      clear() {
        throw new Error('sink error');
      },
    };

    const state = initColorFromScheme(FIXTURE_CLUSTER);
    // Must not throw.
    expect(() => applyColorState(state, FIXTURE_CLUSTER, throwingSink)).not.toThrow();
  });

  it('sink.clear throwing does not throw from clearAppliedStyles', () => {
    const throwingSink: ApplySink = {
      apply() {
        throw new Error('sink error');
      },
      clear() {
        throw new Error('sink error');
      },
    };

    const cfg = { ...FIXTURE_PANEL_CONFIG, tabs: FIXTURE_TABS, applySink: throwingSink };
    installFixturePanelConfig({ applySink: throwingSink });

    // Must not throw.
    expect(() => clearAppliedStyles(undefined, cfg)).not.toThrow();
  });

  it('sink errors emit a console.warn', () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const throwingSink: ApplySink = {
      apply() {
        throw new Error('sink error');
      },
      clear() {},
    };

    const state = initColorFromScheme(FIXTURE_CLUSTER);
    applyColorState(state, FIXTURE_CLUSTER, throwingSink);

    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringContaining('applySink'),
      expect.anything(),
    );
    warnSpy.mockRestore();
  });
});

// ---------------------------------------------------------------------------
// getActiveSchemeName — sink instance falls back to panel state
// ---------------------------------------------------------------------------

describe('getActiveSchemeName — sink instance scheme fallback', () => {
  it('default instance reads data-theme from document when colorMode is set', () => {
    // Use a cluster that has colorMode enabled.
    const clusterWithMode = {
      ...FIXTURE_CLUSTER,
      panelSettings: {
        colorScheme: 'default',
        colorMode: {
          defaultMode: 'dark' as const,
          lightScheme: 'light-scheme',
          darkScheme: 'dark-scheme',
        },
      },
    };

    // Default instance (no cfg or no sink) → reads host data-theme.
    document.documentElement.setAttribute('data-theme', 'dark');
    const name = getActiveSchemeName(clusterWithMode, undefined);
    expect(name).toBe('dark-scheme');
  });

  it('sink instance ignores data-theme and uses the cluster colorScheme fallback', () => {
    const clusterWithMode = {
      ...FIXTURE_CLUSTER,
      panelSettings: {
        colorScheme: 'my-default-scheme',
        colorMode: {
          defaultMode: 'dark' as const,
          lightScheme: 'light-scheme',
          darkScheme: 'dark-scheme',
        },
      },
    };

    const sink = makeSinkSpy();
    const cfgWithSink = { ...FIXTURE_PANEL_CONFIG, tabs: FIXTURE_TABS, applySink: sink };

    // Even though data-theme is 'dark', the sink instance should NOT read it.
    document.documentElement.setAttribute('data-theme', 'dark');
    const name = getActiveSchemeName(clusterWithMode, cfgWithSink);
    expect(name).toBe('my-default-scheme');
  });

  it('default instance (cfg without sink) still reads data-theme', () => {
    const clusterWithMode = {
      ...FIXTURE_CLUSTER,
      panelSettings: {
        colorScheme: 'my-default-scheme',
        colorMode: {
          defaultMode: 'light' as const,
          lightScheme: 'light-scheme',
          darkScheme: 'dark-scheme',
        },
      },
    };

    // cfg is provided but has no applySink → not a sink instance.
    const cfgNoSink = { ...FIXTURE_PANEL_CONFIG, tabs: FIXTURE_TABS };
    document.documentElement.setAttribute('data-theme', 'light');
    const name = getActiveSchemeName(clusterWithMode, cfgNoSink);
    expect(name).toBe('light-scheme');
  });
});

// ---------------------------------------------------------------------------
// Spy parity — default path byte-identical to pre-sink behavior
// ---------------------------------------------------------------------------

describe('spy parity — default path unchanged when no sink is configured', () => {
  it('applyColorState without sink calls setProperty exactly as before', () => {
    installFixturePanelConfig();
    const state = initColorFromScheme(FIXTURE_CLUSTER);
    applyColorState(state, FIXTURE_CLUSTER);

    // Must have called setProperty for palette + semantic vars.
    const calls = setPropertySpy.mock.calls.map(([name]: [string]) => name);
    // Palette.
    for (let i = 0; i < FIXTURE_CLUSTER.paletteSize; i++) {
      expect(calls).toContain(`--fixture-p${i}`);
    }
    // Semantic.
    expect(calls).toContain('--fixture-semantic-accent');
    // Sink was not called because there is no sink.
    // (No sink object to assert on — the property reads default config which
    //  has no applySink, so the default path runs.)
  });

  it('clearAppliedStyles without sink calls removeProperty on :root', () => {
    installFixturePanelConfig();
    document.documentElement.style.setProperty('--fixture-p0', '#ff0000');
    setPropertySpy.mockClear();

    clearAppliedStyles();

    expect(removePropertySpy).toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// configurePanel with applySink — integration smoke test
// ---------------------------------------------------------------------------

describe('configurePanel with applySink', () => {
  it('applyFullState picks up the sink from configurePanel', () => {
    __resetPanelConfigForTests();
    const sink = makeSinkSpy();
    const cfg = configurePanel({ ...FIXTURE_PANEL_CONFIG, tabs: FIXTURE_TABS, applySink: sink });
    // cfg returns the handle; the config is registered as the default instance.

    const state = {
      color: initColorFromScheme(FIXTURE_CLUSTER),
      spacing: { 'hsp-md': '42px' },
      typography: {},
      size: {},
    };

    // applyFullState with no cfg arg should pick up the default (just configured) instance.
    applyFullState(state);

    expect(setPropertySpy).not.toHaveBeenCalled();
    const pairs = flatApplyPairs(sink.applyCalls);
    expect(pairs.length).toBeGreaterThan(0);

    // Return value is PanelInstanceHandle (used for type check only).
    expect(cfg.instanceId).toBe(FIXTURE_PANEL_CONFIG.storagePrefix);
  });
});

// ---------------------------------------------------------------------------
// F3 regression: initColorFromScheme must thread cfg to getActiveSchemeName
// so sink instances never read the host document's data-theme (issue #440).
// ---------------------------------------------------------------------------

describe('initColorFromScheme — sink instance ignores host data-theme (F3 regression, issue #440)', () => {
  const SCHEME_DEFAULT = 'default-scheme';
  const SCHEME_DARK = 'dark-scheme';

  /** A cluster with two schemes and colorMode enabled, seeding from SCHEME_DEFAULT. */
  function makeSinkCluster() {
    const scheme = (label: string) => ({
      background: 0,
      foreground: 1,
      cursor: 2,
      selectionBg: 0,
      selectionFg: 1,
      // Use distinct palette[0] so we can verify which scheme was picked.
      palette: [`#${label.slice(0, 2).padEnd(2, '0')}0000`, ...Array.from({ length: 15 }, () => '#000000')] as [
        string, string, string, string, string, string, string, string,
        string, string, string, string, string, string, string, string,
      ],
      shikiTheme: 'dracula',
    });

    return {
      ...FIXTURE_CLUSTER,
      paletteSize: 16,
      colorSchemes: {
        [SCHEME_DEFAULT]: scheme('de'),
        [SCHEME_DARK]: scheme('da'),
      },
      panelSettings: {
        colorScheme: SCHEME_DEFAULT,
        colorMode: {
          defaultMode: 'light' as const,
          lightScheme: SCHEME_DEFAULT,
          darkScheme: SCHEME_DARK,
        },
      },
    };
  }

  it('without cfg: reads data-theme and seeds from darkScheme when data-theme=dark', () => {
    const cluster = makeSinkCluster();
    document.documentElement.setAttribute('data-theme', 'dark');
    const state = initColorFromScheme(cluster);
    // With data-theme=dark and no cfg, it should pick SCHEME_DARK.
    expect(getActiveSchemeName(cluster, undefined)).toBe(SCHEME_DARK);
    // The first palette slot is unique per scheme — confirm scheme was applied.
    expect(state.palette[0]).toBe('#da0000');
  });

  it('with sink cfg: ignores data-theme=dark and seeds from panelSettings.colorScheme', () => {
    const cluster = makeSinkCluster();
    const sink = makeSinkSpy();
    const cfgWithSink = { ...FIXTURE_PANEL_CONFIG, tabs: FIXTURE_TABS, applySink: sink };

    // Host data-theme says dark — sink instance must NOT follow it.
    document.documentElement.setAttribute('data-theme', 'dark');
    const state = initColorFromScheme(cluster, cfgWithSink);
    // Sink instance should use colorScheme ('default-scheme'), not darkScheme.
    expect(state.palette[0]).toBe('#de0000');
  });
});
