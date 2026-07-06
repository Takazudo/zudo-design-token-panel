// @vitest-environment jsdom

/**
 * Lone `semantic: true` OKLCH tier — end-to-end confirm (issue #458, Wave-2
 * confirm, S6, #466).
 *
 * Issue #458 reported three symptoms for a color tab that ships ONLY a
 * `semantic: true` tier of named literal OKLCH tokens (no palette tier at
 * all — e.g. a design system with `--zd-danger`, `--zd-warning`, `--zd-info`
 * but no numbered palette slots):
 *
 *   1. `configurePanel` threw — F4's palette-cssVar contiguity check
 *      mistook the semantic tier's non-contiguous named cssVars for a
 *      malformed palette.
 *   2. The Semantic Tokens section rendered N grayscale `PaletteSelector`
 *      dropdowns (pointing at a synthetic 1-slot grayscale palette) instead
 *      of editable color swatches — there was no palette to select from.
 *   3. The "Scheme…" preset dropdown rendered as a dead control (no bundled
 *      schemes, no host presets) with no indication it does nothing.
 *
 * Wave 2 (#460-#465) fixed the data model end to end:
 *   - `TierConfig.semantic?: true` opts a tier out of palette-tier detection
 *     everywhere (F4 validation, `resolveColorClusterFromTab`,
 *     `findPaletteTier`).
 *   - `resolveColorClusterFromTab` derives `semanticDefaults[id] = { literal }`
 *     for each item instead of a palette index.
 *   - `color-tab.tsx` renders `{ literal: string }` mappings through
 *     `SemanticLiteralRow` (an editable OKLCH `ColorField` swatch) instead of
 *     `PaletteSelector`.
 *   - Both emitters (`buildApplyOverrides` disk, `applyColorState` DOM via
 *     `resolveSemanticCssValue`) emit the literal CSS value verbatim.
 *   - `SCHEMA_V3` + the persist hydrator round-trip every `SemanticValue`
 *     variant, including `{ literal: string }`.
 *
 * This test proves the fix end-to-end for the all-literal, single-mode case
 * — the exact shape #458 reported — through configure → render → edit →
 * serde/persist round-trip → apply (disk + DOM, checked for parity), plus a
 * scheme-dropdown dead-control check and a conventional 2-tier regression.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render } from 'preact';
import { act } from 'preact/test-utils';

import ColorTab from '../tabs/color-tab';
import {
  __resetPanelConfigForTests,
  configurePanel,
  getPanelConfig,
  type PanelConfig,
} from '../config/panel-config';
import { resolveColorClusterFromTab } from '../config/cluster-config';
import {
  applyColorState,
  getActivePrimaryCluster,
  getStorageKeyV3,
  initColorFromScheme,
  initColorFromSchemeData,
  loadPersistedState,
  savePersistedState,
  type ColorTweakState,
  type StorageLike,
  type TweakState,
} from '../state/tweak-state';
import { buildApplyOverrides } from '../apply/build-apply-overrides';
import { serialize, deserialize, SCHEMA_V3 } from '../utils/design-token-serde';
import type { ColorScheme } from '../config/color-schemes';
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
// FIXTURE — lone semantic:true OKLCH tier, no palette tier, no schemes
// ---------------------------------------------------------------------------

/** Semantic token ids, in declaration order — used as the "N" throughout. */
const SEMANTIC_IDS = ['danger', 'warning', 'info'] as const;

const SEMANTIC_LITERALS: Record<(typeof SEMANTIC_IDS)[number], string> = {
  danger: 'oklch(0.55 0.22 25)',
  warning: 'oklch(0.75 0.15 80)',
  // No trailing zeros (0.6, not 0.60) — jsdom's cssstyle parser canonicalizes
  // `background-color` (a real CSS property, unlike a custom property) and
  // strips them, which would otherwise desync this literal from the
  // rendered swatch's `style.backgroundColor` in the "seeded default"
  // assertion below.
  info: 'oklch(0.6 0.1 230)',
};

const SEMANTIC_CSS_VARS: Record<(typeof SEMANTIC_IDS)[number], string> = {
  danger: '--zd-danger',
  warning: '--zd-warning',
  info: '--zd-info',
};

