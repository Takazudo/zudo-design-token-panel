import { describe, expect, it } from 'vitest';
import { buildApplyOverrides } from '../build-apply-overrides';
import type { TweakState, ColorTweakState } from '../../state/tweak-state';
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
