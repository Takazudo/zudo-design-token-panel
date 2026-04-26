import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import {
  __resetPanelConfigForTests,
  assertValidPanelConfig,
  configurePanel,
  getPanelConfig,
  resolveApplyRouting,
  setPanelColorPresets,
  type PanelConfig,
} from '../config/panel-config';
import type { TokenManifest } from '../tokens/manifest';
import type { ColorClusterDataConfig } from '../config/cluster-config';

/**
 * Regression tests for PR #1440 review items:
 *
 *  - [P0-4] re-init guard uses structural deep-equality so Astro
 *    view-transition reruns of the host-adapter (which `JSON.parse` the
 *    inline config every page load) no longer throw on byte-identical
 *    fresh objects.
 *  - [P0-3] applyEndpoint defaults / opt-out behaviour.
 *  - [P0-2] applyRouting defaults / opt-out behaviour.
 *  - [M-12] setPanelColorPresets attaches presets after configurePanel,
 *    or pre-configurePanel via the holding slot.
 *  - [P1-11] assertValidPanelConfig() trust-boundary validator messages.
 */

const EMPTY_MANIFEST: TokenManifest = {
  spacing: [],
  typography: [],
  size: [],
  color: [],
};

const EMPTY_CLUSTER: ColorClusterDataConfig = {
  id: 'empty',
  paletteSize: 4,
  baseRoles: {},
  paletteCssVarTemplate: '--empty-{n}',
  semanticDefaults: {},
  semanticCssNames: {},
  baseDefaults: {},
  defaultShikiTheme: 'dracula',
  colorSchemes: {},
  panelSettings: { colorScheme: '', colorMode: false },
};

const BASE: PanelConfig = {
  storagePrefix: 'demo',
  consoleNamespace: 'demo',
  modalClassPrefix: 'demo-modal',
  schemaId: 'demo/v1',
  exportFilenameBase: 'demo',
  tokens: EMPTY_MANIFEST,
  colorCluster: EMPTY_CLUSTER,
};

beforeEach(() => {
  __resetPanelConfigForTests();
});
afterEach(() => {
  __resetPanelConfigForTests();
});

describe('configurePanel — structural re-init guard (P0-4)', () => {
  it('accepts a byte-identical-but-fresh-reference second call without throwing', () => {
    configurePanel(BASE);
    // Simulate a JSON-parse round-trip — the second call's object is
    // structurally identical but referentially distinct.
    const reparsed = JSON.parse(JSON.stringify(BASE)) as PanelConfig;
    expect(() => configurePanel(reparsed)).not.toThrow();
  });

  it('still throws on a structurally different second call', () => {
    configurePanel(BASE);
    expect(() => configurePanel({ ...BASE, storagePrefix: 'other' })).toThrow(
      /already called with different values/,
    );
  });
});

describe('apply pipeline opt-in (P0-2 / P0-3)', () => {
  it('defaults applyRouting/applyEndpoint to empty for hosts that omit them', () => {
    configurePanel(BASE);
    const cfg = getPanelConfig();
    expect(cfg.applyEndpoint).toBeUndefined();
    expect(resolveApplyRouting(cfg)).toEqual({});
  });

  it('honours host-supplied applyRouting + applyEndpoint', () => {
    configurePanel({
      ...BASE,
      applyEndpoint: '/api/dev/foo-tokens-apply',
      applyRouting: { foo: 'src/foo.css' },
    });
    const cfg = getPanelConfig();
    expect(cfg.applyEndpoint).toBe('/api/dev/foo-tokens-apply');
    expect(resolveApplyRouting(cfg)).toEqual({ foo: 'src/foo.css' });
  });
});

describe('setPanelColorPresets — lazy attach (M-12)', () => {
  it('attaches presets after configurePanel without throwing', () => {
    configurePanel(BASE);
    setPanelColorPresets({ neon: { ...BASELINE_SCHEME() } });
    const cfg = getPanelConfig();
    expect(cfg.colorPresets).toEqual({ neon: BASELINE_SCHEME() });
  });

  it('parks presets in a holding slot when called before configurePanel, then merges on configure', () => {
    setPanelColorPresets({ neon: BASELINE_SCHEME() });
    configurePanel(BASE);
    const cfg = getPanelConfig();
    expect(cfg.colorPresets).toEqual({ neon: BASELINE_SCHEME() });
  });
});

describe('assertValidPanelConfig — trust-boundary validator (P1-11)', () => {
  it('rejects null / non-object inputs', () => {
    expect(() => assertValidPanelConfig(null)).toThrow(/non-null object/);
    expect(() => assertValidPanelConfig(42)).toThrow(/non-null object/);
    expect(() => assertValidPanelConfig([])).toThrow(/non-null object/);
  });

  it('names the missing primitive field in its error message', () => {
    expect(() => assertValidPanelConfig({ ...BASE, storagePrefix: '' } as unknown)).toThrow(
      /storagePrefix/,
    );
  });

  it('rejects malformed tokens / colorCluster shapes', () => {
    expect(() =>
      assertValidPanelConfig({
        ...BASE,
        tokens: { spacing: 'not-an-array', typography: [], size: [], color: [] },
      } as unknown),
    ).toThrow(/tokens\.spacing/);
    expect(() =>
      assertValidPanelConfig({
        ...BASE,
        colorCluster: { ...EMPTY_CLUSTER, id: '' },
      } as unknown),
    ).toThrow(/colorCluster\.id/);
  });

  it('passes a valid PanelConfig silently', () => {
    expect(() => assertValidPanelConfig(BASE)).not.toThrow();
  });
});

function BASELINE_SCHEME() {
  // ColorScheme.palette is typed as a 16-tuple; build it explicitly.
  const palette: [
    string,
    string,
    string,
    string,
    string,
    string,
    string,
    string,
    string,
    string,
    string,
    string,
    string,
    string,
    string,
    string,
  ] = Array.from({ length: 16 }, (_, i) => `#${i.toString(16).padStart(2, '0')}0000`) as [
    string,
    string,
    string,
    string,
    string,
    string,
    string,
    string,
    string,
    string,
    string,
    string,
    string,
    string,
    string,
    string,
  ];
  return {
    background: 0,
    foreground: 1,
    cursor: 2,
    selectionBg: 0,
    selectionFg: 1,
    palette,
    shikiTheme: 'dracula',
  };
}
