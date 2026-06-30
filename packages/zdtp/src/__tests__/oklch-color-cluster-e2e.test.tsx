// @vitest-environment jsdom

/**
 * OKLCH ColorTab cluster — end-to-end integration test (issue #437 Wave-2 confirm).
 *
 * Validates the full path on a CLUSTER-BASED color tab (`colorExtras` present)
 * whose palette tier items are `format:'oklch'`, seeded from a scheme whose
 * palette is `oklch(...)` including at least one WIDE-GAMUT / out-of-sRGB value.
 *
 * Assertions:
 *  1. Seed → state.palette holds raw oklch() (not hex, not #000000)
 *  2. jsdom #000000 guard: wide-gamut value does not collapse to black on seed
 *  3. Apply path: CSS custom property receives oklch() value (not hex)
 *  4. localStorage persist/hydrate round-trip preserves oklch() byte-for-byte
 *  5. SerDe JSON round-trip (serialize → deserialize) preserves oklch()
 *  6. UI: editing swatch via OKLCH editor emits oklch() through persistColor
 *  7. HSL-edit caveat: toggling to HSL mode does NOT commit/clamp (OKLCH preserved);
 *     actual HSL-slider edit emits oklch() but may sRGB-reanchor (intentional
 *     lossy edit path — NOT an R4 violation, see issue #437 §Note)
 *  8. Cluster-feature regression: scheme-preset swap, base-role mappings,
 *     semantic→palette mappings resolve to OKLCH values, secondary cluster
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render } from 'preact';
import { act } from 'preact/test-utils';
import ColorTab from '../tabs/color-tab';
import {
  initColorFromSchemeData,
  applyColorState,
  loadPersistedState,
  savePersistedState,
  getStorageKeyV3,
  getActivePrimaryCluster,
  type ColorTweakState,
  type TweakState,
  type StorageLike,
} from '../state/tweak-state';
import { resolveColorClusterFromTab } from '../config/cluster-config';
import { serialize, deserialize } from '../utils/design-token-serde';
import {
  configurePanel,
  __resetPanelConfigForTests,
  getPanelConfig,
  type PanelConfig,
} from '../config/panel-config';
import {
  HighlightContext,
  type HighlightContextValue,
} from '../highlight/highlight-toggle-button';
import { DEFAULT_HIGHLIGHT_SLOTS, type HighlightState } from '../highlight/highlight-state';
import { TooltipProvider } from '../controls/tooltip';
import type { TabConfig } from '../tokens/tier-model';
import type { ColorScheme } from '../config/color-schemes';
import type { PersistColor, PersistSecondary } from '../state/persist';

// ---------------------------------------------------------------------------
// PALETTE CONSTANTS
// ---------------------------------------------------------------------------

/**
 * 4-slot OKLCH palette. Index 2 is WIDE-GAMUT (chroma 0.25 is out of sRGB at
 * L≈0.7, H=150 — real P3 colour). The jsdom `#000000` guard specifically
 * targets this slot: if seed eagerly clips via canvas, it collapses to black.
 */
const PALETTE_SIZE = 4;
const WIDE_GAMUT_INDEX = 2; // --oklch-p2

const OKLCH_PALETTE_STRINGS: readonly string[] = [
  'oklch(0.21 0.03 264)', // 0 — dark blue
  'oklch(0.50 0.12 150)', // 1 — mid green
  'oklch(0.70 0.25 150)', // 2 — WIDE-GAMUT (P3 chroma, out of sRGB)
  'oklch(0.90 0.02 100)', // 3 — near-white
] as const;

// ---------------------------------------------------------------------------
// COLOR SCHEMES
// ---------------------------------------------------------------------------

/**
 * Primary scheme: palette is all-oklch() including the wide-gamut slot.
 * Cast to `unknown` first because `ColorScheme['palette']` is a 16-element
 * tuple type and our test uses a 4-slot cluster whose scheme intentionally
 * has 4 entries (matching the tab's paletteSize=4).
 */
const DEFAULT_OKLCH_SCHEME: ColorScheme = {
  background: 0,
  foreground: 3,
  cursor: 1,
  selectionBg: 0,
  selectionFg: 3,
  // paletteSize=4; cast via unknown to satisfy the 16-tuple type constraint
  palette: OKLCH_PALETTE_STRINGS as unknown as ColorScheme['palette'],
  semantic: { accent: 2, muted: 0 },
};

/** Alternate scheme: used for scheme-swap regression test. */
const ALT_OKLCH_SCHEME: ColorScheme = {
  background: 3,
  foreground: 0,
  cursor: 2,
  selectionBg: 3,
  selectionFg: 0,
  palette: [
    'oklch(0.10 0.01 200)',
    'oklch(0.30 0.15 45)',
    'oklch(0.60 0.20 300)',
    'oklch(0.95 0.01 80)',
  ] as unknown as ColorScheme['palette'],
  semantic: { accent: 1, muted: 3 },
};

