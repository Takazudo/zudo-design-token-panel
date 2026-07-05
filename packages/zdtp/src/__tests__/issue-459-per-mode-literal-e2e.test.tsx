// @vitest-environment jsdom

/**
 * Per-mode literal light-dark() — end-to-end confirm (S13, #474, closing out
 * the Wave-4 sequence for epic #459).
 *
 * Wave 4 (#472-#473) added a per-mode variant of the `{ literal }` semantic
 * value:
 *
 *   - `SemanticValue` gained the `{ literal: { light: string; dark: string } }`
 *     shape (in addition to the existing single-mode `{ literal: string }`
 *     and cross-tab `{ ref }` variants).
 *   - Both emitters — the disk emitter (`buildApplyOverrides`) and the DOM
 *     emitter (`applyColorState`/`resolveSemanticCssValue`) — emit a CSS
 *     `light-dark(<light>, <dark>)` function for this shape so the browser
 *     resolves the correct side from the applied root's `color-scheme` (#472).
 *   - `applyColorState` additionally writes `color-scheme: light dark` on the
 *     applied root whenever any per-mode literal is present, routed through
 *     the sink for a sink instance so it lands on the sink's own target root,
 *     never a hardcoded `document.documentElement` (#472).
 *   - `getClusterDefaultMode` / `resolvePerModeLiteral` /
 *     `resolveSemanticPreviewColor` give `panelSettings.colorMode.defaultMode`
 *     a real runtime effect: the flat fallback side used anywhere
 *     `light-dark()` cannot resolve (a preview swatch, an SSR seed) (#472).
 *   - `SemanticLiteralRow` (lone semantic tier, no `referencesRamps`) and
 *     `SemanticRefOrLiteralRow`/`TierRefSelector` (a `referencesRamps`
 *     tier) both render a "Per-mode" checkbox that expands a single literal
 *     into an independently-editable light/dark `ColorField` pair (#473).
 *   - `SCHEMA_V3` serialize/deserialize round-trips the per-mode shape
 *     verbatim (#462, extended for the per-mode literal by #472/#473's own
 *     unit suites).
 *
 * Each of #472/#473 has its own unit-level test file
 * (`state/__tests__/per-mode-literal.test.ts`, `tabs/__tests__/color-tab.test.tsx`'s
 * S12 section, `utils/__tests__/design-token-serde.test.ts`'s SCHEMA_V3 section).
 * This file is the S13 confirm: it proves the whole stack works together —
 * configure -> resolve -> render -> apply (disk + DOM, parity) ->
 * color-scheme routing (normal AND sink instance) -> serde round-trip ->
 * persist round-trip -> defaultMode fallback -> the pre-existing
 * single-mode-literal / ref / index paths are unaffected — through one
 * fixture that ships BOTH a grouped Palette tab (a ramp source, so the ref
 * regression check is real, not a stub) and a Color tab whose semantic tier
 * declares `referencesRamps` into it and carries all three post-Wave-4
 * `SemanticValue` shapes side by side.
 *
 * IMPORTANT — jsdom cannot resolve `light-dark()` visually: jsdom's cssstyle
 * engine returns CSS function values verbatim; it never evaluates
 * `light-dark()` against a `color-scheme` the way a real browser's rendering
 * engine does. Every assertion below is on the STRING FORM of the emitted
 * `light-dark(...)` value and the `color-scheme` declaration that lets a real
 * browser resolve it — not the resolved color. Actual browser-side resolution
 * (does the swatch actually turn dark when `color-scheme: dark` is active?)
 * is a browser/Mac verification concern, out of scope for this jsdom suite.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render } from 'preact';
import { act } from 'preact/test-utils';

import ColorTab from '../tabs/color-tab';
import {
  __resetPanelConfigForTests,
  assertValidPanelConfig,
  configurePanel,
  getPanelConfig,
  type ApplySink,
  type PanelConfig,
} from '../config/panel-config';
import { resolveColorClusterFromTab } from '../config/cluster-config';
import {
  applyColorState,
  applyFullState,
  clearAppliedColorStyles,
  clearAppliedStyles,
  getActivePrimaryCluster,
  getClusterDefaultMode,
  initColorFromScheme,
  isLiteralMapping,
  isPerModeLiteral,
  isRefMapping,
  loadPersistedState,
  resolvePerModeLiteral,
  resolveSemanticPreviewColor,
  savePersistedState,
  type ColorTweakState,
  type StorageLike,
  type TweakState,
} from '../state/tweak-state';
import { buildApplyOverrides } from '../apply/build-apply-overrides';
import {
  deserialize,
  serialize,
  SCHEMA_V3,
  type DesignTokenJsonV3,
} from '../utils/design-token-serde';
import {
  HighlightContext,
  type HighlightContextValue,
} from '../highlight/highlight-toggle-button';
import { DEFAULT_HIGHLIGHT_SLOTS, type HighlightState } from '../highlight/highlight-state';
import { TooltipProvider } from '../controls/tooltip';
import type { TabConfig } from '../tokens/tier-model';
import type { PersistColor, PersistSecondary } from '../state/persist';
import { FIXTURE_TABS, FIXTURE_PANEL_CONFIG } from './_test-helpers';

// ---------------------------------------------------------------------------
// FIXTURE — a grouped Palette tab (ramp source) + a Color tab whose lone
// semantic:true tier declares referencesRamps into it, carrying all three
// post-Wave-4 SemanticValue shapes side by side:
//
//   - `brand`  — { ref }, a cross-tab ramp reference (#468, unaffected by Wave 4)
//   - `info`   — { literal: string }, a single-mode literal (#465, unaffected)
//   - `danger` — { literal: { light, dark } }, the Wave-4 per-mode literal
//
// `colorMode.defaultMode: 'dark'` is deliberately NOT the library default
// ('light') so a test asserting the dark side was picked can't pass by
// accident from an unset/default fallback.
// ---------------------------------------------------------------------------

const PALETTE_TAB: TabConfig = {
  id: 'palette',
  label: 'Palette',
  tiers: [
    {
      id: 'base',
      label: 'Base',
      items: [
        { id: 'base-0', cssVar: '--palette-base-0', label: 'Base 0', default: 'oklch(0.98 0 0)', type: { kind: 'color', format: 'oklch' } },
        { id: 'base-1', cssVar: '--palette-base-1', label: 'Base 1', default: 'oklch(0.8 0 0)', type: { kind: 'color', format: 'oklch' } },
        { id: 'base-2', cssVar: '--palette-base-2', label: 'Base 2', default: 'oklch(0.6 0 0)', type: { kind: 'color', format: 'oklch' } },
      ],
    },
  ],
};

const LIGHT_DANGER = 'oklch(0.505 0.213 27)';
const DARK_DANGER = 'oklch(0.655 0.213 27)';

const COLOR_TAB: TabConfig = {
  id: 'color',
  label: 'Color',
  colorExtras: {
    id: 'per-mode-e2e',
    label: 'Per-mode E2E',
    baseRoles: {},
    baseDefaults: {},
    defaultShikiTheme: 'dracula',
    colorSchemes: {},
    panelSettings: {
      // Non-empty (though functionally unused — colorSchemes is empty, so
      // initColorFromScheme short-circuits to initSecondaryDefaults) so this
      // fixture also passes assertValidPanelConfig, the host-adapter trust
      // boundary validator (F8), not just configurePanel itself.
      colorScheme: 'default',
      colorMode: { defaultMode: 'dark', lightScheme: 'L', darkScheme: 'D' },
    },
  },
  tiers: [
    {
      id: 'semantic',
      label: 'Semantic',
      semantic: true,
      referencesRamps: [{ tab: 'palette', tier: 'base' }],
      items: [
        {
          id: 'brand',
          cssVar: '--zd-brand',
          label: 'Brand',
          default: 'base-1',
          type: { kind: 'color', format: 'oklch' },
        },
        {
          id: 'info',
          cssVar: '--zd-info',
          label: 'Info',
          default: 'oklch(0.6 0.1 230)',
          type: { kind: 'color', format: 'oklch' },
        },
        {
          id: 'danger',
          cssVar: '--zd-danger',
          label: 'Danger',
          // The manifest default is a single-mode literal (TierItem.default
          // is a plain string — the per-mode shape only ever arises at
          // runtime, via the "Per-mode" checkbox, never from a manifest
          // default). Tests that need a per-mode STATE build it explicitly
          // via `makePerModeState()` below, matching #472/#473's own suites.
          default: LIGHT_DANGER,
          type: { kind: 'color', format: 'oklch' },
        },
      ],
    },
  ],
};

const ALL_TABS: readonly TabConfig[] = [PALETTE_TAB, COLOR_TAB];

const PER_MODE_PANEL_CONFIG: PanelConfig = {
  storagePrefix: 'issue-459-per-mode-e2e',
  consoleNamespace: 'issue-459-per-mode-e2e',
  modalClassPrefix: 'issue-459-per-mode-e2e-modal',
  schemaId: 'zudo-design-tokens/v1',
  exportFilenameBase: 'issue-459-per-mode-e2e-tokens',
  tabs: ALL_TABS,
  colorPresets: {},
};

// ---------------------------------------------------------------------------
// HELPERS
// ---------------------------------------------------------------------------

function makeHighlightState(): HighlightState {
  return {
    slots: DEFAULT_HIGHLIGHT_SLOTS.map((s) => ({ ...s })),
    outlineWidth: 2,
    active: {},
  };
}

function makeCtx(state: HighlightState, toggle: (cssVar: string) => void): HighlightContextValue {
  return { state, toggle };
}

let container: HTMLDivElement;

beforeEach(() => {
  __resetPanelConfigForTests();
  configurePanel(PER_MODE_PANEL_CONFIG);
  container = document.createElement('div');
  document.body.appendChild(container);
  document.documentElement.removeAttribute('style');
  localStorage.setItem('tokenpanel.colorPicker.mode', 'oklch');
});

afterEach(() => {
  act(() => {
    render(null, container);
  });
  document.body.removeChild(container);
  document.documentElement.removeAttribute('style');
  __resetPanelConfigForTests();
  localStorage.removeItem('tokenpanel.colorPicker.mode');
  vi.restoreAllMocks();
});

/** Render ColorTab wrapped in TooltipProvider and HighlightContext. */
function renderColorTab(
  tab: TabConfig,
  state: ColorTweakState,
  opts: { persistColor?: PersistColor; persistSecondary?: PersistSecondary } = {},
): void {
  const { persistColor = vi.fn(), persistSecondary = vi.fn() } = opts;
  const ctx = makeCtx(makeHighlightState(), vi.fn());
  act(() => {
    render(
      <TooltipProvider>
        <HighlightContext.Provider value={ctx}>
          <ColorTab
            tab={tab}
            state={state}
            persistColor={persistColor}
            secondaryTab={null}
            secondaryState={null}
            persistSecondary={persistSecondary}
          />
        </HighlightContext.Provider>
      </TooltipProvider>,
      container,
    );
  });
}