/** The lone semantic tier: named cssVars, non-contiguous, kind:'color'/'oklch'. */
const LONE_SEMANTIC_TAB: TabConfig = {
  id: 'color',
  label: 'Color',
  colorExtras: {
    id: 'lone-semantic',
    label: 'Lone Semantic',
    baseRoles: {},
    baseDefaults: {},
    defaultShikiTheme: 'dracula',
    colorSchemes: {},
    panelSettings: { colorScheme: '', colorMode: false },
  },
  tiers: [
    {
      id: 'semantic',
      label: 'Semantic',
      semantic: true,
      items: SEMANTIC_IDS.map((id) => ({
        id,
        cssVar: SEMANTIC_CSS_VARS[id],
        label: id,
        default: SEMANTIC_LITERALS[id],
        type: { kind: 'color' as const, format: 'oklch' as const },
      })),
    },
  ],
};

const LONE_SEMANTIC_PANEL_CONFIG: PanelConfig = {
  storagePrefix: 'issue-458-e2e',
  consoleNamespace: 'issue-458-e2e',
  modalClassPrefix: 'issue-458-e2e-modal',
  schemaId: 'zudo-design-tokens/v1',
  exportFilenameBase: 'issue-458-e2e-tokens',
  tabs: [LONE_SEMANTIC_TAB],
  colorPresets: {},
};

// ---------------------------------------------------------------------------
// HELPERS
// ---------------------------------------------------------------------------

function makeStorage(
  initial: Record<string, string> = {},
): StorageLike & { entries: Record<string, string> } {
  const entries: Record<string, string> = { ...initial };
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
  configurePanel(LONE_SEMANTIC_PANEL_CONFIG);
  container = document.createElement('div');
  document.body.appendChild(container);
  document.documentElement.removeAttribute('style');
  // Pin the picker to OKLCH mode so the L/C/H sliders render deterministically.
  localStorage.setItem('tokenpanel.colorPicker.mode', 'oklch');
});

afterEach(() => {
  act(() => {
    render(null, container);
  });
  document.body.removeChild(container);
  document.documentElement.removeAttribute('style');
  __resetPanelConfigForTests();
  vi.restoreAllMocks();
  localStorage.removeItem('tokenpanel.colorPicker.mode');
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

/**
 * Locate the Semantic Tokens grid by its section heading rather than a fixed
 * grid index — the Base section (and its `.tokenpanel-color-base-grid`) is
 * gated on a non-empty palette (#466 follow-up) and does not render at all
 * for the lone-semantic-tier fixture, so "2nd base-grid" is no longer a
 * stable locator for every fixture in this file.
 */
function getSemanticGrid(): HTMLElement {
  const headings = Array.from(
    container.querySelectorAll('[role="heading"][aria-level="3"]'),
  );
  const semanticHeading = headings.find((h) =>
    (h.textContent ?? '').includes('Semantic Tokens'),
  );
  expect(semanticHeading).not.toBeUndefined();
  const section = semanticHeading!.parentElement as HTMLElement;
  const grid = section.querySelector('.tokenpanel-color-base-grid') as HTMLElement | null;
  expect(grid).not.toBeNull();
  return grid!;
}

/** Open the first literal-semantic swatch (a `ColorField`) in the semantic grid. */
function openFirstSemanticLiteralSwatch(): void {
  const swatch = getSemanticGrid().querySelector(
    '.tokenpanel-color-field-swatch',
  ) as HTMLElement;
  expect(swatch).not.toBeNull();
  act(() => {
    swatch.click();
  });
}

/** Fire an arrow key on the first slider in the open picker dialog. */
function fireFirstPickerSliderArrow(key = 'ArrowUp'): void {
  const slider = container.querySelector('[role="dialog"] [role="slider"]') as HTMLElement;
  if (!slider) throw new Error('no slider found in open picker dialog');
  act(() => {
    slider.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true }));
  });
}

function makeLoneSemanticState(): ColorTweakState {
  const cluster = getActivePrimaryCluster();
  return initColorFromScheme(cluster);
}

// ---------------------------------------------------------------------------
// 1. configurePanel accepts the lone semantic:true tier
// ---------------------------------------------------------------------------