// ---------------------------------------------------------------------------
// TAB CONFIGS
// ---------------------------------------------------------------------------

/** Primary OKLCH color tab. All palette items declare format:'oklch'. */
const PRIMARY_COLOR_TAB: TabConfig = {
  id: 'color',
  label: 'Color',
  colorExtras: {
    id: 'oklch-cluster',
    label: 'OKLCH Cluster',
    baseRoles: {
      background: '--oklch-cluster-bg',
      foreground: '--oklch-cluster-fg',
    },
    baseDefaults: {
      background: 0,
      foreground: 3,
      cursor: 1,
      selectionBg: 0,
      selectionFg: 3,
    },
    defaultShikiTheme: 'dracula',
    colorSchemes: {
      'Default OKLCH': DEFAULT_OKLCH_SCHEME,
      'Alt OKLCH': ALT_OKLCH_SCHEME,
    },
    panelSettings: { colorScheme: 'Default OKLCH', colorMode: false },
  },
  tiers: [
    {
      id: 'palette',
      label: 'Palette',
      items: Array.from({ length: PALETTE_SIZE }, (_, i) => ({
        id: `oklch-p${i}`,
        cssVar: `--oklch-p${i}`,
        label: `Palette ${i}`,
        default: OKLCH_PALETTE_STRINGS[i],
        type: { kind: 'color' as const, format: 'oklch' as const },
      })),
    },
    {
      id: 'semantic',
      label: 'Semantic',
      referencesTier: 'palette',
      items: [
        {
          id: 'accent',
          cssVar: '--oklch-semantic-accent',
          label: 'Accent',
          default: 'oklch-p2', // → wide-gamut slot, index 2
          type: { kind: 'color' as const },
        },
        {
          id: 'muted',
          cssVar: '--oklch-semantic-muted',
          label: 'Muted',
          default: 'oklch-p0', // → index 0
          type: { kind: 'color' as const },
        },
      ],
    },
  ],
};

/**
 * Secondary OKLCH color tab. Exercises the secondary cluster regression:
 * both palette slots have format:'oklch', including one wide-gamut entry.
 */
const SECONDARY_COLOR_TAB: TabConfig = {
  id: 'color-secondary',
  label: 'Secondary Color',
  colorExtras: {
    id: 'oklch-secondary',
    label: 'OKLCH Secondary',
    baseRoles: {},
    baseDefaults: {
      background: 0,
      foreground: 1,
    },
    defaultShikiTheme: 'dracula',
    colorSchemes: {},
    panelSettings: { colorScheme: '', colorMode: false },
  },
  tiers: [
    {
      id: 'palette',
      label: 'Palette',
      items: [
        {
          id: 'sec-p0',
          cssVar: '--sec-p0',
          label: 'sec-p0',
          default: 'oklch(0.20 0.05 270)',
          type: { kind: 'color' as const, format: 'oklch' as const },
        },
        {
          id: 'sec-p1',
          cssVar: '--sec-p1',
          label: 'sec-p1',
          default: 'oklch(0.80 0.30 150)', // wide-gamut
          type: { kind: 'color' as const, format: 'oklch' as const },
        },
      ],
    },
    {
      id: 'semantic',
      label: 'Semantic',
      referencesTier: 'palette',
      items: [
        {
          id: 'highlight',
          cssVar: '--sec-semantic-highlight',
          label: 'Highlight',
          default: 'sec-p1', // → index 1 (wide-gamut)
          type: { kind: 'color' as const },
        },
      ],
    },
  ],
};

/** Panel config with OKLCH primary + secondary color tabs. */
const OKLCH_PANEL_CONFIG: PanelConfig = {
  storagePrefix: 'oklch-e2e-test',
  consoleNamespace: 'oklch-test',
  modalClassPrefix: 'oklch-test-modal',
  schemaId: 'zudo-design-tokens/v2',
  exportFilenameBase: 'oklch-test-tokens',
  tabs: [PRIMARY_COLOR_TAB, SECONDARY_COLOR_TAB],
  colorPresets: {},
};

// ---------------------------------------------------------------------------
// HELPERS
// ---------------------------------------------------------------------------

/** In-memory localStorage substitute for round-trip tests. */
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

function makeOklchColorState(): ColorTweakState {
  return {
    palette: [...OKLCH_PALETTE_STRINGS],
    background: 0,
    foreground: 3,
    cursor: 1,
    selectionBg: 0,
    selectionFg: 3,
    semanticMappings: { accent: 2, muted: 0 },
    shikiTheme: 'dracula',
  };
}

function makeSecondaryOklchState(): ColorTweakState {
  return {
    palette: ['oklch(0.20 0.05 270)', 'oklch(0.80 0.30 150)'],
    background: 0,
    foreground: 1,
    cursor: 0,
    selectionBg: 0,
    selectionFg: 1,
    semanticMappings: { highlight: 1 },
    shikiTheme: 'dracula',
  };
}

