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

/**
 * Regression tests covering:
 *
 *  - The re-init guard uses structural deep-equality so Astro
 *    view-transition reruns of the host-adapter (which `JSON.parse` the
 *    inline config every page load) no longer throw on byte-identical
 *    fresh objects.
 *  - `applyEndpoint` defaults / opt-out behaviour.
 *  - `applyRouting` defaults / opt-out behaviour.
 *  - `setPanelColorPresets` attaches presets after `configurePanel`, or
 *    pre-`configurePanel` via the holding slot.
 *  - `assertValidPanelConfig()` trust-boundary validator messages.
 */

const BASE: PanelConfig = {
  storagePrefix: 'demo',
  consoleNamespace: 'demo',
  modalClassPrefix: 'demo-modal',
  schemaId: 'demo/v1',
  exportFilenameBase: 'demo',
  tabs: [],
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

  it('still throws on a same-prefix structurally-different second call', () => {
    configurePanel(BASE);
    // Same prefix, different non-prefix field → genuine config conflict, throws.
    expect(() => configurePanel({ ...BASE, consoleNamespace: 'other' })).toThrow(
      /already called with different values/,
    );
  });

  it('does NOT throw when the second call uses a distinct storagePrefix (multi-instance)', () => {
    configurePanel(BASE);
    // A distinct prefix registers an independent instance — the multi-instance
    // model lifted the global one-shot singleton to a per-prefix registry (#353).
    expect(() => configurePanel({ ...BASE, storagePrefix: 'other' })).not.toThrow();
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

describe('setPanelColorPresets + configurePanel re-init guard — F1 regression (issue #440)', () => {
  it('configure → setPresets → re-configure with structurally-equal BASE does not throw', () => {
    // Astro view-transition recipe: configure once, lazily attach presets,
    // then the host-adapter re-executes on the next navigation and calls
    // configurePanel again with a freshly-JSON-parsed (but identical) config.
    configurePanel(BASE);
    setPanelColorPresets({ vivid: BASELINE_SCHEME() });

    // Simulate the re-run with a fresh JSON-parse round-trip.
    const reparsed = JSON.parse(JSON.stringify(BASE)) as PanelConfig;
    expect(() => configurePanel(reparsed)).not.toThrow();
  });

  it('configure → setPresets → re-configure with structurally-equal BASE: presets survive', () => {
    configurePanel(BASE);
    setPanelColorPresets({ vivid: BASELINE_SCHEME() });

    const reparsed = JSON.parse(JSON.stringify(BASE)) as PanelConfig;
    configurePanel(reparsed);

    // The preset must survive the re-call — it belongs to the STORED config,
    // not the freshly-supplied one, so it must not be blown away.
    const cfg = getPanelConfig();
    expect(cfg.colorPresets).toEqual({ vivid: BASELINE_SCHEME() });
  });

  it('park-before-configure order: setPresets → configure → re-configure with equal BASE does not throw', () => {
    // "Park" order: presets arrive BEFORE configurePanel (the lazy-import
    // completes before the inline config is evaluated).
    setPanelColorPresets({ vivid: BASELINE_SCHEME() });
    configurePanel(BASE);

    const reparsed = JSON.parse(JSON.stringify(BASE)) as PanelConfig;
    expect(() => configurePanel(reparsed)).not.toThrow();
  });

  it('park-before-configure order: presets survive the re-configure call', () => {
    setPanelColorPresets({ vivid: BASELINE_SCHEME() });
    configurePanel(BASE);

    const reparsed = JSON.parse(JSON.stringify(BASE)) as PanelConfig;
    configurePanel(reparsed);

    const cfg = getPanelConfig();
    expect(cfg.colorPresets).toEqual({ vivid: BASELINE_SCHEME() });
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

  it('rejects malformed tabs shapes', () => {
    // tabs must be an array
    expect(() =>
      assertValidPanelConfig({
        ...BASE,
        tabs: 'not-an-array',
      } as unknown),
    ).toThrow(/tabs must be an array/);
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