describe('1. configurePanel accepts a lone semantic:true OKLCH tier', () => {
  it('does NOT throw (F4 no longer fires on named, non-contiguous cssVars)', () => {
    __resetPanelConfigForTests();
    expect(() => configurePanel(LONE_SEMANTIC_PANEL_CONFIG)).not.toThrow();
  });

  it('resolveColorClusterFromTab derives a { literal } SemanticValue per item, paletteSize 0', () => {
    const cluster = resolveColorClusterFromTab(LONE_SEMANTIC_TAB)!;
    expect(cluster).toBeDefined();
    expect(cluster.paletteSize).toBe(0);
    for (const id of SEMANTIC_IDS) {
      expect(cluster.semanticDefaults[id]).toEqual({ literal: SEMANTIC_LITERALS[id] });
      expect(cluster.semanticCssNames[id]).toBe(SEMANTIC_CSS_VARS[id]);
    }
  });
});

// ---------------------------------------------------------------------------
// 2. Rendering — literal ColorField swatches, not grayscale PaletteSelectors
// ---------------------------------------------------------------------------

describe('2. rendering shows editable literal swatches, not palette-index dropdowns', () => {
  it('Semantic Tokens grid renders N SemanticLiteralRow swatches (data-testid marker)', () => {
    renderColorTab(LONE_SEMANTIC_TAB, makeLoneSemanticState());
    const semanticGrid = getSemanticGrid();

    for (const id of SEMANTIC_IDS) {
      expect(
        semanticGrid.querySelector(`[data-testid="tokenpanel-semantic-literal-${id}"]`),
      ).not.toBeNull();
    }
    expect(
      semanticGrid.querySelectorAll('[data-testid^="tokenpanel-semantic-literal-"]').length,
    ).toBe(SEMANTIC_IDS.length);
  });

  it('Semantic Tokens grid renders ZERO PaletteSelector (index-dropdown) rows', () => {
    renderColorTab(LONE_SEMANTIC_TAB, makeLoneSemanticState());
    const semanticGrid = getSemanticGrid();
    expect(semanticGrid.querySelectorAll('.tokenpanel-palette-selector').length).toBe(0);
  });

  it('the "Semantic Tokens" section heading is present and the section is non-empty', () => {
    renderColorTab(LONE_SEMANTIC_TAB, makeLoneSemanticState());
    const headings = Array.from(
      container.querySelectorAll('[role="heading"][aria-level="3"]'),
    );
    const semanticHeading = headings.find((h) => (h.textContent ?? '').includes('Semantic Tokens'));
    expect(semanticHeading).not.toBeUndefined();

    const semanticGrid = getSemanticGrid();
    expect(semanticGrid.children.length).toBeGreaterThan(0);
  });

  it('each literal swatch shows its seeded oklch() default as the swatch background', () => {
    renderColorTab(LONE_SEMANTIC_TAB, makeLoneSemanticState());
    const semanticGrid = getSemanticGrid();
    for (const id of SEMANTIC_IDS) {
      const row = semanticGrid.querySelector(`[data-testid="tokenpanel-semantic-literal-${id}"]`)!;
      const swatch = row.querySelector('.tokenpanel-color-field-swatch') as HTMLElement;
      expect(swatch).not.toBeNull();
      // jsdom keeps the inline style value as authored (no color-space resolution).
      expect(swatch.style.backgroundColor).toBe(SEMANTIC_LITERALS[id]);
    }
  });

  it('the raw Palette section does not surface any of the named semantic cssVars as swatches', () => {
    // The Palette section (Section A) maps over `state.palette` directly; it
    // must not expose the semantic tokens as if they were palette slots.
    renderColorTab(LONE_SEMANTIC_TAB, makeLoneSemanticState());
    const paletteGrid = container.querySelector('.tokenpanel-color-palette-grid') as HTMLElement | null;
    // A lone-semantic-tier cluster has paletteSize 0, so Section A (Palette)
    // is gated off entirely (#466 follow-up) — there is no grid, not merely
    // an empty one.
    expect(paletteGrid).toBeNull();
  });

  it('#466 follow-up: paletteSize 0 seeds an EMPTY palette, not a phantom 1-slot grayscale', () => {
    const state = makeLoneSemanticState();
    expect(state.palette).toEqual([]);
    expect(state.palette.length).toBe(0);
  });

  it('#466 follow-up: no phantom --zudo-stub-p0 swatch renders anywhere in the panel', () => {
    renderColorTab(LONE_SEMANTIC_TAB, makeLoneSemanticState());
    // Neither Section A (Palette) nor Section B (Base) renders for a
    // palette-less cluster, so no swatch/label carries the stub template's
    // cssVar or references a stub palette slot.
    const allLabels = Array.from(
      container.querySelectorAll('.tokenpanel-color-swatch-label'),
    ).map((el) => el.textContent);
    expect(allLabels.some((l) => (l ?? '').includes('--zudo-stub-p'))).toBe(false);
    expect(container.querySelectorAll('.tokenpanel-color-palette-grid').length).toBe(0);
    expect(container.querySelectorAll('.tokenpanel-color-base-grid').length).toBe(1); // Semantic Tokens grid only — no Base grid.
  });

  it('#466 follow-up: neither emitter (disk / DOM) writes a --zudo-stub-p* key', () => {
    const colorState = makeLoneSemanticState();
    const cluster = getActivePrimaryCluster();
    const fullState: TweakState = {
      color: colorState,
      spacing: {},
      typography: {},
      size: {},
    };

    const diskMap = buildApplyOverrides(fullState, undefined, cluster, getPanelConfig().tabs);
    expect(Object.keys(diskMap).some((k) => k.startsWith('--zudo-stub-p'))).toBe(false);

    applyColorState(colorState, cluster);
    const inlineStyle = document.documentElement.getAttribute('style') ?? '';
    expect(inlineStyle).not.toMatch(/--zudo-stub-p\d/);
  });
});