function makeHighlightState(): HighlightState {
  return {
    slots: DEFAULT_HIGHLIGHT_SLOTS.map((s) => ({ ...s })),
    outlineWidth: 2,
    active: {},
  };
}

function makeCtx(
  state: HighlightState,
  toggle: (cssVar: string) => void,
): HighlightContextValue {
  return { state, toggle };
}

let container: HTMLDivElement;

beforeEach(() => {
  __resetPanelConfigForTests();
  configurePanel(OKLCH_PANEL_CONFIG);
  container = document.createElement('div');
  document.body.appendChild(container);
  document.documentElement.removeAttribute('style');
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
  opts: {
    colorState?: ColorTweakState;
    secondaryTab?: TabConfig | null;
    secondaryState?: ColorTweakState | null;
    persistColor?: PersistColor;
    persistSecondary?: PersistSecondary;
  } = {},
): void {
  const {
    colorState = makeOklchColorState(),
    secondaryTab = null,
    secondaryState = null,
    persistColor = vi.fn(),
    persistSecondary = vi.fn(),
  } = opts;
  const ctx = makeCtx(makeHighlightState(), vi.fn());
  act(() => {
    render(
      <TooltipProvider>
        <HighlightContext.Provider value={ctx}>
          <ColorTab
            tab={PRIMARY_COLOR_TAB}
            state={colorState}
            persistColor={persistColor}
            secondaryTab={secondaryTab}
            secondaryState={secondaryState}
            persistSecondary={persistSecondary}
          />
        </HighlightContext.Provider>
      </TooltipProvider>,
      container,
    );
  });
}

/** Open the first palette swatch picker. */
function openFirstPaletteSwatch(section?: HTMLElement): void {
  const root = section ?? container;
  const grid = root.querySelector('.tokenpanel-color-palette-grid,.tokenpanel-color-palette-grid--secondary') as HTMLElement;
  const btn = grid.querySelector('.tokenpanel-color-swatch-button') as HTMLElement;
  expect(btn).not.toBeNull();
  act(() => {
    btn.click();
  });
}

/** Open the first swatch in the secondary cluster palette section. */
function openFirstSecondarySwatch(): void {
  const secSection = container.querySelector(
    '[data-testid="tokenpanel-secondary-palette-section"]',
  ) as HTMLElement;
  const btn = secSection.querySelector('.tokenpanel-color-swatch-button') as HTMLElement;
  expect(btn).not.toBeNull();
  act(() => {
    btn.click();
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

// ---------------------------------------------------------------------------
// 1. SEED PATH — state.palette holds raw oklch() (no eager hex clip)
// ---------------------------------------------------------------------------

describe('seed → state.palette holds raw oklch() (no eager hex clip)', () => {
  it('stores all oklch palette entries VERBATIM (not hex, not #000000)', () => {
    const cluster = getActivePrimaryCluster();
    const state = initColorFromSchemeData(DEFAULT_OKLCH_SCHEME, cluster);

    expect(state.palette).toEqual([...OKLCH_PALETTE_STRINGS]);
    for (const entry of state.palette) {
      expect(entry.startsWith('#')).toBe(false);
      expect(entry).not.toBe('#000000');
    }
  });

  it('jsdom #000000 guard: wide-gamut value at index 2 does NOT collapse to #000000', () => {
    // jsdom canvas can't parse oklch() — the old map(cssColorToHex) would have
    // turned palette[2] = 'oklch(0.70 0.25 150)' into '#000000'. The raw value
    // must survive verbatim.
    const cluster = getActivePrimaryCluster();
    const state = initColorFromSchemeData(DEFAULT_OKLCH_SCHEME, cluster);

    expect(state.palette[WIDE_GAMUT_INDEX]).toBe(OKLCH_PALETTE_STRINGS[WIDE_GAMUT_INDEX]);
    expect(state.palette.includes('#000000')).toBe(false);
    // Extra: chroma 0.25 is way out of sRGB gamut at L=0.7, so this specifically
    // confirms R4 — "clamp to sRGB only at the hex-conversion boundary, never eagerly".
    expect(state.palette[WIDE_GAMUT_INDEX]).toContain('0.25');
  });

  it('palette is a fresh array (not aliased to scheme.palette)', () => {
    const cluster = getActivePrimaryCluster();
    const state = initColorFromSchemeData(DEFAULT_OKLCH_SCHEME, cluster);
    expect(state.palette).not.toBe(DEFAULT_OKLCH_SCHEME.palette);
    expect(state.palette).toEqual([...OKLCH_PALETTE_STRINGS]);
  });

  it('semantic mappings resolve to correct palette indices from the oklch scheme', () => {
    const cluster = getActivePrimaryCluster();
    const state = initColorFromSchemeData(DEFAULT_OKLCH_SCHEME, cluster);
    // accent: 2 from scheme.semantic, muted: 0
    expect(state.semanticMappings['accent']).toBe(2);
    expect(state.semanticMappings['muted']).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// 2. APPLY PATH — CSS custom property gets oklch() value
// ---------------------------------------------------------------------------

describe('apply → CSS custom property receives oklch() value (not hex)', () => {
  it('applyColorState writes oklch() string to the primary palette CSS vars', () => {
    const cluster = resolveColorClusterFromTab(PRIMARY_COLOR_TAB)!;
    const state = makeOklchColorState();
    applyColorState(state, cluster);

    for (let i = 0; i < PALETTE_SIZE; i++) {
      const written = document.documentElement.style.getPropertyValue(`--oklch-p${i}`);
      expect(written).toMatch(/^oklch\(/i);
      expect(written).not.toBe('#000000');
      expect(written).toBe(OKLCH_PALETTE_STRINGS[i]);
    }
  });

  it('wide-gamut value at index 2 writes oklch() with chroma 0.25 preserved', () => {
    const cluster = resolveColorClusterFromTab(PRIMARY_COLOR_TAB)!;
    const state = makeOklchColorState();
    applyColorState(state, cluster);

    const wideGamut = document.documentElement.style.getPropertyValue(
      `--oklch-p${WIDE_GAMUT_INDEX}`,
    );
    expect(wideGamut).toBe(OKLCH_PALETTE_STRINGS[WIDE_GAMUT_INDEX]);
    expect(wideGamut).toContain('0.25'); // chroma must not be sRGB-clamped
  });

  it('base-role (background) CSS var gets the oklch() palette entry', () => {
    const cluster = resolveColorClusterFromTab(PRIMARY_COLOR_TAB)!;
    const state = makeOklchColorState(); // background: 0 → palette[0]
    applyColorState(state, cluster);

    const bg = document.documentElement.style.getPropertyValue('--oklch-cluster-bg');
    expect(bg).toBe(OKLCH_PALETTE_STRINGS[0]);
    expect(bg).toMatch(/^oklch\(/);
  });

  it('base-role (foreground) CSS var gets the oklch() palette entry', () => {
    const cluster = resolveColorClusterFromTab(PRIMARY_COLOR_TAB)!;
    const state = makeOklchColorState(); // foreground: 3 → palette[3]
    applyColorState(state, cluster);

    const fg = document.documentElement.style.getPropertyValue('--oklch-cluster-fg');
    expect(fg).toBe(OKLCH_PALETTE_STRINGS[3]);
    expect(fg).toMatch(/^oklch\(/);
  });

  it('semantic mapping accent=2 resolves to the wide-gamut OKLCH palette entry', () => {
    const cluster = resolveColorClusterFromTab(PRIMARY_COLOR_TAB)!;
    const state = makeOklchColorState(); // accent: 2 → palette[2] (wide-gamut)
    applyColorState(state, cluster);

    const accent = document.documentElement.style.getPropertyValue('--oklch-semantic-accent');
    expect(accent).toBe(OKLCH_PALETTE_STRINGS[WIDE_GAMUT_INDEX]);
    expect(accent).toMatch(/^oklch\(/);
    expect(accent).toContain('0.25'); // wide-gamut chroma preserved
  });

  it('semantic mapping muted=0 resolves to palette[0] oklch() entry', () => {
    const cluster = resolveColorClusterFromTab(PRIMARY_COLOR_TAB)!;
    const state = makeOklchColorState();
    applyColorState(state, cluster);

    const muted = document.documentElement.style.getPropertyValue('--oklch-semantic-muted');
    expect(muted).toBe(OKLCH_PALETTE_STRINGS[0]);
    expect(muted).toMatch(/^oklch\(/);
  });
});

// ---------------------------------------------------------------------------
// 3. LOCALSTORAGE PERSIST / HYDRATE ROUND-TRIP
// ---------------------------------------------------------------------------

describe('localStorage persist → hydrate preserves oklch() byte-for-byte', () => {
  it('save + reload via savePersistedState / loadPersistedState preserves oklch() palette', () => {
    const storage = makeStorage();
    const colorState = makeOklchColorState();
    const fullState: TweakState = {
      color: colorState,
      spacing: {},
      typography: {},
      size: {},
    };

    savePersistedState(fullState, storage);

    const cluster = getActivePrimaryCluster();
    const loaded = loadPersistedState(storage, colorState, cluster);

    expect(loaded).not.toBeNull();
    expect(loaded!.color.palette).toEqual([...OKLCH_PALETTE_STRINGS]);
    expect(loaded!.color.palette.includes('#000000')).toBe(false);
  });

  it('wide-gamut entry survives localStorage round-trip byte-for-byte', () => {
    const storage = makeStorage();
    const colorState = makeOklchColorState();
    const fullState: TweakState = {
      color: colorState,
      spacing: {},
      typography: {},
      size: {},
    };

    savePersistedState(fullState, storage);
    const cluster = getActivePrimaryCluster();
    const loaded = loadPersistedState(storage, colorState, cluster);

    expect(loaded!.color.palette[WIDE_GAMUT_INDEX]).toBe(
      OKLCH_PALETTE_STRINGS[WIDE_GAMUT_INDEX],
    );
    // Sanity: nothing got collapsed to black anywhere in the palette
    expect(loaded!.color.palette.every((c) => c !== '#000000')).toBe(true);
  });

  it('semantic mappings survive localStorage round-trip intact', () => {
    const storage = makeStorage();
    const colorState = makeOklchColorState(); // accent: 2, muted: 0
    const fullState: TweakState = {
      color: colorState,
      spacing: {},
      typography: {},
      size: {},
    };

    savePersistedState(fullState, storage);
    const cluster = getActivePrimaryCluster();
    const loaded = loadPersistedState(storage, colorState, cluster);

    expect(loaded!.color.semanticMappings['accent']).toBe(2);
    expect(loaded!.color.semanticMappings['muted']).toBe(0);
  });

  it('a pre-stored v3 envelope with oklch() palette loads unchanged', () => {
    const storageKey = getStorageKeyV3();
    const v3Payload = {
      color: makeOklchColorState(),
      spacing: {},
      typography: {},
      size: {},
    };
    const storage = makeStorage({ [storageKey]: JSON.stringify(v3Payload) });

    const cluster = getActivePrimaryCluster();
    const loaded = loadPersistedState(storage, makeOklchColorState(), cluster);

    expect(loaded).not.toBeNull();
    expect(loaded!.color.palette).toEqual([...OKLCH_PALETTE_STRINGS]);
    expect(loaded!.color.palette[WIDE_GAMUT_INDEX]).toBe(
      OKLCH_PALETTE_STRINGS[WIDE_GAMUT_INDEX],
    );
  });
});

// ---------------------------------------------------------------------------
// 4. SERDE JSON ROUND-TRIP
// ---------------------------------------------------------------------------

describe('SerDe JSON round-trip (serialize → deserialize) preserves oklch()', () => {
  it('serialize emits oklch() strings under tabs.color.palette', () => {
    const colorState = makeOklchColorState();
    const fullState: TweakState = {
      color: colorState,
      spacing: {},
      typography: {},
      size: {},
    };
    const cfg = getPanelConfig();

    const json = serialize(fullState, { includeDefaults: true, colorDefaults: colorState }, cfg);

    expect(json.tabs?.['color']?.['palette']).toBeDefined();
    const palette = json.tabs!['color']!['palette'] as Record<string, string>;

    // Every palette entry must be oklch(), not hex
    for (let i = 0; i < PALETTE_SIZE; i++) {
      const val = palette[`--oklch-p${i}`];
      expect(val).toMatch(/^oklch\(/i);
      expect(val).not.toMatch(/^#/);
    }
  });

  it('serialize emits the wide-gamut value byte-for-byte', () => {
    const colorState = makeOklchColorState();
    const fullState: TweakState = {
      color: colorState,
      spacing: {},
      typography: {},
      size: {},
    };
    const cfg = getPanelConfig();

    const json = serialize(fullState, { includeDefaults: true, colorDefaults: colorState }, cfg);
    const palette = json.tabs!['color']!['palette'] as Record<string, string>;

    expect(palette[`--oklch-p${WIDE_GAMUT_INDEX}`]).toBe(
      OKLCH_PALETTE_STRINGS[WIDE_GAMUT_INDEX],
    );
  });

  it('deserialize restores oklch() palette from v2 JSON', () => {
    const colorState = makeOklchColorState();
    const fullState: TweakState = {
      color: colorState,
      spacing: {},
      typography: {},
      size: {},
    };
    const cfg = getPanelConfig();

    const json = serialize(fullState, { includeDefaults: true, colorDefaults: colorState }, cfg);
    const result = deserialize(json, { colorDefaults: colorState }, cfg);

    expect(result.state.color.palette).toEqual([...OKLCH_PALETTE_STRINGS]);
    expect(result.warnings).toHaveLength(0);
    expect(result.unknownTokens).toHaveLength(0);
  });

  it('wide-gamut value survives the full serialize → deserialize cycle unchanged', () => {
    const colorState = makeOklchColorState();
    const fullState: TweakState = {
      color: colorState,
      spacing: {},
      typography: {},
      size: {},
    };
    const cfg = getPanelConfig();

    const json = serialize(fullState, { includeDefaults: true, colorDefaults: colorState }, cfg);
    const result = deserialize(json, { colorDefaults: colorState }, cfg);

    expect(result.state.color.palette[WIDE_GAMUT_INDEX]).toBe(
      OKLCH_PALETTE_STRINGS[WIDE_GAMUT_INDEX],
    );
    // No collapse to black anywhere
    expect(result.state.color.palette.includes('#000000')).toBe(false);
  });

  it('diff-only serialize still emits changed oklch() entries', () => {
    // Simulate a user-edited swatch: palette[0] changed to a new oklch() value
    const originalState = makeOklchColorState();
    const editedState: ColorTweakState = {
      ...originalState,
      palette: [
        'oklch(0.30 0.05 264)', // changed from 0.21 to 0.30
        ...originalState.palette.slice(1),
      ],
    };
    const fullState: TweakState = {
      color: editedState,
      spacing: {},
      typography: {},
      size: {},
    };
    const cfg = getPanelConfig();

    // Diff against the original (only slot 0 changed)
    const json = serialize(fullState, { colorDefaults: originalState }, cfg);

    const palette = json.tabs?.['color']?.['palette'] as Record<string, string> | undefined;
    expect(palette).toBeDefined();
    // Slot 0 should be emitted (it changed)
    expect(palette!['--oklch-p0']).toMatch(/^oklch\(/i);
    // Deserialize should restore the edited value
    const result = deserialize(json, { colorDefaults: originalState }, cfg);
    expect(result.state.color.palette[0]).toBe('oklch(0.30 0.05 264)');
    // The unchanged wide-gamut slot falls back to baseline (colorDefaults)
    expect(result.state.color.palette[WIDE_GAMUT_INDEX]).toBe(
      OKLCH_PALETTE_STRINGS[WIDE_GAMUT_INDEX],
    );
  });
});

// ---------------------------------------------------------------------------
// 5. UI — SWATCH EDIT PERSISTS oklch()
// ---------------------------------------------------------------------------

describe('ColorTab swatch edit → persistColor emits oklch()', () => {
  beforeEach(() => {
    // Pin the picker to OKLCH mode so the L/C/H sliders render deterministically.
    localStorage.setItem('tokenpanel.colorPicker.mode', 'oklch');
  });

  it('clicking an oklch palette swatch opens the OKLCH color picker', () => {
    renderColorTab();
    openFirstPaletteSwatch();

    expect(container.querySelector('[role="dialog"]')).not.toBeNull();
    expect(
      container.querySelector('[role="slider"][aria-label="Lightness"]'),
    ).not.toBeNull();
  });

  it('editing an oklch palette swatch emits oklch(...) string via persistColor', () => {
    const persistColor = vi.fn();
    renderColorTab({ persistColor });

    openFirstPaletteSwatch();
    fireFirstPickerSliderArrow();

    expect(persistColor).toHaveBeenCalled();
    const updater = persistColor.mock.calls.at(-1)![0] as (
      prev: ColorTweakState,
    ) => ColorTweakState;
    const result = updater(makeOklchColorState());

    expect(result.palette[0]).toMatch(/^oklch\(/i);
    expect(/^#[0-9a-fA-F]{6,8}$/.test(result.palette[0])).toBe(false);
  });

  it('edited swatch value is NOT #000000 (wide-gamut path stays non-black)', () => {
    const persistColor = vi.fn();
    renderColorTab({ persistColor });

    openFirstPaletteSwatch();
    fireFirstPickerSliderArrow();

    const updater = persistColor.mock.calls.at(-1)![0] as (
      prev: ColorTweakState,
    ) => ColorTweakState;
    const result = updater(makeOklchColorState());
    expect(result.palette[0]).not.toBe('#000000');
  });

  it('editing swatch 0 leaves the wide-gamut slot at index 2 unchanged', () => {
    const persistColor = vi.fn();
    renderColorTab({ persistColor });

    openFirstPaletteSwatch(); // opens swatch 0
    fireFirstPickerSliderArrow();

    const updater = persistColor.mock.calls.at(-1)![0] as (
      prev: ColorTweakState,
    ) => ColorTweakState;
    const result = updater(makeOklchColorState());
    // Only slot 0 was edited; slot 2 must survive untouched
    expect(result.palette[WIDE_GAMUT_INDEX]).toBe(OKLCH_PALETTE_STRINGS[WIDE_GAMUT_INDEX]);
  });
});

// ---------------------------------------------------------------------------
// 6. HSL-EDIT CAVEAT
// ---------------------------------------------------------------------------

describe('HSL-edit caveat: toggle does NOT commit; HSL edit emits oklch() (may reanchor)', () => {
  beforeEach(() => {
    localStorage.setItem('tokenpanel.colorPicker.mode', 'oklch');
  });

  it('toggling picker to HSL mode does NOT call persistColor (no commit on mode toggle)', () => {
    // Mode toggle is pure view-state — it must never trigger a color commit.
    // This is the documented R4-safe invariant: toggling OKLCH↔HSL alone never
    // loses the wide-gamut chroma value; only an HSL slider drag takes the lossy
    // reanchor path.
    const persistColor = vi.fn();
    renderColorTab({ persistColor });

    openFirstPaletteSwatch();

    // The HSL mode button is aria-pressed=false when current mode is oklch
    const hslBtn = container.querySelector<HTMLElement>(
      '[aria-label="Color mode"] [aria-pressed="false"]',
    );
    expect(hslBtn).not.toBeNull();
    act(() => {
      hslBtn!.click();
    });

    // The toggle must NOT have emitted a color change
    expect(persistColor).not.toHaveBeenCalled();
  });

  it('after HSL toggle, HSL-specific Saturation slider is visible (mode switch took effect)', () => {
    // Saturation is present ONLY in HSL mode (not in OKLCH which uses Chroma instead).
    // Checking for Saturation makes this test non-vacuous — it would fail if the toggle
    // had no effect and the picker stayed in OKLCH mode.
    renderColorTab();

    openFirstPaletteSwatch();

    const hslBtn = container.querySelector<HTMLElement>(
      '[aria-label="Color mode"] [aria-pressed="false"]',
    );
    act(() => {
      hslBtn!.click();
    });

    // HSL mode exposes Saturation; OKLCH mode does not (it uses Chroma instead)
    const satSlider = container.querySelector<HTMLElement>(
      '[role="slider"][aria-label="Saturation"]',
    );
    expect(satSlider).not.toBeNull();
  });

  it('after HSL toggle, OKLCH sliders are gone (mode is now HSL)', () => {
    renderColorTab();

    openFirstPaletteSwatch();

    const hslBtn = container.querySelector<HTMLElement>(
      '[aria-label="Color mode"] [aria-pressed="false"]',
    );
    act(() => {
      hslBtn!.click();
    });

    // OKLCH-only sliders (Chroma) must be absent in HSL mode
    const chromaSlider = container.querySelector<HTMLElement>(
      '[role="slider"][aria-label="Chroma"]',
    );
    expect(chromaSlider).toBeNull();
  });

  it('HSL slider edit emits oklch() even in HSL mode (valueFormat drives the output format)', () => {
    // In valueFormat='oklch' mode the picker always emits oklch() regardless of
    // display mode. An HSL edit performs an HSL→oklch conversion which may sRGB-
    // reanchor wide-gamut chroma — this is the ONE documented intentional lossy
    // path (NOT an R4 violation; R4 forbids the eager background clip, not a
    // user-initiated HSL edit).
    const persistColor = vi.fn();
    renderColorTab({ persistColor });

    openFirstPaletteSwatch();

    // Switch to HSL mode (non-committing)
    const hslBtn = container.querySelector<HTMLElement>(
      '[aria-label="Color mode"] [aria-pressed="false"]',
    );
    act(() => {
      hslBtn!.click();
    });

    // Fire an HSL slider keydown — this IS a committing edit
    fireFirstPickerSliderArrow();

    expect(persistColor).toHaveBeenCalled();
    const updater = persistColor.mock.calls.at(-1)![0] as (
      prev: ColorTweakState,
    ) => ColorTweakState;
    const result = updater(makeOklchColorState());

    // The output format is always oklch() when valueFormat='oklch', even from HSL edit
    expect(result.palette[0]).toMatch(/^oklch\(/i);
    expect(result.palette[0]).not.toMatch(/^#/);
  });
});

// ---------------------------------------------------------------------------
// 7. CLUSTER-FEATURE REGRESSION WITH OKLCH PALETTE
// ---------------------------------------------------------------------------

describe('Cluster-feature regression: all cluster features work with an OKLCH palette', () => {
  beforeEach(() => {
    localStorage.setItem('tokenpanel.colorPicker.mode', 'oklch');
  });

  it('Scheme... dropdown renders and lists both bundled OKLCH schemes', () => {
    renderColorTab();

    const select = container.querySelector('.tokenpanel-color-preset-select');
    expect(select).not.toBeNull();
    expect(container.querySelector('option[value="Default OKLCH"]')).not.toBeNull();
    expect(container.querySelector('option[value="Alt OKLCH"]')).not.toBeNull();
  });

  it('scheme-preset swap via initColorFromSchemeData produces all-oklch() palette', () => {
    const cluster = getActivePrimaryCluster();
    const altState = initColorFromSchemeData(ALT_OKLCH_SCHEME, cluster);

    expect(altState.palette.every((c) => c.startsWith('oklch('))).toBe(true);
    expect(altState.palette.includes('#000000')).toBe(false);
    // Alt scheme has 4 oklch() entries
    expect(altState.palette).toHaveLength(PALETTE_SIZE);
  });

  it('base-role (background=3) resolves to palette[3] oklch() on apply', () => {
    // backgroundIndex=3 in altState — applying must write palette[3] not #000000
    const cluster = resolveColorClusterFromTab(PRIMARY_COLOR_TAB)!;
    const altState: ColorTweakState = {
      ...makeOklchColorState(),
      background: 3, // foreground background swapped
      palette: [
        'oklch(0.10 0.01 200)',
        'oklch(0.30 0.15 45)',
        'oklch(0.60 0.20 300)',
        'oklch(0.95 0.01 80)',
      ],
    };
    applyColorState(altState, cluster);

    const bg = document.documentElement.style.getPropertyValue('--oklch-cluster-bg');
    expect(bg).toBe('oklch(0.95 0.01 80)'); // palette[3]
    expect(bg).toMatch(/^oklch\(/);
  });

  it('semantic→palette mapping still resolves OKLCH after a scheme swap', () => {
    const cluster = getActivePrimaryCluster();
    const altState = initColorFromSchemeData(ALT_OKLCH_SCHEME, cluster);
    // accent: 1 (from ALT_OKLCH_SCHEME.semantic.accent)
    expect(altState.semanticMappings['accent']).toBe(1);

    // Apply and verify CSS var
    const clusterFromTab = resolveColorClusterFromTab(PRIMARY_COLOR_TAB)!;
    applyColorState(altState, clusterFromTab);

    const accentVal = document.documentElement.style.getPropertyValue('--oklch-semantic-accent');
    expect(accentVal).toBe(ALT_OKLCH_SCHEME.palette[1]);
    expect(accentVal).toMatch(/^oklch\(/);
  });

  it('Base section renders 2 PaletteSelector rows (background / foreground)', () => {
    renderColorTab();

    const baseGrids = container.querySelectorAll('.tokenpanel-color-base-grid');
    const baseGrid = baseGrids[0] as HTMLElement;
    expect(baseGrid).not.toBeNull();
    const selectors = baseGrid.querySelectorAll('.tokenpanel-palette-selector');
    expect(selectors.length).toBe(2);
  });

  it('Semantic section renders 2 PaletteSelector rows (accent / muted)', () => {
    renderColorTab();

    const baseGrids = container.querySelectorAll('.tokenpanel-color-base-grid');
    const semanticGrid = baseGrids[1] as HTMLElement;
    expect(semanticGrid).not.toBeNull();
    const selectors = semanticGrid.querySelectorAll('.tokenpanel-palette-selector');
    expect(selectors.length).toBe(2);
  });

  it('secondary cluster palette section renders with 2 oklch swatches', () => {
    renderColorTab({
      secondaryTab: SECONDARY_COLOR_TAB,
      secondaryState: makeSecondaryOklchState(),
    });

    const secSection = container.querySelector(
      '[data-testid="tokenpanel-secondary-palette-section"]',
    );
    expect(secSection).not.toBeNull();
    const swatches = secSection!.querySelectorAll('.tokenpanel-color-swatch-button');
    expect(swatches.length).toBe(2);
  });

  it('secondary cluster semantic section renders', () => {
    renderColorTab({
      secondaryTab: SECONDARY_COLOR_TAB,
      secondaryState: makeSecondaryOklchState(),
    });

    const secSemanticSection = container.querySelector(
      '[data-testid="tokenpanel-secondary-semantic-section"]',
    );
    expect(secSemanticSection).not.toBeNull();
    const selectors = secSemanticSection!.querySelectorAll('.tokenpanel-palette-selector');
    expect(selectors.length).toBe(1); // one semantic row: highlight
  });

  it('secondary cluster swatch edit persists oklch() via persistSecondary', () => {
    const persistSecondary = vi.fn();
    renderColorTab({
      secondaryTab: SECONDARY_COLOR_TAB,
      secondaryState: makeSecondaryOklchState(),
      persistSecondary,
    });

    openFirstSecondarySwatch();
    fireFirstPickerSliderArrow();

    expect(persistSecondary).toHaveBeenCalled();
    const updater = persistSecondary.mock.calls.at(-1)![0] as (
      prev: ColorTweakState | undefined,
    ) => ColorTweakState | undefined;
    const result = updater(makeSecondaryOklchState());

    expect(result).not.toBeUndefined();
    expect(result!.palette[0]).toMatch(/^oklch\(/i);
    expect(result!.palette[0]).not.toMatch(/^#/);
  });

  it('primary palette swatch is a color-swatch-button, NOT <input type="color"> (oklch format)', () => {
    renderColorTab();

    const grid = container.querySelector('.tokenpanel-color-palette-grid') as HTMLElement;
    // No native color input should appear — oklch items use the custom swatch
    expect(grid.querySelector('input[type="color"]')).toBeNull();
    // The custom swatch button must be present
    const swatches = grid.querySelectorAll('.tokenpanel-color-swatch-button');
    expect(swatches.length).toBe(PALETTE_SIZE);
  });

  it('no <button> elements rendered in the cluster color tab (hostile-host policy)', () => {
    renderColorTab({
      secondaryTab: SECONDARY_COLOR_TAB,
      secondaryState: makeSecondaryOklchState(),
    });

    expect(container.querySelector('button')).toBeNull();
  });
});