function makeBaseState(): ColorTweakState {
  const cluster = getActivePrimaryCluster();
  return initColorFromScheme(cluster);
}

/** `makeBaseState()`, with `danger` overridden to the per-mode literal pair. */
function makePerModeState(): ColorTweakState {
  const base = makeBaseState();
  return {
    ...base,
    semanticMappings: {
      ...base.semanticMappings,
      danger: { literal: { light: LIGHT_DANGER, dark: DARK_DANGER } },
    },
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

/** In-memory `StorageLike` double for persist round-trip tests (no real localStorage). */
function makeStorage(): StorageLike & { entries: Record<string, string> } {
  const entries: Record<string, string> = {};
  return {
    entries,
    getItem: (k) => (k in entries ? entries[k] : null),
    setItem: (k, v) => {
      entries[k] = v;
    },
    removeItem: (k) => {
      delete entries[k];
    },
  };
}

/** Locate a semantic row's `<select>` by its row data-testid (grouped/referencesRamps rows). */
function getSemanticRefSelect(idKey: string): HTMLSelectElement {
  const row = container.querySelector(`[data-testid="tokenpanel-semantic-ref-${idKey}"]`);
  expect(row).not.toBeNull();
  const select = row!.querySelector('select.tokenpanel-tier-ref-select') as HTMLSelectElement;
  expect(select).not.toBeNull();
  return select;
}

/** Nudge the first slider in the open picker with a keyboard arrow — the deterministic
 *  way to drive a ColorField swatch edit through to onChange under jsdom (pointer
 *  events on the slider are inert there). Mirrors color-tab.test.tsx's own helper. */
function fireFirstPickerSliderArrow(key = 'ArrowUp'): void {
  const slider = container.querySelector('[role="dialog"] [role="slider"]') as HTMLElement;
  if (!slider) throw new Error('no slider in open picker');
  act(() => {
    slider.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true }));
  });
}

