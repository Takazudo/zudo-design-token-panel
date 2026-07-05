import { describe, expect, it } from 'vitest';
import { buildApplyOverrides } from '../build-apply-overrides';
import { applyColorState } from '../../state/tweak-state';
import type { TweakState, ColorTweakState, ApplySink } from '../../state/tweak-state';
import type { TabConfig } from '../../tokens/tier-model';

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

/** Minimal spacing/font/size tabs mirroring what the live fixture config ships. */
const FIXTURE_TABS: readonly TabConfig[] = [
  {
    id: 'spacing',
    label: 'Spacing',
    tiers: [
      {
        id: 'raw',
        label: 'Spacing',
        items: [
          {
            id: 'hsp-md',
            cssVar: '--zd-spacing-hgap-md',
            label: 'hsp-md',
            default: '40px',
            type: { kind: 'length', step: 1, unit: 'px' },
          },
          {
            id: 'vsp-sm',
            cssVar: '--zd-spacing-vgap-sm',
            label: 'vsp-sm',
            default: '16px',
            type: { kind: 'length', step: 1, unit: 'px' },
          },
        ],
      },
    ],
  },
  {
    id: 'font',
    label: 'Font',
    tiers: [
      {
        id: 'raw',
        label: 'Font Sizes',
        items: [
          {
            id: 'text-base',
            cssVar: '--zd-font-base-size',
            label: 'text-base',
            default: '1.4rem',
            type: { kind: 'length', step: 0.05, unit: 'rem' },
          },
          {
            id: 'text-sm',
            cssVar: '--zd-font-sm-size',
            label: 'text-sm',
            default: '1.2rem',
            type: { kind: 'length', step: 0.05, unit: 'rem' },
          },
        ],
      },
    ],
  },
  {
    id: 'size',
    label: 'Size',
    tiers: [
      {
        id: 'raw',
        label: 'Border Radius',
        items: [
          {
            id: 'radius-lg',
            cssVar: '--radius-lg',
            label: 'radius-lg',
            default: '8px',
            type: { kind: 'length', step: 1, unit: 'px' },
          },
          {
            id: 'radius-sm',
            cssVar: '--radius-sm',
            label: 'radius-sm',
            default: '4px',
            type: { kind: 'length', step: 1, unit: 'px' },
          },
        ],
      },
    ],
  },
];

/** Tabs with a reference tier to verify cross-tier resolution. */
const TABS_WITH_REFERENCE_TIER: readonly TabConfig[] = [
  {
    id: 'font',
    label: 'Font',
    tiers: [
      {
        id: 'raw',
        label: 'Font Sizes',
        items: [
          {
            id: 'text-sm',
            cssVar: '--zd-font-sm-size',
            label: 'text-sm',
            default: '1.2rem',
            type: { kind: 'length', step: 0.05, unit: 'rem' },
          },
          {
            id: 'text-base',
            cssVar: '--zd-font-base-size',
            label: 'text-base',
            default: '1.4rem',
            type: { kind: 'length', step: 0.05, unit: 'rem' },
          },
        ],
      },
      {
        id: 'semantic',
        label: 'Semantic Font Sizes',
        referencesTier: 'raw',
        items: [
          {
            id: 'body-text',
            cssVar: '--zd-font-body',
            label: 'body-text',
            default: 'text-base',
            type: { kind: 'length', step: 0.05, unit: 'rem' },
          },
        ],
      },
    ],
  },
];

// Minimal stub cluster with 0 slots — color is NOT the subject of these tests.
const STUB_CLUSTER = {
  id: 'stub',
  label: 'STUB',
  paletteSize: 0,
  baseRoles: {},
  paletteCssVarTemplate: '--stub-p{n}',
  semanticDefaults: {},
  semanticCssNames: {},
  baseDefaults: {},
  defaultShikiTheme: 'dracula' as const,
  colorSchemes: {},
  panelSettings: { colorScheme: '', colorMode: false as const },
};

const EMPTY_COLOR: ColorTweakState = {
  palette: [],
  background: 0,
  foreground: 0,
  cursor: 0,
  selectionBg: 0,
  selectionFg: 0,
  semanticMappings: {},
  shikiTheme: 'dracula',
};