// ---------------------------------------------------------------------------
// 3. Editing a semantic swatch — state update + serde/persist round-trip
// ---------------------------------------------------------------------------

describe('3. editing a semantic swatch updates state to { literal } and survives round-trips', () => {
  it('editing the first semantic swatch calls persistColor with a { literal: <newValue> } updater', () => {
    const persistColor = vi.fn();
    const baseState = makeLoneSemanticState();
    renderColorTab(LONE_SEMANTIC_TAB, baseState, { persistColor });

    openFirstSemanticLiteralSwatch();
    fireFirstPickerSliderArrow();

    expect(persistColor).toHaveBeenCalled();
    const updater = persistColor.mock.calls.at(-1)![0] as (
      prev: ColorTweakState,
    ) => ColorTweakState;
    const result = updater(baseState);

    const edited = result.semanticMappings['danger'];
    expect(edited).toBeTypeOf('object');
    expect((edited as { literal: string }).literal).toMatch(/^oklch\(/i);
    // The edit must actually change the value (arrow key nudges Lightness).
    expect((edited as { literal: string }).literal).not.toBe(SEMANTIC_LITERALS.danger);
  });

  it('the edited { literal } value survives a serialize -> deserialize round-trip', () => {
    const persistColor = vi.fn();
    const baseState = makeLoneSemanticState();
    renderColorTab(LONE_SEMANTIC_TAB, baseState, { persistColor });

    openFirstSemanticLiteralSwatch();
    fireFirstPickerSliderArrow();

    const updater = persistColor.mock.calls.at(-1)![0] as (
      prev: ColorTweakState,
    ) => ColorTweakState;
    const editedColorState = updater(baseState);
    const editedLiteral = (editedColorState.semanticMappings['danger'] as { literal: string })
      .literal;

    const fullState: TweakState = {
      color: editedColorState,
      spacing: {},
      typography: {},
      size: {},
    };
    const cfg = getPanelConfig();

    const json = serialize(fullState, { colorDefaults: baseState }, cfg);
    // A { literal } mapping can't be expressed in v2's number-only leaf, so
    // serialize() must upgrade to SCHEMA_V3.
    expect(json.$schema).toBe(SCHEMA_V3);

    const semanticOut = json.tabs?.['color']?.['semantic'] as Record<string, unknown> | undefined;
    expect(semanticOut).toBeDefined();
    expect(semanticOut!['--zd-danger']).toEqual({ literal: editedLiteral });

    const result = deserialize(json, { colorDefaults: baseState }, cfg);
    expect(result.warnings).toHaveLength(0);
    expect(result.unknownTokens).toHaveLength(0);
    expect(result.state.color.semanticMappings['danger']).toEqual({ literal: editedLiteral });
    // Untouched semantic entries fall back to the baseline unchanged.
    expect(result.state.color.semanticMappings['warning']).toEqual({
      literal: SEMANTIC_LITERALS.warning,
    });
  });

  it('the edited { literal } value survives a localStorage persist -> hydrate round-trip', () => {
    const persistColor = vi.fn();
    const baseState = makeLoneSemanticState();
    renderColorTab(LONE_SEMANTIC_TAB, baseState, { persistColor });

    openFirstSemanticLiteralSwatch();
    fireFirstPickerSliderArrow();

    const updater = persistColor.mock.calls.at(-1)![0] as (
      prev: ColorTweakState,
    ) => ColorTweakState;
    const editedColorState = updater(baseState);
    const editedLiteral = (editedColorState.semanticMappings['danger'] as { literal: string })
      .literal;

    const storage = makeStorage();
    const fullState: TweakState = {
      color: editedColorState,
      spacing: {},
      typography: {},
      size: {},
    };
    savePersistedState(fullState, storage);

    const cluster = getActivePrimaryCluster();
    const loaded = loadPersistedState(storage, baseState, cluster);

    expect(loaded).not.toBeNull();
    expect(loaded!.color.semanticMappings['danger']).toEqual({ literal: editedLiteral });
  });

  it('a pre-stored v3 envelope with a { literal } semantic mapping loads unchanged', () => {
    const storageKey = getStorageKeyV3();
    const baseState = makeLoneSemanticState();
    const editedColorState: ColorTweakState = {
      ...baseState,
      semanticMappings: {
        ...baseState.semanticMappings,
        danger: { literal: 'oklch(0.40 0.18 20)' },
      },
    };
    const v3Payload = {
      color: editedColorState,
      spacing: {},
      typography: {},
      size: {},
    };
    const storage = makeStorage({ [storageKey]: JSON.stringify(v3Payload) });

    const cluster = getActivePrimaryCluster();
    const loaded = loadPersistedState(storage, baseState, cluster);

    expect(loaded).not.toBeNull();
    expect(loaded!.color.semanticMappings['danger']).toEqual({ literal: 'oklch(0.40 0.18 20)' });
    // Untouched entries still hydrate from the manifest defaults merge.
    expect(loaded!.color.semanticMappings['info']).toEqual({ literal: SEMANTIC_LITERALS.info });
  });

  it('#497/#503: a pre-stored v3 envelope carrying a STALE legacy numeric semantic mapping falls back to the manifest default instead of surviving as a raw index', () => {
    // This cluster (LONE_SEMANTIC_TAB) has no palette tier at all —
    // paletteSize 0. A `danger: 2` entry can only be a leftover from before
    // this tab went ramp-native; index 2 has never resolved to anything
    // here. It must not survive hydration.
    const storageKey = getStorageKeyV3();
    const baseState = makeLoneSemanticState();
    const staleColorState = {
      ...baseState,
      semanticMappings: {
        ...baseState.semanticMappings,
        danger: 2,
      },
    };
    const v3Payload = {
      color: staleColorState,
      spacing: {},
      typography: {},
      size: {},
    };
    const storage = makeStorage({ [storageKey]: JSON.stringify(v3Payload) });

    const cluster = getActivePrimaryCluster();
    expect(cluster.paletteSize).toBe(0);
    const loaded = loadPersistedState(storage, baseState, cluster);

    expect(loaded).not.toBeNull();
    // Falls back to the manifest default `{ literal }` — never the stale
    // index 2, and never a black swatch from indexing a nonexistent palette.
    expect(loaded!.color.semanticMappings['danger']).toEqual({
      literal: SEMANTIC_LITERALS.danger,
    });
  });
});

// ---------------------------------------------------------------------------
// 4. Apply — literal verbatim on BOTH the disk emitter and the DOM emitter
// ---------------------------------------------------------------------------

describe('4. apply writes each --zd-* verbatim on disk (buildApplyOverrides) and DOM (applyColorState)', () => {
  it('buildApplyOverrides emits the literal oklch() string verbatim for every semantic cssVar', () => {
    const colorState = makeLoneSemanticState();
    const fullState: TweakState = {
      color: colorState,
      spacing: {},
      typography: {},
      size: {},
    };
    const cluster = getActivePrimaryCluster();

    // colorDefaults: undefined forces the whole color block into the diff
    // (per buildApplyOverrides' documented contract), so every semantic
    // entry is emitted regardless of baseline comparison.
    const out = buildApplyOverrides(fullState, undefined, cluster, getPanelConfig().tabs);

    for (const id of SEMANTIC_IDS) {
      expect(out[SEMANTIC_CSS_VARS[id]]).toBe(SEMANTIC_LITERALS[id]);
    }
  });

  it('applyColorState writes the literal oklch() string verbatim to document.documentElement', () => {
    const colorState = makeLoneSemanticState();
    const cluster = getActivePrimaryCluster();

    applyColorState(colorState, cluster);

    for (const id of SEMANTIC_IDS) {
      const written = document.documentElement.style.getPropertyValue(SEMANTIC_CSS_VARS[id]);
      expect(written).toBe(SEMANTIC_LITERALS[id]);
    }
  });

  it('emitter parity: the disk map and the DOM inline style agree byte-for-byte for every semantic cssVar', () => {
    const colorState = makeLoneSemanticState();
    const cluster = getActivePrimaryCluster();
    const fullState: TweakState = {
      color: colorState,
      spacing: {},
      typography: {},
      size: {},
    };

    const diskMap = buildApplyOverrides(fullState, undefined, cluster, getPanelConfig().tabs);
    applyColorState(colorState, cluster);

    for (const id of SEMANTIC_IDS) {
      const cssVar = SEMANTIC_CSS_VARS[id];
      const domValue = document.documentElement.style.getPropertyValue(cssVar);
      expect(diskMap[cssVar]).toBe(domValue);
      expect(diskMap[cssVar]).toBe(SEMANTIC_LITERALS[id]);
    }
  });

  it('emitter parity holds for an EDITED literal value too (not just the seeded default)', () => {
    const baseState = makeLoneSemanticState();
    const editedColorState: ColorTweakState = {
      ...baseState,
      semanticMappings: {
        ...baseState.semanticMappings,
        danger: { literal: 'oklch(0.33 0.19 15)' },
      },
    };
    const cluster = getActivePrimaryCluster();
    const fullState: TweakState = {
      color: editedColorState,
      spacing: {},
      typography: {},
      size: {},
    };

    const diskMap = buildApplyOverrides(fullState, baseState, cluster, getPanelConfig().tabs);
    applyColorState(editedColorState, cluster);

    const domValue = document.documentElement.style.getPropertyValue('--zd-danger');
    expect(domValue).toBe('oklch(0.33 0.19 15)');
    expect(diskMap['--zd-danger']).toBe('oklch(0.33 0.19 15)');
    expect(diskMap['--zd-danger']).toBe(domValue);
  });
});

// ---------------------------------------------------------------------------
// 5. Scheme dropdown — no dead functional control for a scheme-less cluster
// ---------------------------------------------------------------------------

describe('5. Scheme… dropdown has no functional options for a scheme-less lone-tier cluster', () => {
  it('the preset <select> carries no enabled options beyond the disabled placeholder', () => {
    renderColorTab(LONE_SEMANTIC_TAB, makeLoneSemanticState());

    const select = container.querySelector('.tokenpanel-color-preset-select');
    // Either the control is absent entirely, or -- if present -- it must not
    // offer any functional (enabled, selectable) option: only the disabled
    // "Scheme..." placeholder may exist.
    if (select === null) {
      expect(select).toBeNull();
      return;
    }
    const options = Array.from(select.querySelectorAll('option'));
    const enabledOptions = options.filter((o) => !(o as HTMLOptionElement).disabled);
    expect(enabledOptions).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// 6. Regression — conventional palette+semantic 2-tier color tab unaffected
// ---------------------------------------------------------------------------

describe('6. regression: a conventional palette+semantic 2-tier color tab is unaffected', () => {
  it('still renders palette swatches AND index-based PaletteSelector semantic rows', () => {
    __resetPanelConfigForTests();
    configurePanel(FIXTURE_PANEL_CONFIG);

    const colorTab = FIXTURE_TABS.find((t) => t.id === 'color')!;
    const cluster = getActivePrimaryCluster();
    const state = initColorFromScheme(cluster);

    renderColorTab(colorTab, state);

    const paletteGrid = container.querySelector('.tokenpanel-color-palette-grid') as HTMLElement;
    expect(paletteGrid).not.toBeNull();
    // FIXTURE_CLUSTER declares a 16-slot palette.
    expect(paletteGrid.querySelectorAll('.tokenpanel-color-swatch-button').length).toBe(16);

    const semanticGrid = getSemanticGrid();
    // FIXTURE_CLUSTER declares 3 semantic entries (accent / muted / active),
    // all legacy palette-index mappings -> all render as PaletteSelector.
    expect(semanticGrid.querySelectorAll('.tokenpanel-palette-selector').length).toBe(3);
    expect(semanticGrid.querySelectorAll('[data-testid^="tokenpanel-semantic-literal-"]').length).toBe(
      0,
    );
  });
});

// ---------------------------------------------------------------------------
// 7. #488 — a host colorPresets entry is a no-op against a palette-less cluster
// ---------------------------------------------------------------------------

/**
 * A full 16-slot preset — the shape a host's `configurePanel({ colorPresets })`
 * entry ships, and the exact shape that historically resurrected a phantom
 * palette + collapsed literal/ref semantic rows to index 0 when loaded
 * against a lone `semantic: true` tier cluster (#488).
 */
const HOST_PRESET: ColorScheme = {
  background: 9,
  foreground: 11,
  cursor: 6,
  selectionBg: 11,
  selectionFg: 10,
  palette: [
    '#303030',
    '#dd3131',
    '#266538',
    '#a83838',
    '#3277c8',
    '#a35e0f',
    '#90a1b9',
    '#7a5218',
    '#6b6b6b',
    '#e2ddda',
    '#ece9e9',
    '#303030',
    '#5b99dc',
    '#b89ee7',
    '#8590a0',
    '#b91c1c',
  ],
  shikiTheme: 'catppuccin-latte',
  // Keys match SEMANTIC_IDS 1:1 — this is exactly the scenario that used to
  // flatten `{ literal }` rows to these plain palette indices.
  semantic: { danger: 1, warning: 3, info: 4 },
};

const LONE_SEMANTIC_PANEL_CONFIG_WITH_PRESETS: PanelConfig = {
  ...LONE_SEMANTIC_PANEL_CONFIG,
  colorPresets: { 'Host Preset': HOST_PRESET },
};

describe('7. #488 — a host colorPresets entry is a no-op against a palette-less cluster', () => {
  beforeEach(() => {
    __resetPanelConfigForTests();
    configurePanel(LONE_SEMANTIC_PANEL_CONFIG_WITH_PRESETS);
  });

  it('the Scheme… dropdown is absent entirely, even though colorPresets is non-empty', () => {
    renderColorTab(LONE_SEMANTIC_TAB, makeLoneSemanticState());
    expect(container.querySelector('.tokenpanel-color-preset-select')).toBeNull();
  });

  it('loading the preset directly does not resurrect a palette or collapse literal rows', () => {
    const cluster = getActivePrimaryCluster();
    const seeded = initColorFromSchemeData(HOST_PRESET, cluster);

    expect(seeded.palette).toEqual([]);
    expect(seeded.semanticMappings).toEqual(cluster.semanticDefaults);
    for (const id of SEMANTIC_IDS) {
      expect(seeded.semanticMappings[id]).toEqual({ literal: SEMANTIC_LITERALS[id] });
    }
  });

  it('neither emitter writes a --zudo-stub-p* key after a preset "load"', () => {
    const cluster = getActivePrimaryCluster();
    const colorState = initColorFromSchemeData(HOST_PRESET, cluster);
    const fullState: TweakState = {
      color: colorState,
      spacing: {},
      typography: {},
      size: {},
    };

    const diskMap = buildApplyOverrides(fullState, undefined, cluster, getPanelConfig().tabs);
    expect(Object.keys(diskMap).some((k) => k.startsWith('--zudo-stub-p'))).toBe(false);

    applyColorState(colorState, cluster);
    const inlineStyle = document.documentElement.getAttribute('style') ?? '';
    expect(inlineStyle).not.toMatch(/--zudo-stub-p\d/);
  });

  it('rendering after the "load" still shows zero palette swatches (Section A stays gated off)', () => {
    const cluster = getActivePrimaryCluster();
    const seeded = initColorFromSchemeData(HOST_PRESET, cluster);
    renderColorTab(LONE_SEMANTIC_TAB, seeded);
    expect(container.querySelector('.tokenpanel-color-palette-grid')).toBeNull();
  });
});