// ---------------------------------------------------------------------------
// 1. configurePanel + resolveColorClusterFromTab
// ---------------------------------------------------------------------------

describe('1. configurePanel accepts the palette + per-mode-literal color tab pair', () => {
  it('does NOT throw', () => {
    __resetPanelConfigForTests();
    expect(() => configurePanel(PER_MODE_PANEL_CONFIG)).not.toThrow();
  });

  it('assertValidPanelConfig accepts it too (host-adapter trust boundary)', () => {
    expect(() => assertValidPanelConfig(PER_MODE_PANEL_CONFIG)).not.toThrow();
  });

  it('resolves the "danger" manifest default to a single-mode { literal } (per-mode is a runtime-only state, #472/#473)', () => {
    const cluster = resolveColorClusterFromTab(COLOR_TAB, ALL_TABS)!;
    expect(cluster.semanticDefaults['danger']).toEqual({ literal: LIGHT_DANGER });
  });

  it('getClusterDefaultMode reads the configured "dark" default from panelSettings.colorMode', () => {
    const cluster = resolveColorClusterFromTab(COLOR_TAB, ALL_TABS)!;
    expect(getClusterDefaultMode(cluster)).toBe('dark');
  });
});

// ---------------------------------------------------------------------------
// 2. Emitter parity — disk (buildApplyOverrides) vs. DOM (applyColorState)
// ---------------------------------------------------------------------------