function makeState(
  spacing: Record<string, string> = {},
  typography: Record<string, string> = {},
  size: Record<string, string> = {},
): TweakState {
  return {
    color: EMPTY_COLOR,
    spacing,
    typography,
    size,
  };
}

// ---------------------------------------------------------------------------
// Tests — spacing
// ---------------------------------------------------------------------------

describe('buildApplyOverrides — spacing diffs', () => {
  it('emits a changed spacing token', () => {
    const state = makeState({ 'hsp-md': '24px' });
    const result = buildApplyOverrides(state, undefined, STUB_CLUSTER, FIXTURE_TABS);
    expect(result['--zd-spacing-hgap-md']).toBe('24px');
  });

  it('emits multiple changed spacing tokens', () => {
    const state = makeState({ 'hsp-md': '24px', 'vsp-sm': '8px' });
    const result = buildApplyOverrides(state, undefined, STUB_CLUSTER, FIXTURE_TABS);
    expect(result['--zd-spacing-hgap-md']).toBe('24px');
    expect(result['--zd-spacing-vgap-sm']).toBe('8px');
  });

  it('emits nothing when spacing overrides are empty', () => {
    const state = makeState();
    const result = buildApplyOverrides(state, undefined, STUB_CLUSTER, FIXTURE_TABS);
    expect(Object.keys(result)).toHaveLength(0);
  });

  it('does not emit spacing tokens missing from the overrides map', () => {
    const state = makeState({ 'hsp-md': '24px' });
    const result = buildApplyOverrides(state, undefined, STUB_CLUSTER, FIXTURE_TABS);
    expect(result['--zd-spacing-vgap-sm']).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// Tests — typography
// ---------------------------------------------------------------------------

describe('buildApplyOverrides — typography diffs', () => {
  it('emits a changed typography token (state.typography maps to tab id "font")', () => {
    const state = makeState({}, { 'text-base': '1.6rem' });
    const result = buildApplyOverrides(state, undefined, STUB_CLUSTER, FIXTURE_TABS);
    expect(result['--zd-font-base-size']).toBe('1.6rem');
  });

  it('emits multiple changed typography tokens', () => {
    const state = makeState({}, { 'text-base': '1.6rem', 'text-sm': '1.3rem' });
    const result = buildApplyOverrides(state, undefined, STUB_CLUSTER, FIXTURE_TABS);
    expect(result['--zd-font-base-size']).toBe('1.6rem');
    expect(result['--zd-font-sm-size']).toBe('1.3rem');
  });

  it('emits nothing when typography overrides are empty', () => {
    const state = makeState();
    const result = buildApplyOverrides(state, undefined, STUB_CLUSTER, FIXTURE_TABS);
    expect(result['--zd-font-base-size']).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// Tests — size (including radius)
// ---------------------------------------------------------------------------

describe('buildApplyOverrides — size diffs (including radius)', () => {
  it('emits a changed size token', () => {
    const state = makeState({}, {}, { 'radius-lg': '12px' });
    const result = buildApplyOverrides(state, undefined, STUB_CLUSTER, FIXTURE_TABS);
    expect(result['--radius-lg']).toBe('12px');
  });

  it('emits a radius diff — explicitly asserted (radius is part of the size category)', () => {
    const state = makeState({}, {}, { 'radius-sm': '2px', 'radius-lg': '16px' });
    const result = buildApplyOverrides(state, undefined, STUB_CLUSTER, FIXTURE_TABS);
    expect(result['--radius-sm']).toBe('2px');
    expect(result['--radius-lg']).toBe('16px');
  });

  it('emits nothing when size overrides are empty', () => {
    const state = makeState();
    const result = buildApplyOverrides(state, undefined, STUB_CLUSTER, FIXTURE_TABS);
    expect(result['--radius-lg']).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// Tests — reference tier resolution
// ---------------------------------------------------------------------------

describe('buildApplyOverrides — reference tier resolution', () => {
  it('emits var(--targetCssVar) for a reference-tier override, not the raw item id', () => {
    // Override the semantic `body-text` item to point at `text-sm` in the raw tier.
    const state = makeState({}, { 'body-text': 'text-sm' });
    const result = buildApplyOverrides(state, undefined, STUB_CLUSTER, TABS_WITH_REFERENCE_TIER);
    // The override is stored as the raw-tier item id `text-sm`.
    // The resolver should produce `var(--zd-font-sm-size)`, NOT the literal `text-sm`.
    expect(result['--zd-font-body']).toBe('var(--zd-font-sm-size)');
  });
});

// ---------------------------------------------------------------------------
// Tests — mixed color + non-color
// ---------------------------------------------------------------------------

describe('buildApplyOverrides — mixed color + non-color payloads', () => {
  it('emits non-color tokens alongside an empty color diff', () => {
    const state = makeState({ 'hsp-md': '32px' }, { 'text-base': '1.5rem' }, { 'radius-lg': '10px' });
    const result = buildApplyOverrides(state, EMPTY_COLOR, STUB_CLUSTER, FIXTURE_TABS);
    expect(result['--zd-spacing-hgap-md']).toBe('32px');
    expect(result['--zd-font-base-size']).toBe('1.5rem');
    expect(result['--radius-lg']).toBe('10px');
  });
});

/** A minimal `palette` tab fixture for state.tabs generic-tab tests. */
const PALETTE_TAB: TabConfig = {
  id: 'palette',
  label: 'Palette',
  tiers: [
    {
      id: 'raw',
      label: 'Gray',
      items: [
        {
          id: 'palette-gray-3',
          cssVar: '--palette-gray-3',
          label: 'gray-3',
          default: '#aaaaaa',
          type: { kind: 'color' },
        },
        {
          id: 'palette-gray-5',
          cssVar: '--palette-gray-5',
          label: 'gray-5',
          default: '#555555',
          type: { kind: 'color' },
        },
      ],
    },
  ],
};

const FIXTURE_TABS_WITH_PALETTE: readonly TabConfig[] = [...FIXTURE_TABS, PALETTE_TAB];

// ---------------------------------------------------------------------------
// Tests — no tab configured
// ---------------------------------------------------------------------------

describe('buildApplyOverrides — missing tab in config', () => {
  it('silently skips a non-color slice when the corresponding tab is absent from tabs', () => {
    const state = makeState({ 'hsp-md': '24px' });
    // Pass empty tabs — spacing tab is absent.
    const result = buildApplyOverrides(state, undefined, STUB_CLUSTER, []);
    expect(Object.keys(result)).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// Tests — color-only regression (existing behavior unchanged)
// ---------------------------------------------------------------------------

describe('buildApplyOverrides — color-only regression', () => {
  const FIXTURE_CLUSTER = {
    id: 'fixture',
    label: 'Fixture',
    paletteSize: 4,
    baseRoles: {},
    paletteCssVarTemplate: '--fixture-p{n}',
    semanticDefaults: { accent: 1 },
    semanticCssNames: { accent: '--fixture-semantic-accent' },
    baseDefaults: { background: 0, foreground: 3, cursor: 1, selectionBg: 0, selectionFg: 3 },
    defaultShikiTheme: 'dracula' as const,
    colorSchemes: {},
    panelSettings: { colorScheme: '', colorMode: false as const },
  };

  const BASE_COLOR: ColorTweakState = {
    palette: ['#000000', '#111111', '#222222', '#ffffff'],
    background: 0,
    foreground: 3,
    cursor: 1,
    selectionBg: 0,
    selectionFg: 3,
    semanticMappings: { accent: 1 },
    shikiTheme: 'dracula',
  };

  it('emits palette slot when it differs from baseline', () => {
    const state: TweakState = {
      color: { ...BASE_COLOR, palette: ['#ff0000', '#111111', '#222222', '#ffffff'] },
      spacing: {},
      typography: {},
      size: {},
    };
    const result = buildApplyOverrides(state, BASE_COLOR, FIXTURE_CLUSTER, []);
    expect(result['--fixture-p0']).toBe('#ff0000');
    expect(result['--fixture-p1']).toBeUndefined();
  });

  it('emits semantic mapping as var() reference when it differs from baseline', () => {
    const state: TweakState = {
      color: { ...BASE_COLOR, semanticMappings: { accent: 2 } },
      spacing: {},
      typography: {},
      size: {},
    };
    const result = buildApplyOverrides(state, BASE_COLOR, FIXTURE_CLUSTER, []);
    expect(result['--fixture-semantic-accent']).toBe('var(--fixture-p2)');
  });

  it('emits the full color block when colorDefaults is undefined', () => {
    const state: TweakState = {
      color: BASE_COLOR,
      spacing: {},
      typography: {},
      size: {},
    };
    const result = buildApplyOverrides(state, undefined, FIXTURE_CLUSTER, []);
    // All 4 palette slots emitted.
    expect(result['--fixture-p0']).toBe('#000000');
    expect(result['--fixture-p3']).toBe('#ffffff');
    // Semantic mapping emitted.
    expect(result['--fixture-semantic-accent']).toBe('var(--fixture-p1)');
  });
});

// ---------------------------------------------------------------------------
// Tests — state.tabs generic tab overrides
// ---------------------------------------------------------------------------

describe('buildApplyOverrides — state.tabs generic tab overrides', () => {
  it('emits a palette tab override from state.tabs', () => {
    const state: TweakState = {
      color: EMPTY_COLOR,
      spacing: {},
      typography: {},
      size: {},
      tabs: { palette: { raw: { 'palette-gray-3': '#cccccc' } } },
    };
    const result = buildApplyOverrides(state, undefined, STUB_CLUSTER, FIXTURE_TABS_WITH_PALETTE);
    expect(result['--palette-gray-3']).toBe('#cccccc');
  });

  it('emits multiple palette tab overrides from state.tabs', () => {
    const state: TweakState = {
      color: EMPTY_COLOR,
      spacing: {},
      typography: {},
      size: {},
      tabs: { palette: { raw: { 'palette-gray-3': '#cccccc', 'palette-gray-5': '#333333' } } },
    };
    const result = buildApplyOverrides(state, undefined, STUB_CLUSTER, FIXTURE_TABS_WITH_PALETTE);
    expect(result['--palette-gray-3']).toBe('#cccccc');
    expect(result['--palette-gray-5']).toBe('#333333');
  });

  it('does not emit palette vars that are absent from state.tabs overrides', () => {
    const state: TweakState = {
      color: EMPTY_COLOR,
      spacing: {},
      typography: {},
      size: {},
      tabs: { palette: { raw: { 'palette-gray-3': '#cccccc' } } },
    };
    const result = buildApplyOverrides(state, undefined, STUB_CLUSTER, FIXTURE_TABS_WITH_PALETTE);
    expect(result['--palette-gray-5']).toBeUndefined();
  });

  it('emits nothing when state.tabs is absent', () => {
    const state: TweakState = {
      color: EMPTY_COLOR,
      spacing: {},
      typography: {},
      size: {},
    };
    const result = buildApplyOverrides(state, undefined, STUB_CLUSTER, FIXTURE_TABS_WITH_PALETTE);
    expect(Object.keys(result)).toHaveLength(0);
  });

  it('silently skips a state.tabs entry when the tab is absent from the tabs config', () => {
    const state: TweakState = {
      color: EMPTY_COLOR,
      spacing: {},
      typography: {},
      size: {},
      tabs: { palette: { raw: { 'palette-gray-3': '#cccccc' } } },
    };
    // FIXTURE_TABS does not include the palette tab.
    const result = buildApplyOverrides(state, undefined, STUB_CLUSTER, FIXTURE_TABS);
    expect(result['--palette-gray-3']).toBeUndefined();
    expect(Object.keys(result)).toHaveLength(0);
  });

  it('does not affect existing spacing/font/size emission when state.tabs is set', () => {
    const state: TweakState = {
      color: EMPTY_COLOR,
      spacing: { 'hsp-md': '24px' },
      typography: {},
      size: {},
      tabs: { palette: { raw: { 'palette-gray-3': '#cccccc' } } },
    };
    const result = buildApplyOverrides(state, undefined, STUB_CLUSTER, FIXTURE_TABS_WITH_PALETTE);
    expect(result['--zd-spacing-hgap-md']).toBe('24px');
    expect(result['--palette-gray-3']).toBe('#cccccc');
  });
});

// ---------------------------------------------------------------------------
// Tests — literal semantic value (S4, #465)
// ---------------------------------------------------------------------------

describe('buildApplyOverrides — literal semantic value (S4, #465)', () => {
  const LITERAL_CLUSTER = {
    id: 'literal-fixture',
    label: 'Literal Fixture',
    paletteSize: 4,
    baseRoles: {},
    paletteCssVarTemplate: '--literal-p{n}',
    semanticDefaults: { accent: 1 },
    semanticCssNames: { accent: '--zd-danger' },
    baseDefaults: { background: 0, foreground: 3, cursor: 1, selectionBg: 0, selectionFg: 3 },
    defaultShikiTheme: 'dracula' as const,
    colorSchemes: {},
    panelSettings: { colorScheme: '', colorMode: false as const },
  };

  const LITERAL_BASE_COLOR: ColorTweakState = {
    palette: ['#000000', '#111111', '#222222', '#ffffff'],
    background: 0,
    foreground: 3,
    cursor: 1,
    selectionBg: 0,
    selectionFg: 3,
    semanticMappings: { accent: 1 },
    shikiTheme: 'dracula',
  };

  it('emits a { literal: string } semantic mapping verbatim, not var(--palette-N)', () => {
    const state: TweakState = {
      color: {
        ...LITERAL_BASE_COLOR,
        semanticMappings: { accent: { literal: 'oklch(0.55 0.2 25)' } },
      },
      spacing: {},
      typography: {},
      size: {},
    };
    const result = buildApplyOverrides(state, LITERAL_BASE_COLOR, LITERAL_CLUSTER, []);
    expect(result['--zd-danger']).toBe('oklch(0.55 0.2 25)');
  });

  it('legacy index/bg/fg mapping still emits var(--palette-N) (unchanged behavior)', () => {
    const state: TweakState = {
      color: { ...LITERAL_BASE_COLOR, semanticMappings: { accent: 2 } },
      spacing: {},
      typography: {},
      size: {},
    };
    const result = buildApplyOverrides(state, LITERAL_BASE_COLOR, LITERAL_CLUSTER, []);
    expect(result['--zd-danger']).toBe('var(--literal-p2)');
  });

  it('emits the literal value when colorDefaults is undefined (no baseline)', () => {
    const state: TweakState = {
      color: {
        ...LITERAL_BASE_COLOR,
        semanticMappings: { accent: { literal: 'oklch(0.55 0.2 25)' } },
      },
      spacing: {},
      typography: {},
      size: {},
    };
    const result = buildApplyOverrides(state, undefined, LITERAL_CLUSTER, []);
    expect(result['--zd-danger']).toBe('oklch(0.55 0.2 25)');
  });

  it('diff gate: does not re-emit a structurally-unchanged literal value', () => {
    // The baseline and current mappings hold the SAME literal string but are
    // distinct object references (as an immutable state update would produce).
    // A reference-identity (`!==`) diff gate would treat this as "changed" and
    // re-emit every time; the structural-equality gate must recognize no
    // actual value change occurred.
    const baseline: ColorTweakState = {
      ...LITERAL_BASE_COLOR,
      semanticMappings: { accent: { literal: 'oklch(0.55 0.2 25)' } },
    };
    const state: TweakState = {
      color: {
        ...LITERAL_BASE_COLOR,
        semanticMappings: { accent: { literal: 'oklch(0.55 0.2 25)' } },
      },
      spacing: {},
      typography: {},
      size: {},
    };
    const result = buildApplyOverrides(state, baseline, LITERAL_CLUSTER, []);
    expect(result['--zd-danger']).toBeUndefined();
  });

  it('diff gate: DOES re-emit when the literal string actually changes', () => {
    const baseline: ColorTweakState = {
      ...LITERAL_BASE_COLOR,
      semanticMappings: { accent: { literal: 'oklch(0.55 0.2 25)' } },
    };
    const state: TweakState = {
      color: {
        ...LITERAL_BASE_COLOR,
        semanticMappings: { accent: { literal: 'oklch(0.9 0.1 100)' } },
      },
      spacing: {},
      typography: {},
      size: {},
    };
    const result = buildApplyOverrides(state, baseline, LITERAL_CLUSTER, []);
    expect(result['--zd-danger']).toBe('oklch(0.9 0.1 100)');
  });
});

// ---------------------------------------------------------------------------
// Tests — emitter parity: disk output vs. DOM-applied value (S4, #465)
// ---------------------------------------------------------------------------

describe('buildApplyOverrides / applyColorState — emitter parity for a literal semantic row', () => {
  const PARITY_CLUSTER = {
    id: 'parity-fixture',
    label: 'Parity Fixture',
    paletteSize: 4,
    baseRoles: {},
    paletteCssVarTemplate: '--parity-p{n}',
    semanticDefaults: { danger: 1 },
    semanticCssNames: { danger: '--zd-danger' },
    baseDefaults: { background: 0, foreground: 3, cursor: 1, selectionBg: 0, selectionFg: 3 },
    defaultShikiTheme: 'dracula' as const,
    colorSchemes: {},
    panelSettings: { colorScheme: '', colorMode: false as const },
  };

  it('the disk cssVar value equals the DOM-applied (sink) value for a { literal } row', () => {
    const color: ColorTweakState = {
      palette: ['#000000', '#111111', '#222222', '#ffffff'],
      background: 0,
      foreground: 3,
      cursor: 1,
      selectionBg: 0,
      selectionFg: 3,
      semanticMappings: { danger: { literal: 'oklch(0.55 0.2 25)' } },
      shikiTheme: 'dracula',
    };
    const state: TweakState = { color, spacing: {}, typography: {}, size: {} };

    const diskResult = buildApplyOverrides(state, undefined, PARITY_CLUSTER, []);

    const applied: Record<string, string> = {};
    const sink: ApplySink = {
      apply(pairs) {
        for (const [name, value] of pairs) applied[name] = value;
      },
      clear() {},
    };
    applyColorState(color, PARITY_CLUSTER, sink);

    expect(diskResult['--zd-danger']).toBe('oklch(0.55 0.2 25)');
    expect(applied['--zd-danger']).toBe(diskResult['--zd-danger']);
  });
});

// ---------------------------------------------------------------------------
// Tests — emitter parity: disk output vs. DOM-applied value for a cross-tab
// { ref } semantic row (S7b, #468)
// ---------------------------------------------------------------------------

describe('buildApplyOverrides / applyColorState — emitter parity for a cross-tab { ref } semantic row (S7b, #468)', () => {
  // The color tab whose semantic tier holds the { ref } mapping. Empty tiers
  // are fine here — buildApplyOverrides/applyColorState only need this tab to
  // exist (by id 'color') so resolveRefToCssVar has a currentTab to resolve
  // "tab omitted" refs against; the actual ref under test always names an
  // explicit target tab ('palette').
  const COLOR_TAB: TabConfig = {
    id: 'color',
    label: 'Color',
    tiers: [],
  };

  // The grouped Palette tab: the ramp tier the { ref } points into.
  const PALETTE_TAB: TabConfig = {
    id: 'palette',
    label: 'Palette',
    tiers: [
      {
        id: 'base',
        label: 'Base',
        items: [
          {
            id: 'base-1',
            cssVar: '--palette-base-1',
            label: 'base-1',
            default: '#111111',
            type: { kind: 'color' },
          },
          {
            id: 'base-3',
            cssVar: '--palette-base-3',
            label: 'base-3',
            default: '#333333',
            type: { kind: 'color' },
          },
        ],
      },
    ],
  };

  const REF_TABS: readonly TabConfig[] = [COLOR_TAB, PALETTE_TAB];

  const REF_CLUSTER = {
    id: 'ref-fixture',
    label: 'Ref Fixture',
    paletteSize: 4,
    baseRoles: {},
    paletteCssVarTemplate: '--ref-p{n}',
    semanticDefaults: { surface: 1, danger: 1, accent: 1 },
    semanticCssNames: { surface: '--zd-surface', danger: '--zd-danger', accent: '--zd-accent' },
    baseDefaults: { background: 0, foreground: 3, cursor: 1, selectionBg: 0, selectionFg: 3 },
    defaultShikiTheme: 'dracula' as const,
    colorSchemes: {},
    panelSettings: { colorScheme: '', colorMode: false as const },
  };

  const BASE_COLOR: ColorTweakState = {
    palette: ['#000000', '#111111', '#222222', '#ffffff'],
    background: 0,
    foreground: 3,
    cursor: 1,
    selectionBg: 0,
    selectionFg: 3,
    semanticMappings: { surface: 1, danger: 1, accent: 1 },
    shikiTheme: 'dracula',
  };

  it('a { ref: { tab: "palette", tier: "base", item: "base-3" } } row emits var(--palette-base-3) identically in both emitters', () => {
    const color: ColorTweakState = {
      ...BASE_COLOR,
      semanticMappings: {
        ...BASE_COLOR.semanticMappings,
        surface: { ref: { tab: 'palette', tier: 'base', item: 'base-3' } },
      },
    };
    const state: TweakState = { color, spacing: {}, typography: {}, size: {} };

    const diskResult = buildApplyOverrides(state, undefined, REF_CLUSTER, REF_TABS);

    const applied: Record<string, string> = {};
    const sink: ApplySink = {
      apply(pairs) {
        for (const [name, value] of pairs) applied[name] = value;
      },
      clear() {},
    };
    applyColorState(color, REF_CLUSTER, sink, COLOR_TAB, REF_TABS);

    expect(diskResult['--zd-surface']).toBe('var(--palette-base-3)');
    expect(applied['--zd-surface']).toBe(diskResult['--zd-surface']);
  });

  it('index and literal rows alongside a { ref } row are unaffected (unchanged behavior)', () => {
    const color: ColorTweakState = {
      ...BASE_COLOR,
      semanticMappings: {
        surface: { ref: { tab: 'palette', tier: 'base', item: 'base-3' } },
        danger: { literal: 'oklch(0.55 0.2 25)' },
        accent: 2, // legacy palette-index mapping
      },
    };
    const state: TweakState = { color, spacing: {}, typography: {}, size: {} };

    const diskResult = buildApplyOverrides(state, undefined, REF_CLUSTER, REF_TABS);

    const applied: Record<string, string> = {};
    const sink: ApplySink = {
      apply(pairs) {
        for (const [name, value] of pairs) applied[name] = value;
      },
      clear() {},
    };
    applyColorState(color, REF_CLUSTER, sink, COLOR_TAB, REF_TABS);

    // The { ref } and { literal } rows keep byte-identical disk/DOM output.
    expect(diskResult['--zd-surface']).toBe('var(--palette-base-3)');
    expect(diskResult['--zd-danger']).toBe('oklch(0.55 0.2 25)');
    expect(applied['--zd-surface']).toBe(diskResult['--zd-surface']);
    expect(applied['--zd-danger']).toBe(diskResult['--zd-danger']);

    // The legacy index row keeps its PRE-EXISTING (intentional) disk/DOM
    // divergence: disk emits an indirect var(--palette-N) reference, while
    // the DOM path resolves straight to the palette's stored color value
    // (see `resolveMapping`/the top-of-file doc comment) — { ref } support
    // does not change this.
    expect(diskResult['--zd-accent']).toBe('var(--ref-p2)');
    expect(applied['--zd-accent']).toBe('#222222');
  });

  it('an unresolvable { ref } (unknown target item) is skipped on BOTH disk and DOM — same-output contract, no black paint', () => {
    const color: ColorTweakState = {
      ...BASE_COLOR,
      semanticMappings: {
        ...BASE_COLOR.semanticMappings,
        surface: { ref: { tab: 'palette', tier: 'base', item: 'no-such-item' } },
      },
    };
    const state: TweakState = { color, spacing: {}, typography: {}, size: {} };

    const diskResult = buildApplyOverrides(state, undefined, REF_CLUSTER, REF_TABS);
    expect(diskResult['--zd-surface']).toBeUndefined();

    const applied: Record<string, string> = {};
    const sink: ApplySink = {
      apply(pairs) {
        for (const [name, value] of pairs) applied[name] = value;
      },
      clear() {},
    };
    applyColorState(color, REF_CLUSTER, sink, COLOR_TAB, REF_TABS);
    // DOM now also skips (leaves the token at its stylesheet default) instead
    // of painting it black — matching disk, per the review fix.
    expect(applied['--zd-surface']).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// Tests — per-mode literal { literal: { light, dark } } → light-dark() (S11, #472)
// ---------------------------------------------------------------------------

describe('buildApplyOverrides — per-mode literal semantic value (S11, #472)', () => {
  const PM_CLUSTER = {
    id: 'permode-fixture',
    label: 'Per-mode Fixture',
    paletteSize: 4,
    baseRoles: {},
    paletteCssVarTemplate: '--pm-p{n}',
    semanticDefaults: { danger: 1 },
    semanticCssNames: { danger: '--zd-danger' },
    baseDefaults: { background: 0, foreground: 3, cursor: 1, selectionBg: 0, selectionFg: 3 },
    defaultShikiTheme: 'dracula' as const,
    colorSchemes: {},
    panelSettings: { colorScheme: '', colorMode: false as const },
  };

  const PM_BASE_COLOR: ColorTweakState = {
    palette: ['#000000', '#111111', '#222222', '#ffffff'],
    background: 0,
    foreground: 3,
    cursor: 1,
    selectionBg: 0,
    selectionFg: 3,
    semanticMappings: { danger: 1 },
    shikiTheme: 'dracula',
  };

  it('emits light-dark(<light>, <dark>) for a { literal: { light, dark } } mapping', () => {
    const state: TweakState = {
      color: {
        ...PM_BASE_COLOR,
        semanticMappings: { danger: { literal: { light: '#ff0000', dark: '#990000' } } },
      },
      spacing: {},
      typography: {},
      size: {},
    };
    const result = buildApplyOverrides(state, undefined, PM_CLUSTER, []);
    expect(result['--zd-danger']).toBe('light-dark(#ff0000, #990000)');
  });

  it('diff gate: does not re-emit a structurally-unchanged per-mode value', () => {
    const baseline: ColorTweakState = {
      ...PM_BASE_COLOR,
      semanticMappings: { danger: { literal: { light: '#ff0000', dark: '#990000' } } },
    };
    const state: TweakState = {
      color: {
        ...PM_BASE_COLOR,
        // Distinct object reference, identical structural value.
        semanticMappings: { danger: { literal: { light: '#ff0000', dark: '#990000' } } },
      },
      spacing: {},
      typography: {},
      size: {},
    };
    const result = buildApplyOverrides(state, baseline, PM_CLUSTER, []);
    expect(result['--zd-danger']).toBeUndefined();
  });

  it('diff gate: DOES re-emit when either mode of the per-mode value changes', () => {
    const baseline: ColorTweakState = {
      ...PM_BASE_COLOR,
      semanticMappings: { danger: { literal: { light: '#ff0000', dark: '#990000' } } },
    };
    const state: TweakState = {
      color: {
        ...PM_BASE_COLOR,
        semanticMappings: { danger: { literal: { light: '#ff0000', dark: '#550000' } } },
      },
      spacing: {},
      typography: {},
      size: {},
    };
    const result = buildApplyOverrides(state, baseline, PM_CLUSTER, []);
    expect(result['--zd-danger']).toBe('light-dark(#ff0000, #550000)');
  });

  it('disk output equals the DOM-applied (sink) value for a per-mode row (parity)', () => {
    const color: ColorTweakState = {
      ...PM_BASE_COLOR,
      semanticMappings: { danger: { literal: { light: '#ff0000', dark: '#990000' } } },
    };
    const state: TweakState = { color, spacing: {}, typography: {}, size: {} };

    const diskResult = buildApplyOverrides(state, undefined, PM_CLUSTER, []);

    const applied: Record<string, string> = {};
    const sink: ApplySink = {
      apply(pairs) {
        for (const [name, value] of pairs) applied[name] = value;
      },
      clear() {},
    };
    applyColorState(color, PM_CLUSTER, sink);

    expect(diskResult['--zd-danger']).toBe('light-dark(#ff0000, #990000)');
    expect(applied['--zd-danger']).toBe(diskResult['--zd-danger']);
  });

  it('single-mode { literal: string } rows still emit a plain value (unchanged)', () => {
    const state: TweakState = {
      color: {
        ...PM_BASE_COLOR,
        semanticMappings: { danger: { literal: 'oklch(0.55 0.2 25)' } },
      },
      spacing: {},
      typography: {},
      size: {},
    };
    const result = buildApplyOverrides(state, undefined, PM_CLUSTER, []);
    expect(result['--zd-danger']).toBe('oklch(0.55 0.2 25)');
  });
});