describe('2. both emitters emit light-dark(...) for the per-mode literal, and agree with each other', () => {
  it('buildApplyOverrides emits light-dark(<light>, <dark>) for danger, var(...) for the ref, and the literal verbatim for info', () => {
    const colorState = makePerModeState();
    const fullState: TweakState = { color: colorState, spacing: {}, typography: {}, size: {} };
    const cluster = getActivePrimaryCluster();

    const out = buildApplyOverrides(fullState, undefined, cluster, ALL_TABS);

    expect(out['--zd-danger']).toBe(`light-dark(${LIGHT_DANGER}, ${DARK_DANGER})`);
    expect(out['--zd-brand']).toBe('var(--palette-base-1)');
    expect(out['--zd-info']).toBe('oklch(0.6 0.1 230)');
  });

  it('applyColorState writes the identical values to document.documentElement', () => {
    const colorState = makePerModeState();
    const cluster = getActivePrimaryCluster();

    applyColorState(colorState, cluster, undefined, COLOR_TAB, ALL_TABS);

    const root = document.documentElement.style;
    expect(root.getPropertyValue('--zd-danger')).toBe(`light-dark(${LIGHT_DANGER}, ${DARK_DANGER})`);
    expect(root.getPropertyValue('--zd-brand')).toBe('var(--palette-base-1)');
    expect(root.getPropertyValue('--zd-info')).toBe('oklch(0.6 0.1 230)');
  });

  it('disk and DOM outputs agree byte-for-byte for every semantic cssVar', () => {
    const colorState = makePerModeState();
    const cluster = getActivePrimaryCluster();
    const fullState: TweakState = { color: colorState, spacing: {}, typography: {}, size: {} };

    const diskMap = buildApplyOverrides(fullState, undefined, cluster, ALL_TABS);
    applyColorState(colorState, cluster, undefined, COLOR_TAB, ALL_TABS);

    for (const cssVar of ['--zd-danger', '--zd-brand', '--zd-info']) {
      const domValue = document.documentElement.style.getPropertyValue(cssVar);
      expect(diskMap[cssVar]).toBe(domValue);
    }
  });

  it('the disk emitter never emits a "color-scheme" entry — that is a DOM-only apply-time concern', () => {
    const colorState = makePerModeState();
    const fullState: TweakState = { color: colorState, spacing: {}, typography: {}, size: {} };
    const cluster = getActivePrimaryCluster();

    const out = buildApplyOverrides(fullState, undefined, cluster, ALL_TABS);
    expect(out['color-scheme']).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// 3. color-scheme routing — normal instance (documentElement) vs. sink instance
// ---------------------------------------------------------------------------

describe('3. color-scheme: light dark is set on the correct root', () => {
  it('a normal instance sets color-scheme on document.documentElement', () => {
    const colorState = makePerModeState();
    applyFullState({ color: colorState, spacing: {}, typography: {}, size: {} });

    expect(document.documentElement.style.getPropertyValue('color-scheme')).toBe('light dark');
  });

  it('a state with only single-mode literals / refs (no per-mode) sets NO color-scheme', () => {
    const colorState = makeBaseState();
    applyFullState({ color: colorState, spacing: {}, typography: {}, size: {} });

    expect(document.documentElement.style.getPropertyValue('color-scheme')).toBe('');
  });

  it('a sink instance routes color-scheme through the sink to ITS OWN target root, never :root', () => {
    const sink = makeSinkSpy();
    const sinkCfg: PanelConfig = { ...PER_MODE_PANEL_CONFIG, applySink: sink };
    __resetPanelConfigForTests();
    configurePanel(sinkCfg);

    const colorState = makePerModeState();
    applyFullState({ color: colorState, spacing: {}, typography: {}, size: {} }, sinkCfg);

    const colorScheme = flatApplyPairs(sink.applyCalls).find(([name]) => name === 'color-scheme');
    expect(colorScheme).toEqual(['color-scheme', 'light dark']);

    const danger = flatApplyPairs(sink.applyCalls).find(([name]) => name === '--zd-danger');
    expect(danger?.[1]).toBe(`light-dark(${LIGHT_DANGER}, ${DARK_DANGER})`);

    // :root (the host document) was never touched by the sink path.
    expect(document.documentElement.style.getPropertyValue('color-scheme')).toBe('');
    expect(document.documentElement.style.getPropertyValue('--zd-danger')).toBe('');

    // Re-configure back to the non-sink fixture so afterEach's reset is clean.
    __resetPanelConfigForTests();
    configurePanel(PER_MODE_PANEL_CONFIG);
  });
});

// ---------------------------------------------------------------------------
// 4. Serde round-trip (SCHEMA_V3) and persist round-trip (save -> load)
// ---------------------------------------------------------------------------

describe('4. per-mode literal round-trips through serde and persist', () => {
  it('serialize upgrades to SCHEMA_V3 and emits the per-mode { literal: { light, dark } } leaf verbatim', () => {
    const colorState = makePerModeState();
    const fullState: TweakState = { color: colorState, spacing: {}, typography: {}, size: {} };

    const json = serialize(fullState, { colorDefaults: makeBaseState() }) as DesignTokenJsonV3;
    expect(json.$schema).toBe(SCHEMA_V3);
    const semMap = json.tabs?.['color']?.['semantic'];
    expect(semMap).toMatchObject({
      '--zd-danger': { literal: { light: LIGHT_DANGER, dark: DARK_DANGER } },
    });
  });

  it('deserialize reconstructs the identical per-mode mapping from the serialized JSON', () => {
    const colorState = makePerModeState();
    const fullState: TweakState = { color: colorState, spacing: {}, typography: {}, size: {} };
    const colorDefaults = makeBaseState();

    const json = serialize(fullState, { colorDefaults });
    const { state, unknownTokens, warnings } = deserialize(JSON.parse(JSON.stringify(json)), {
      colorDefaults,
    });

    expect(unknownTokens).toEqual([]);
    expect(warnings).toEqual([]);
    expect(state.color.semanticMappings.danger).toEqual({
      literal: { light: LIGHT_DANGER, dark: DARK_DANGER },
    });
  });

  it('savePersistedState -> loadPersistedState round-trips the per-mode mapping (no real localStorage involved)', () => {
    const colorState = makePerModeState();
    const fullState: TweakState = { color: colorState, spacing: {}, typography: {}, size: {} };
    const storage = makeStorage();

    savePersistedState(fullState, storage);
    const loaded = loadPersistedState(storage, colorState, getActivePrimaryCluster());

    expect(loaded).not.toBeNull();
    expect(loaded!.color.semanticMappings.danger).toEqual({
      literal: { light: LIGHT_DANGER, dark: DARK_DANGER },
    });
    // The ref and single-mode-literal mappings persisted alongside it too.
    expect(loaded!.color.semanticMappings.brand).toEqual({
      ref: { tab: 'palette', tier: 'base', item: 'base-1' },
    });
    expect(loaded!.color.semanticMappings.info).toEqual({ literal: 'oklch(0.6 0.1 230)' });
  });
});

// ---------------------------------------------------------------------------
// 5. defaultMode selects the correct preview / fallback color
// ---------------------------------------------------------------------------

describe('5. defaultMode (getClusterDefaultMode) selects the preview/fallback side', () => {
  it('resolveSemanticPreviewColor collapses the per-mode literal to the cluster defaultMode side ("dark")', () => {
    const colorState = makePerModeState();
    const cluster = getActivePrimaryCluster();
    const mapping = colorState.semanticMappings.danger;

    const preview = resolveSemanticPreviewColor(mapping, colorState, cluster);
    expect(preview).toBe(DARK_DANGER);
  });

  it('resolvePerModeLiteral selects either side directly, independent of defaultMode', () => {
    const value = { literal: { light: LIGHT_DANGER, dark: DARK_DANGER } };
    expect(resolvePerModeLiteral(value, 'light')).toBe(LIGHT_DANGER);
    expect(resolvePerModeLiteral(value, 'dark')).toBe(DARK_DANGER);
  });

  it('a single-mode literal and a ref preview unaffected by defaultMode (regression)', () => {
    const colorState = makePerModeState();
    const cluster = getActivePrimaryCluster();
    expect(
      resolveSemanticPreviewColor(colorState.semanticMappings.info, colorState, cluster),
    ).toBe('oklch(0.6 0.1 230)');
    expect(
      resolveSemanticPreviewColor(
        colorState.semanticMappings.brand,
        colorState,
        cluster,
        COLOR_TAB,
        ALL_TABS,
      ),
    ).toBe('var(--palette-base-1)');
  });
});

// ---------------------------------------------------------------------------
// 6. Rendering — the per-mode row shows the light/dark editor; edits persist
//    independently; sibling ref/literal rows are unaffected.
// ---------------------------------------------------------------------------

describe('6. rendering: the per-mode row shows a checked "Per-mode" toggle and two independently-editable swatches', () => {
  it('the "danger" row (per-mode) shows a CHECKED Per-mode checkbox and two color-field swatches', () => {
    renderColorTab(COLOR_TAB, makePerModeState());

    const row = container.querySelector('[data-testid="tokenpanel-semantic-ref-danger"]')!;
    const checkbox = row.querySelector('input[type="checkbox"]') as HTMLInputElement;
    expect(checkbox).not.toBeNull();
    expect(checkbox.checked).toBe(true);
    expect(row.querySelectorAll('[data-testid="color-field-swatch"]').length).toBe(2);
  });

  it('editing the Light swatch persists only the light side, leaving dark untouched', () => {
    const persistColor = vi.fn();
    const baseState = makePerModeState();
    renderColorTab(COLOR_TAB, baseState, { persistColor });

    const row = container.querySelector('[data-testid="tokenpanel-semantic-ref-danger"]')!;
    const lightSwatch = row.querySelector(
      '[aria-label="--zd-danger (Light): --zd-danger"]',
    ) as HTMLElement;
    expect(lightSwatch).not.toBeNull();
    act(() => lightSwatch.click());
    fireFirstPickerSliderArrow();

    expect(persistColor).toHaveBeenCalled();
    const updater = persistColor.mock.calls.at(-1)![0] as (
      prev: ColorTweakState,
    ) => ColorTweakState;
    const result = updater(baseState);
    expect(result.semanticMappings.danger).toEqual({
      literal: { light: expect.stringMatching(/^oklch\(/), dark: DARK_DANGER },
    });
  });

  it('editing the Dark swatch persists only the dark side, leaving light untouched', () => {
    const persistColor = vi.fn();
    const baseState = makePerModeState();
    renderColorTab(COLOR_TAB, baseState, { persistColor });

    const row = container.querySelector('[data-testid="tokenpanel-semantic-ref-danger"]')!;
    const darkSwatch = row.querySelector(
      '[aria-label="--zd-danger (Dark): --zd-danger"]',
    ) as HTMLElement;
    expect(darkSwatch).not.toBeNull();
    act(() => darkSwatch.click());
    fireFirstPickerSliderArrow();

    expect(persistColor).toHaveBeenCalled();
    const updater = persistColor.mock.calls.at(-1)![0] as (
      prev: ColorTweakState,
    ) => ColorTweakState;
    const result = updater(baseState);
    expect(result.semanticMappings.danger).toEqual({
      literal: { light: LIGHT_DANGER, dark: expect.stringMatching(/^oklch\(/) },
    });
  });

  it('sibling rows are unaffected: "brand" still shows the resolved ramp option, "info" still shows a single unchecked swatch', () => {
    renderColorTab(COLOR_TAB, makePerModeState());

    // brand — ref row, grouped picker selects the Base optgroup option.
    const brandSelect = getSemanticRefSelect('brand');
    const selected = Array.from(brandSelect.querySelectorAll('option')).find((o) => o.selected);
    expect(selected?.textContent).toContain('--palette-base-1');

    // info — single-mode literal row on the SAME referencesRamps tier still
    // renders through the grouped picker (S9/#470), with an UNCHECKED
    // Per-mode toggle and exactly one swatch (regression: unaffected by Wave 4).
    const infoRow = container.querySelector('[data-testid="tokenpanel-semantic-ref-info"]')!;
    const infoCheckbox = infoRow.querySelector('input[type="checkbox"]') as HTMLInputElement;
    expect(infoCheckbox.checked).toBe(false);
    expect(infoRow.querySelectorAll('[data-testid="color-field-swatch"]').length).toBe(1);
  });
});

// ---------------------------------------------------------------------------
// 7. Regression — a conventional palette+semantic 2-tier cluster (legacy
// index mappings) still works unchanged (index rows unaffected by Wave 4).
// ---------------------------------------------------------------------------

describe('7. regression: legacy index-based semantic mappings still emit/behave as before', () => {
  it('a conventional 2-tier palette+semantic color tab (index mappings) still renders and applies unchanged', () => {
    __resetPanelConfigForTests();
    configurePanel(FIXTURE_PANEL_CONFIG);

    const colorTab = FIXTURE_TABS.find((t) => t.id === 'color')!;
    const cluster = getActivePrimaryCluster();
    const state = initColorFromScheme(cluster);

    renderColorTab(colorTab, state);

    const paletteGrid = container.querySelector('.tokenpanel-color-palette-grid') as HTMLElement;
    expect(paletteGrid).not.toBeNull();
    expect(paletteGrid.querySelectorAll('.tokenpanel-color-swatch-button').length).toBe(16);
    expect(container.querySelectorAll('select.tokenpanel-tier-ref-select').length).toBe(0);

    const fullState: TweakState = { color: state, spacing: {}, typography: {}, size: {} };
    const diskMap = buildApplyOverrides(fullState, undefined, cluster, getPanelConfig().tabs);
    applyColorState(state, cluster);
    expect(diskMap['--fixture-semantic-accent']).toBe('var(--fixture-p6)');
    expect(document.documentElement.style.getPropertyValue('--fixture-semantic-accent')).toBe(
      state.palette[6],
    );
    // No per-mode literal anywhere in this fixture -> no color-scheme write.
    expect(document.documentElement.style.getPropertyValue('color-scheme')).toBe('');

    // Restore the per-mode fixture config for any subsequent test in this file.
    __resetPanelConfigForTests();
    configurePanel(PER_MODE_PANEL_CONFIG);
  });

  it('isPerModeLiteral / isLiteralMapping / isRefMapping narrow the three shapes correctly (sanity)', () => {
    const state = makePerModeState();
    expect(isPerModeLiteral(state.semanticMappings.danger)).toBe(true);
    expect(isLiteralMapping(state.semanticMappings.info)).toBe(true);
    expect(isPerModeLiteral(state.semanticMappings.info)).toBe(false);
    expect(isRefMapping(state.semanticMappings.brand)).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// 8. Part B — Reset clears a lingering color-scheme (#474 cleanup)
// ---------------------------------------------------------------------------

describe('8. Reset removes a lingering color-scheme left by a per-mode literal apply', () => {
  it('clearAppliedColorStyles removes color-scheme from documentElement after a per-mode apply', () => {
    const colorState = makePerModeState();
    applyFullState({ color: colorState, spacing: {}, typography: {}, size: {} });
    expect(document.documentElement.style.getPropertyValue('color-scheme')).toBe('light dark');

    clearAppliedColorStyles();

    expect(document.documentElement.style.getPropertyValue('color-scheme')).toBe('');
    // The semantic var itself is cleared too (pre-existing contract).
    expect(document.documentElement.style.getPropertyValue('--zd-danger')).toBe('');
  });

  it('clearAppliedStyles (full panel Reset) also removes it', () => {
    const colorState = makePerModeState();
    applyFullState({ color: colorState, spacing: {}, typography: {}, size: {} });
    expect(document.documentElement.style.getPropertyValue('color-scheme')).toBe('light dark');

    clearAppliedStyles();

    expect(document.documentElement.style.getPropertyValue('color-scheme')).toBe('');
  });

  it('on a sink instance, the clear routes "color-scheme" through the sink alongside the rest — never touching :root', () => {
    const sink = makeSinkSpy();
    const sinkCfg: PanelConfig = { ...PER_MODE_PANEL_CONFIG, applySink: sink };
    __resetPanelConfigForTests();
    configurePanel(sinkCfg);

    const colorState = makePerModeState();
    applyFullState({ color: colorState, spacing: {}, typography: {}, size: {} }, sinkCfg);
    clearAppliedColorStyles(undefined, sink, sinkCfg);

    const cleared = flatClearNames(sink.clearCalls);
    expect(cleared).toContain('color-scheme');
    expect(document.documentElement.style.getPropertyValue('color-scheme')).toBe('');

    __resetPanelConfigForTests();
    configurePanel(PER_MODE_PANEL_CONFIG);
  });
});
