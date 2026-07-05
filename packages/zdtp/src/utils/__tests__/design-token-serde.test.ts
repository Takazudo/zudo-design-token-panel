import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  DesignTokenSchemaError,
  SCHEMA_V1,
  SCHEMA_V2,
  SCHEMA_V3,
  deserialize,
  getDesignTokenSchema,
  serialize,
  type DesignTokenJsonV2,
  type DesignTokenJsonV3,
} from '../design-token-serde';
import { applyFullState } from '../../state/tweak-state';
import type { ColorTweakState, SemanticValue, TweakState } from '../../state/tweak-state';
import { __resetPanelConfigForTests } from '../../config/panel-config';
import { installFixturePanelConfig, FIXTURE_CLUSTER, FIXTURE_TABS } from '../../__tests__/_test-helpers';
import type { TabConfig } from '../../tokens/tier-model';

beforeEach(() => {
  installFixturePanelConfig();
});

/**
 * Design-token serde tests — updated for v2 format.
 *
 * serialize() always emits v2 format (SCHEMA_V2). deserialize() accepts both
 * v1 (SCHEMA_V1) and v2 (SCHEMA_V2).
 *
 * The fixture panel config has:
 *   - 16-slot cluster with cssVars `--fixture-p{n}` (from FIXTURE_CLUSTER)
 *   - spacing tokens: hsp-md (--zd-spacing-hgap-md, default 40px)
 *                     vsp-sm (--zd-spacing-vgap-sm, default 16px)
 *   - typography tokens: text-base (--zd-font-base-size, default 1.4rem)
 *   - size tokens: radius-lg (--radius-lg, default 8px)
 *   - semanticCssNames: { accent: '--fixture-semantic-accent', muted: '--fixture-semantic-muted', active: '--fixture-semantic-active' }
 */

/** Fully-populated 16-color palette whose entries look obviously synthetic so
 *  tests can spot a palette leak at a glance. */
const PALETTE_BASELINE = Array.from(
  { length: 16 },
  (_, i) => `#${i.toString(16).padStart(2, '0').repeat(3)}`,
);

const COLOR_BASELINE: ColorTweakState = {
  palette: PALETTE_BASELINE,
  background: 0,
  foreground: 15,
  cursor: 6,
  selectionBg: 0,
  selectionFg: 15,
  semanticMappings: {
    accent: 5,
    muted: 8,
    active: 14,
  },
  shikiTheme: 'dracula',
};

function cloneBaseline(): ColorTweakState {
  return {
    ...COLOR_BASELINE,
    palette: [...COLOR_BASELINE.palette],
    semanticMappings: { ...COLOR_BASELINE.semanticMappings },
  };
}

function makeState(overrides: Partial<TweakState> = {}): TweakState {
  return {
    color: cloneBaseline(),
    spacing: {},
    typography: {},
    size: {},
    ...overrides,
  };
}

afterEach(() => {
  __resetPanelConfigForTests();
  vi.restoreAllMocks();
});

// ---------------------------------------------------------------------------
// serialize — v2 output format
// ---------------------------------------------------------------------------

describe('serialize — v2 format', () => {
  it('always emits SCHEMA_V2 as $schema regardless of panelConfig.schemaId', () => {
    const state = makeState();
    const json = serialize(state, { colorDefaults: COLOR_BASELINE });
    expect(json.$schema).toBe(SCHEMA_V2);
    expect(typeof json.exportedAt).toBe('string');
    expect(() => new Date(json.exportedAt).toISOString()).not.toThrow();
  });

  it('emits no tabs when state matches baseline (diff-only)', () => {
    const json = serialize(makeState(), { colorDefaults: COLOR_BASELINE });
    expect(json.tabs).toBeUndefined();
  });

  it('emits spacing.raw with cssVar keys when a spacing override differs from manifest default', () => {
    const state = makeState({ spacing: { 'hsp-md': '50px' } });
    const json = serialize(state, { colorDefaults: COLOR_BASELINE });
    expect(json.tabs?.['spacing']?.['raw']).toEqual({ '--zd-spacing-hgap-md': '50px' });
  });

  it('drops spacing overrides that match the manifest default (diff-only)', () => {
    // 40px is the declared default for --zd-spacing-hgap-md, so it should NOT appear
    const state = makeState({ spacing: { 'hsp-md': '40px' } });
    const json = serialize(state, { colorDefaults: COLOR_BASELINE });
    expect(json.tabs?.['spacing']).toBeUndefined();
  });

  it('emits font.raw with cssVar keys for typography overrides', () => {
    // Internal state slice is "typography" but external tab id is "font"
    const state = makeState({ typography: { 'text-base': '1.5rem' } });
    const json = serialize(state, { colorDefaults: COLOR_BASELINE });
    expect(json.tabs?.['font']?.['raw']).toEqual({ '--zd-font-base-size': '1.5rem' });
  });

  it('emits size.raw with cssVar keys for size overrides', () => {
    const state = makeState({ size: { 'radius-lg': '12px' } });
    const json = serialize(state, { colorDefaults: COLOR_BASELINE });
    expect(json.tabs?.['size']?.['raw']).toEqual({ '--radius-lg': '12px' });
  });

  it('emits color.palette as cssVar-keyed map when any slot differs', () => {
    const color = cloneBaseline();
    color.palette[5] = '#ff00ff';
    const json = serialize(makeState({ color }), { colorDefaults: COLOR_BASELINE });
    const paletteMap = json.tabs?.['color']?.['palette'] as Record<string, string> | undefined;
    expect(paletteMap).toBeDefined();
    expect(paletteMap!['--fixture-p5']).toBe('#ff00ff');
    // Only the changed slot is present in diff-only mode
    expect(Object.keys(paletteMap!)).toContain('--fixture-p5');
    expect(Object.keys(paletteMap!)).not.toContain('--fixture-p0');
  });

  it('emits color.semantic as cssVar-keyed palette-index integers when a mapping differs', () => {
    const color = cloneBaseline();
    color.semanticMappings.accent = 7; // was 5
    const json = serialize(makeState({ color }), { colorDefaults: COLOR_BASELINE });
    const semMap = json.tabs?.['color']?.['semantic'] as Record<string, number> | undefined;
    expect(semMap).toBeDefined();
    // The cssVar for 'accent' is '--fixture-semantic-accent' per FIXTURE_CLUSTER
    expect(semMap!['--fixture-semantic-accent']).toBe(7);
    // Unchanged semantic entries not emitted in diff-only mode
    expect(semMap!['--fixture-semantic-muted']).toBeUndefined();
  });

  it('does NOT emit color.base or color.shikiTheme in v2 (those are internal-only)', () => {
    const color = cloneBaseline();
    color.cursor = 9;
    color.shikiTheme = 'vitesse-dark';
    const json = serialize(makeState({ color }), { colorDefaults: COLOR_BASELINE });
    // color tab may be emitted but must not contain 'base' or 'shikiTheme'
    const colorTab = json.tabs?.['color'];
    if (colorTab) {
      expect(colorTab['base']).toBeUndefined();
      expect(colorTab['shikiTheme']).toBeUndefined();
    }
  });

  it('emits full token blocks when includeDefaults=true', () => {
    const json = serialize(makeState(), {
      colorDefaults: COLOR_BASELINE,
      includeDefaults: true,
    });
    expect(json.tabs).toBeDefined();
    // Color palette — all 16 slots emitted
    const paletteMap = json.tabs?.['color']?.['palette'] as Record<string, string> | undefined;
    expect(paletteMap).toBeDefined();
    expect(Object.keys(paletteMap!)).toHaveLength(16);
    // Spacing
    expect(json.tabs?.['spacing']?.['raw']?.['--zd-spacing-hgap-md']).toBe('40px');
    // Font (typography)
    expect(json.tabs?.['font']?.['raw']?.['--zd-font-base-size']).toBe('1.4rem');
    // Size
    expect(json.tabs?.['size']?.['raw']?.['--radius-lg']).toBe('8px');
  });

  it('stamps exportedAt using opts.now when provided', () => {
    const fixed = new Date('2024-01-01T12:00:00.000Z');
    const json = serialize(makeState(), { now: () => fixed });
    expect(json.exportedAt).toBe('2024-01-01T12:00:00.000Z');
  });
});

// ---------------------------------------------------------------------------
// deserialize — v2 input
// ---------------------------------------------------------------------------

describe('deserialize — v2 format', () => {
  it('round-trips a diff-only export (serialize → JSON.stringify → deserialize)', () => {
    const original = makeState({
      spacing: { 'hsp-md': '50px', 'vsp-sm': '24px' },
      typography: { 'text-base': '1.3rem' },
      size: { 'radius-lg': '12px' },
    });

    const json = serialize(original, { colorDefaults: COLOR_BASELINE });
    const text = JSON.stringify(json);
    const parsed = JSON.parse(text);
    const { state, unknownTokens } = deserialize(parsed, { colorDefaults: COLOR_BASELINE });

    expect(unknownTokens).toEqual([]);
    expect(state.spacing).toEqual(original.spacing);
    expect(state.typography).toEqual(original.typography);
    expect(state.size).toEqual(original.size);
  });

  it('round-trips includeDefaults export cleanly', () => {
    const original = makeState({
      spacing: { 'hsp-md': '50px' },
    });
    original.color.palette[3] = '#aabbcc';

    const json = serialize(original, { colorDefaults: COLOR_BASELINE, includeDefaults: true });
    const parsed = JSON.parse(JSON.stringify(json));
    const { state, unknownTokens } = deserialize(parsed, { colorDefaults: COLOR_BASELINE });

    expect(unknownTokens).toEqual([]);
    expect(state.spacing['hsp-md']).toBe('50px');
    expect(state.color.palette[3]).toBe('#aabbcc');
  });

  it('collects unknown CSS var names in unknownTokens', () => {
    const payload: DesignTokenJsonV2 = {
      $schema: SCHEMA_V2,
      exportedAt: new Date().toISOString(),
      tabs: {
        spacing: {
          raw: {
            '--zd-spacing-hgap-md': '50px',
            '--spacing-nope': '1rem',
          },
        },
        size: {
          raw: {
            '--radius-imaginary': '20px',
          },
        },
      },
    };
    const { state, unknownTokens } = deserialize(payload, { colorDefaults: COLOR_BASELINE });
    expect(state.spacing).toEqual({ 'hsp-md': '50px' });
    expect(state.size).toEqual({});
    expect(unknownTokens.sort()).toEqual(['--radius-imaginary', '--spacing-nope'].sort());
  });

  it('F28: v2 import sanitizes garbage palette entry "18" → "#000000" (same as seed-time sanitizer, commit 8d54e07)', () => {
    // Regression guard for F28: the v2 color.palette block is cssVar-keyed;
    // a garbage string value like "18" must be sanitized to '#000000' by
    // normalizeSchemePaletteEntry rather than leaking into a CSS custom property.
    const payload = {
      $schema: SCHEMA_V2,
      exportedAt: new Date().toISOString(),
      tabs: {
        color: {
          palette: {
            '--fixture-p3': '18', // garbage entry — same as Default Dark's slot-9
          },
        },
      },
    };
    const { state } = deserialize(payload, { colorDefaults: COLOR_BASELINE });
    // Garbage entry is canonicalized to safe '#000000'.
    expect(state.color.palette[3]).toBe('#000000');
    // Other palette slots unchanged from baseline.
    expect(state.color.palette[0]).toBe(COLOR_BASELINE.palette[0]);
  });

  it('throws schema-mismatch for unknown $schema values', () => {
    expect(() =>
      deserialize(
        { $schema: 'zudo-doc-design-tokens/v1', exportedAt: 'x' },
        { colorDefaults: COLOR_BASELINE },
      ),
    ).toThrowError(DesignTokenSchemaError);
  });

  it('throws schema-missing when $schema is absent', () => {
    try {
      deserialize({ exportedAt: 'x' }, { colorDefaults: COLOR_BASELINE });
      throw new Error('expected to throw');
    } catch (err) {
      expect(err).toBeInstanceOf(DesignTokenSchemaError);
      expect((err as DesignTokenSchemaError).reason).toBe('schema-missing');
    }
  });

  it('throws not-object for non-object input', () => {
    expect(() => deserialize('hello')).toThrowError(DesignTokenSchemaError);
    expect(() => deserialize(null)).toThrowError(DesignTokenSchemaError);
    expect(() => deserialize(42)).toThrowError(DesignTokenSchemaError);
  });

  it('falls back to baseline color when tabs.color is absent', () => {
    const payload: DesignTokenJsonV2 = {
      $schema: SCHEMA_V2,
      exportedAt: new Date().toISOString(),
      tabs: {
        spacing: { raw: { '--zd-spacing-hgap-md': '50px' } },
      },
    };
    const { state } = deserialize(payload, { colorDefaults: COLOR_BASELINE });
    expect(state.color.palette).toEqual(COLOR_BASELINE.palette);
    expect(state.color.background).toBe(COLOR_BASELINE.background);
  });

  it('deserializes color.palette cssVar-keyed map correctly', () => {
    const payload: DesignTokenJsonV2 = {
      $schema: SCHEMA_V2,
      exportedAt: new Date().toISOString(),
      tabs: {
        color: {
          palette: { '--fixture-p3': '#aabbcc' },
        },
      },
    };
    const { state } = deserialize(payload, { colorDefaults: COLOR_BASELINE });
    expect(state.color.palette[3]).toBe('#aabbcc');
    // Other slots unchanged from baseline
    expect(state.color.palette[0]).toBe(COLOR_BASELINE.palette[0]);
  });

  it('deserializes color.semantic cssVar-keyed integer mappings', () => {
    const payload: DesignTokenJsonV2 = {
      $schema: SCHEMA_V2,
      exportedAt: new Date().toISOString(),
      tabs: {
        color: {
          semantic: { '--fixture-semantic-accent': 7 },
        },
      },
    };
    const { state, warnings } = deserialize(payload, { colorDefaults: COLOR_BASELINE });
    expect(warnings.filter((w) => !w.includes('accent'))).toHaveLength(0);
    // 'accent' key mapped via FIXTURE_CLUSTER.semanticCssNames
    expect(state.color.semanticMappings['accent']).toBe(7);
    // Other semantic keys unchanged
    expect(state.color.semanticMappings['muted']).toBe(COLOR_BASELINE.semanticMappings['muted']);
  });

  it('round-trips semantic active remap cleanly', () => {
    const color = cloneBaseline();
    color.semanticMappings.active = 5; // was 14
    const json = serialize(makeState({ color }), { colorDefaults: COLOR_BASELINE });
    const { state, unknownTokens } = deserialize(JSON.parse(JSON.stringify(json)), {
      colorDefaults: COLOR_BASELINE,
    });
    expect(unknownTokens).toEqual([]);
    expect(state.color.semanticMappings.active).toBe(5);
  });

  it('warns and skips unknown cssVar in color.semantic', () => {
    const payload: DesignTokenJsonV2 = {
      $schema: SCHEMA_V2,
      exportedAt: new Date().toISOString(),
      tabs: {
        color: {
          semantic: { '--unknown-semantic-role': 3 },
        },
      },
    };
    const { warnings } = deserialize(payload, { colorDefaults: COLOR_BASELINE });
    expect(warnings.some((w) => w.includes('--unknown-semantic-role'))).toBe(true);
  });

  it('respects cluster.paletteSize when generating neutral fallback baseline', () => {
    const SMALL_PALETTE_SIZE = 8;
    // Build a color tab with SMALL_PALETTE_SIZE palette items so the bridge
    // derives a cluster with paletteSize = SMALL_PALETTE_SIZE.
    const smallColorTab = {
      id: 'color' as const,
      label: 'Color',
      colorExtras: {
        id: 'small',
        baseRoles: FIXTURE_CLUSTER.baseRoles,
        baseDefaults: {},
        defaultShikiTheme: FIXTURE_CLUSTER.defaultShikiTheme,
        colorSchemes: FIXTURE_CLUSTER.colorSchemes,
        panelSettings: FIXTURE_CLUSTER.panelSettings,
      },
      tiers: [
        {
          id: 'palette',
          label: 'Palette',
          items: Array.from({ length: SMALL_PALETTE_SIZE }, (_, i) => ({
            id: `small-p${i}`,
            cssVar: `--small-p${i}`,
            label: `P${i}`,
            default: '#000000',
            type: { kind: 'color' as const },
          })),
        },
      ],
    };
    installFixturePanelConfig({
      tabs: [smallColorTab],
    });

    const { state } = deserialize({
      $schema: SCHEMA_V2,
      exportedAt: new Date().toISOString(),
      // No color block — forces the neutral baseline path
    });

    expect(state.color.palette).toHaveLength(SMALL_PALETTE_SIZE);
    expect(state.color.foreground).toBeLessThan(SMALL_PALETTE_SIZE);
    expect(state.color.selectionFg).toBeLessThan(SMALL_PALETTE_SIZE);
  });
});

// ---------------------------------------------------------------------------
// deserialize — v1 input (one-way migration)
// ---------------------------------------------------------------------------

describe('deserialize — v1 format (one-way migration)', () => {
  it('accepts v1 $schema and parses the flat color block', () => {
    const payload = {
      $schema: SCHEMA_V1,
      exportedAt: new Date().toISOString(),
      color: {
        palette: PALETTE_BASELINE,
        base: { cursor: 3 },
        semantic: { accent: 7 },
        shikiTheme: 'tokyo-night',
      },
    };
    const { state, unknownTokens, warnings } = deserialize(payload, {
      colorDefaults: COLOR_BASELINE,
    });
    expect(unknownTokens).toEqual([]);
    expect(warnings).toEqual([]);
    expect(state.color.palette).toEqual(PALETTE_BASELINE);
    expect(state.color.cursor).toBe(3);
    expect(state.color.semanticMappings.accent).toBe(7);
    expect(state.color.shikiTheme).toBe('tokyo-night');
  });

  it('accepts v1 spacing/typography/size as flat cssVar-keyed maps', () => {
    const payload = {
      $schema: SCHEMA_V1,
      exportedAt: new Date().toISOString(),
      spacing: { '--zd-spacing-hgap-md': '50px' },
      typography: { '--zd-font-base-size': '1.5rem' },
      size: { '--radius-lg': '12px' },
    };
    const { state, unknownTokens } = deserialize(payload, { colorDefaults: COLOR_BASELINE });
    expect(unknownTokens).toEqual([]);
    expect(state.spacing['hsp-md']).toBe('50px');
    expect(state.typography['text-base']).toBe('1.5rem');
    expect(state.size['radius-lg']).toBe('12px');
  });

  it('collects unknown cssVars from v1 payload into unknownTokens', () => {
    const payload = {
      $schema: SCHEMA_V1,
      exportedAt: new Date().toISOString(),
      spacing: { '--no-such-var': '1rem', '--zd-spacing-hgap-md': '50px' },
    };
    const { state, unknownTokens } = deserialize(payload, { colorDefaults: COLOR_BASELINE });
    expect(unknownTokens).toEqual(['--no-such-var']);
    expect(state.spacing['hsp-md']).toBe('50px');
  });

  it('warns-then-ignores palette arrays that are the wrong length (v1)', () => {
    const payload = {
      $schema: SCHEMA_V1,
      exportedAt: new Date().toISOString(),
      color: { palette: ['#111', '#222'] },
    };
    const { state, warnings } = deserialize(payload, { colorDefaults: COLOR_BASELINE });
    expect(state.color.palette).toEqual(COLOR_BASELINE.palette);
    expect(warnings.some((w) => w.includes('palette'))).toBe(true);
  });

  it('warns-then-ignores v1 palette where some entries are non-string', () => {
    const rawPalette: unknown[] = Array.from({ length: 16 }, (_, i) =>
      i === 2 ? 42 : `#${i.toString(16).padStart(2, '0').repeat(3)}`,
    );
    const payload = {
      $schema: SCHEMA_V1,
      exportedAt: new Date().toISOString(),
      color: { palette: rawPalette },
    };
    const { state, warnings } = deserialize(payload, { colorDefaults: COLOR_BASELINE });
    expect(state.color.palette).toEqual(COLOR_BASELINE.palette);
    expect(warnings.some((w) => w.includes('non-string'))).toBe(true);
  });

  it('throws schema-mismatch for an unrecognized schema (not v1 or v2)', () => {
    expect(() =>
      deserialize(
        { $schema: 'zudo-doc-design-tokens/v1', exportedAt: 'x' },
        { colorDefaults: COLOR_BASELINE },
      ),
    ).toThrowError(DesignTokenSchemaError);
  });

  it('F28: v1 import sanitizes garbage palette entry "18" → "#000000" (same as seed-time sanitizer, commit 8d54e07)', () => {
    // Regression guard for F28: imported palette values must pass through
    // normalizeSchemePaletteEntry so a stray non-color string like "18"
    // (the exact entry that triggered the seed-time fix in 8d54e07) becomes
    // '#000000' instead of leaking verbatim into a CSS custom property.
    const rawPalette: string[] = [...PALETTE_BASELINE];
    rawPalette[3] = '18'; // stray non-color string at index 3
    const payload = {
      $schema: SCHEMA_V1,
      exportedAt: new Date().toISOString(),
      color: { palette: rawPalette },
    };
    const { state } = deserialize(payload, { colorDefaults: COLOR_BASELINE });
    // Valid entries pass through unchanged.
    expect(state.color.palette[0]).toBe(PALETTE_BASELINE[0]);
    // Garbage entry is canonicalized to safe '#000000'.
    expect(state.color.palette[3]).toBe('#000000');
  });
});

// ---------------------------------------------------------------------------
// getDesignTokenSchema — returns host-configured schemaId
// ---------------------------------------------------------------------------

describe('getDesignTokenSchema', () => {
  it('returns the panelConfig.schemaId value (host-configured)', () => {
    // The fixture config is installed with schemaId 'zudo-design-tokens/v1'
    // (from FIXTURE_PANEL_CONFIG). This is the host-configured "expected" schema
    // for import validation UI. serialize() independently always emits SCHEMA_V2.
    expect(getDesignTokenSchema()).toBe('zudo-design-tokens/v1');
  });
});

// ---------------------------------------------------------------------------
// serialize / deserialize — generic (custom-id) tabs (issue #363)
// ---------------------------------------------------------------------------

/**
 * A host-coined GENERIC tab: id `ui-color` is NOT one of the reserved dedicated
 * slices (color/spacing/font/size), so its overrides live in `state.tabs['ui-color']`
 * and must round-trip under `tabs['ui-color'].raw`. Deliberately TWO tiers
 * (`brand` with two items, `surface` with one) so the round-trip exercises the
 * tier-aware reverse lookup — a single-tier fixture would not prove that items
 * are rebucketed into the correct tier on deserialize. Text-kind rows mirror the
 * #363 repro (custom text tabs that can't use the reserved `color` id).
 */
const GENERIC_TAB: TabConfig = {
  id: 'ui-color',
  label: 'UI Color',
  tiers: [
    {
      id: 'brand',
      label: 'Brand',
      items: [
        { id: 'brand-base', cssVar: '--ui-brand', label: 'brand', default: 'rebeccapurple', type: { kind: 'text' } },
        { id: 'brand-ink', cssVar: '--ui-brand-ink', label: 'brand ink', default: 'white', type: { kind: 'text' } },
      ],
    },
    {
      id: 'surface',
      label: 'Surface',
      items: [
        { id: 'surface-base', cssVar: '--ui-surface', label: 'surface', default: 'canvas', type: { kind: 'text' } },
      ],
    },
  ],
};

/** Install the fixture config WITH the generic `ui-color` tab appended. */
function installWithGenericTab(): void {
  installFixturePanelConfig({ tabs: [...FIXTURE_TABS, GENERIC_TAB] });
}

describe('serialize/deserialize — generic (custom-id) tabs', () => {
  beforeEach(() => {
    installWithGenericTab();
  });

  it('serialize emits tabs[<customId>].raw (cssVar-keyed) when a generic-tab item differs from its default', () => {
    const state = makeState({ tabs: { 'ui-color': { brand: { 'brand-base': '#ff0000' } } } });
    const json = serialize(state, { colorDefaults: COLOR_BASELINE });
    expect(json.tabs?.['ui-color']?.['raw']).toEqual({ '--ui-brand': '#ff0000' });
  });

  it('serialize drops a generic-tab override that equals the item default (diff-only)', () => {
    // 'rebeccapurple' is the declared default for --ui-brand, so it must NOT appear.
    const state = makeState({ tabs: { 'ui-color': { brand: { 'brand-base': 'rebeccapurple' } } } });
    const json = serialize(state, { colorDefaults: COLOR_BASELINE });
    expect(json.tabs?.['ui-color']).toBeUndefined();
  });

  it('serialize under includeDefaults dumps every editable generic-tab item', () => {
    const json = serialize(makeState(), { colorDefaults: COLOR_BASELINE, includeDefaults: true });
    expect(json.tabs?.['ui-color']?.['raw']).toEqual({
      '--ui-brand': 'rebeccapurple',
      '--ui-brand-ink': 'white',
      '--ui-surface': 'canvas',
    });
  });

  it('round-trips generic-tab overrides across MULTIPLE tiers (serialize → JSON → deserialize)', () => {
    const original = makeState({
      tabs: {
        'ui-color': {
          brand: { 'brand-base': '#ff0000', 'brand-ink': '#eeeeee' },
          surface: { 'surface-base': 'navy' },
        },
      },
    });

    const json = serialize(original, { colorDefaults: COLOR_BASELINE });
    // Sanity: every changed item lands under the single synthetic external `raw` key.
    expect(json.tabs?.['ui-color']?.['raw']).toEqual({
      '--ui-brand': '#ff0000',
      '--ui-brand-ink': '#eeeeee',
      '--ui-surface': 'navy',
    });

    const parsed = JSON.parse(JSON.stringify(json));
    const { state, unknownTokens } = deserialize(parsed, { colorDefaults: COLOR_BASELINE });

    expect(unknownTokens).toEqual([]);
    // Tier-aware reconstruction: items are rebucketed into their original tiers.
    expect(state.tabs).toEqual(original.tabs);
  });

  it('collects unknown cssVars inside a generic tab into unknownTokens', () => {
    const payload: DesignTokenJsonV2 = {
      $schema: SCHEMA_V2,
      exportedAt: new Date().toISOString(),
      tabs: {
        'ui-color': {
          raw: {
            '--ui-brand': '#ff0000',
            '--ui-bogus': 'nope',
          },
        },
      },
    };
    const { state, unknownTokens } = deserialize(payload, { colorDefaults: COLOR_BASELINE });
    expect(state.tabs).toEqual({ 'ui-color': { brand: { 'brand-base': '#ff0000' } } });
    expect(unknownTokens).toEqual(['--ui-bogus']);
  });

  it('ignores an unconfigured/foreign generic tab id present in the JSON (not admitted into state.tabs)', () => {
    const payload: DesignTokenJsonV2 = {
      $schema: SCHEMA_V2,
      exportedAt: new Date().toISOString(),
      tabs: {
        'not-a-configured-tab': { raw: { '--whatever': '1rem' } },
      },
    };
    const { state, unknownTokens } = deserialize(payload, { colorDefaults: COLOR_BASELINE });
    expect(state.tabs).toBeUndefined();
    // A foreign tab id is ignored wholesale — its cssVars are NOT reported as unknown tokens.
    expect(unknownTokens).toEqual([]);
  });

  it('no generic-tab overrides → tabs omitted on serialize, state.tabs undefined on deserialize (no regression)', () => {
    const json = serialize(makeState(), { colorDefaults: COLOR_BASELINE });
    expect(json.tabs?.['ui-color']).toBeUndefined();

    const { state } = deserialize(JSON.parse(JSON.stringify(json)), { colorDefaults: COLOR_BASELINE });
    expect(state.tabs).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// F29: serialize() must not drop 'bg'/'fg' semantic mappings
// ---------------------------------------------------------------------------

describe("F29 — serialize() emits 'bg'/'fg' semantic mappings as their resolved palette index", () => {
  it('emits resolved index in includeDefaults mode when mapping is the string "bg"', () => {
    // background = 0 in COLOR_BASELINE, so 'bg' resolves to 0.
    const color = cloneBaseline();
    (color.semanticMappings as Record<string, number | 'bg' | 'fg'>)['accent'] = 'bg';
    const json = serialize(makeState({ color }), {
      colorDefaults: COLOR_BASELINE,
      includeDefaults: true,
    });
    const semMap = json.tabs?.['color']?.['semantic'] as Record<string, number> | undefined;
    expect(semMap).toBeDefined();
    // 'bg' resolves to color.background (= 0)
    expect(semMap!['--fixture-semantic-accent']).toBe(0);
  });

  it('emits resolved index in includeDefaults mode when mapping is the string "fg"', () => {
    // foreground = 15 in COLOR_BASELINE, so 'fg' resolves to 15.
    const color = cloneBaseline();
    (color.semanticMappings as Record<string, number | 'bg' | 'fg'>)['accent'] = 'fg';
    const json = serialize(makeState({ color }), {
      colorDefaults: COLOR_BASELINE,
      includeDefaults: true,
    });
    const semMap = json.tabs?.['color']?.['semantic'] as Record<string, number> | undefined;
    expect(semMap).toBeDefined();
    // 'fg' resolves to color.foreground (= 15)
    expect(semMap!['--fixture-semantic-accent']).toBe(15);
  });

  it('emits resolved index in diff-only mode when "bg" mapping differs from baseline number', () => {
    // Baseline accent = 5 (number). State accent = 'bg' (resolves to 0).
    // 0 !== 5 so it should appear in diff output.
    const color = cloneBaseline();
    (color.semanticMappings as Record<string, number | 'bg' | 'fg'>)['accent'] = 'bg';
    const json = serialize(makeState({ color }), { colorDefaults: COLOR_BASELINE });
    const semMap = json.tabs?.['color']?.['semantic'] as Record<string, number> | undefined;
    expect(semMap).toBeDefined();
    expect(semMap!['--fixture-semantic-accent']).toBe(0);
  });

  it('round-trip: v1 doc with semantic "bg" → deserialize → serialize(includeDefaults) → deserialize preserves effective index', () => {
    // Construct a v1 payload with accent mapped to 'bg'.
    const v1Payload = {
      $schema: SCHEMA_V1,
      exportedAt: new Date().toISOString(),
      color: {
        palette: COLOR_BASELINE.palette,
        base: { bg: 0, fg: 15, cursor: 6, 'sel-bg': 0, 'sel-fg': 15 },
        semantic: { accent: 'bg' }, // 'bg' alias → resolves to index 0
      },
    };

    // Step 1: deserialize v1 — accent should be 'bg' in state
    const { state: step1State } = deserialize(v1Payload, { colorDefaults: COLOR_BASELINE });
    expect(step1State.color.semanticMappings['accent']).toBe('bg');

    // Step 2: serialize with includeDefaults — should emit the resolved index (0)
    const v2Json = serialize(step1State, {
      colorDefaults: COLOR_BASELINE,
      includeDefaults: true,
    });
    const semMap = v2Json.tabs?.['color']?.['semantic'] as Record<string, number> | undefined;
    expect(semMap?.['--fixture-semantic-accent']).toBe(0);

    // Step 3: deserialize the v2 output — accent should resolve to 0 (number)
    const { state: step3State } = deserialize(v2Json, { colorDefaults: COLOR_BASELINE });
    // After the round-trip the mapping is now a number (0), not 'bg'.
    // Either form that resolves to 0 is acceptable, but the v2 format emits numbers.
    const resolvedAccent = step3State.color.semanticMappings['accent'];
    expect(typeof resolvedAccent === 'number' ? resolvedAccent : -1).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// SCHEMA_V3 — widened color.semantic leaf for SemanticValue variants (#462)
// ---------------------------------------------------------------------------

describe('SCHEMA_V3 — serialize/deserialize round-trips for every SemanticValue variant', () => {
  it('a state whose semantic mappings are all plain indices still emits SCHEMA_V2 (no regression)', () => {
    const json = serialize(makeState(), { colorDefaults: COLOR_BASELINE });
    expect(json.$schema).toBe(SCHEMA_V2);
  });

  it('round-trips an index mapping (number) unchanged and keeps $schema at V2', () => {
    const color = cloneBaseline();
    color.semanticMappings.accent = 9; // was 5
    const json = serialize(makeState({ color }), { colorDefaults: COLOR_BASELINE });
    expect(json.$schema).toBe(SCHEMA_V2);
    expect(json.tabs?.['color']?.['semantic']).toEqual({ '--fixture-semantic-accent': 9 });

    const { state, unknownTokens, warnings } = deserialize(JSON.parse(JSON.stringify(json)), {
      colorDefaults: COLOR_BASELINE,
    });
    expect(unknownTokens).toEqual([]);
    expect(warnings).toEqual([]);
    expect(state.color.semanticMappings.accent).toBe(9);
  });

  it('round-trips a { literal: string } mapping, upgrading $schema to SCHEMA_V3', () => {
    const color = cloneBaseline();
    color.semanticMappings.accent = { literal: '#ff8800' };
    const json = serialize(makeState({ color }), { colorDefaults: COLOR_BASELINE }) as DesignTokenJsonV3;
    expect(json.$schema).toBe(SCHEMA_V3);
    expect(json.tabs?.['color']?.['semantic']).toEqual({
      '--fixture-semantic-accent': { literal: '#ff8800' },
    });

    const { state, unknownTokens, warnings } = deserialize(JSON.parse(JSON.stringify(json)), {
      colorDefaults: COLOR_BASELINE,
    });
    expect(unknownTokens).toEqual([]);
    expect(warnings).toEqual([]);
    expect(state.color.semanticMappings.accent).toEqual({ literal: '#ff8800' });
  });

  it('round-trips a { literal: { light, dark } } per-mode mapping, upgrading $schema to SCHEMA_V3', () => {
    const color = cloneBaseline();
    const perMode: SemanticValue = { literal: { light: '#111111', dark: '#eeeeee' } };
    color.semanticMappings.muted = perMode;
    const json = serialize(makeState({ color }), { colorDefaults: COLOR_BASELINE }) as DesignTokenJsonV3;
    expect(json.$schema).toBe(SCHEMA_V3);
    expect(json.tabs?.['color']?.['semantic']).toEqual({
      '--fixture-semantic-muted': { literal: { light: '#111111', dark: '#eeeeee' } },
    });

    const { state, unknownTokens, warnings } = deserialize(JSON.parse(JSON.stringify(json)), {
      colorDefaults: COLOR_BASELINE,
    });
    expect(unknownTokens).toEqual([]);
    expect(warnings).toEqual([]);
    expect(state.color.semanticMappings.muted).toEqual(perMode);
  });

  it('round-trips a { ref } mapping, upgrading $schema to SCHEMA_V3', () => {
    // 'color'/'palette'/'fixture-p3' is a real target in FIXTURE_TABS, so this
    // ref resolves cleanly (no stale-ref warning) — see the S5 describe block
    // below for the warn-on-missing-target behavior.
    const color = cloneBaseline();
    const ref: SemanticValue = { ref: { tab: 'color', tier: 'palette', item: 'fixture-p3' } };
    color.semanticMappings.active = ref;
    const json = serialize(makeState({ color }), { colorDefaults: COLOR_BASELINE }) as DesignTokenJsonV3;
    expect(json.$schema).toBe(SCHEMA_V3);
    expect(json.tabs?.['color']?.['semantic']).toEqual({
      '--fixture-semantic-active': { ref: { tab: 'color', tier: 'palette', item: 'fixture-p3' } },
    });

    const { state, unknownTokens, warnings } = deserialize(JSON.parse(JSON.stringify(json)), {
      colorDefaults: COLOR_BASELINE,
    });
    expect(unknownTokens).toEqual([]);
    expect(warnings).toEqual([]);
    expect(state.color.semanticMappings.active).toEqual(ref);
  });

  it('round-trips a { ref } mapping without an optional tab field', () => {
    // Intra-tab ref (no `tab`) resolving within the 'color' tab's own
    // 'palette' tier — a real target, so no stale-ref warning.
    const color = cloneBaseline();
    const ref: SemanticValue = { ref: { tier: 'palette', item: 'fixture-p3' } };
    color.semanticMappings.active = ref;
    const json = serialize(makeState({ color }), { colorDefaults: COLOR_BASELINE });
    expect(json.$schema).toBe(SCHEMA_V3);

    const { state } = deserialize(JSON.parse(JSON.stringify(json)), { colorDefaults: COLOR_BASELINE });
    expect(state.color.semanticMappings.active).toEqual(ref);
  });

  it('upgrades to SCHEMA_V3 when only ONE of several semantic mappings is an object variant', () => {
    const color = cloneBaseline();
    color.semanticMappings.accent = 7; // still an index mapping
    color.semanticMappings.muted = { literal: '#ff8800' };
    const json = serialize(makeState({ color }), { colorDefaults: COLOR_BASELINE });
    expect(json.$schema).toBe(SCHEMA_V3);
    expect(json.tabs?.['color']?.['semantic']).toEqual({
      '--fixture-semantic-accent': 7,
      '--fixture-semantic-muted': { literal: '#ff8800' },
    });
  });

  it('warns and keeps baseline for a malformed { literal } value (missing string/light+dark)', () => {
    const payload = {
      $schema: SCHEMA_V3,
      exportedAt: new Date().toISOString(),
      tabs: {
        color: {
          semantic: { '--fixture-semantic-accent': { literal: 42 } },
        },
      },
    };
    const { state, warnings } = deserialize(payload, { colorDefaults: COLOR_BASELINE });
    expect(state.color.semanticMappings.accent).toBe(COLOR_BASELINE.semanticMappings.accent);
    expect(warnings.some((w) => w.includes('accent'))).toBe(true);
  });

  it('warns and keeps baseline for a malformed { ref } value (missing tier/item)', () => {
    const payload = {
      $schema: SCHEMA_V3,
      exportedAt: new Date().toISOString(),
      tabs: {
        color: {
          semantic: { '--fixture-semantic-active': { ref: { tab: 'brand' } } },
        },
      },
    };
    const { state, warnings } = deserialize(payload, { colorDefaults: COLOR_BASELINE });
    expect(state.color.semanticMappings.active).toBe(COLOR_BASELINE.semanticMappings.active);
    expect(warnings.some((w) => w.includes('active'))).toBe(true);
  });

  it('SCHEMA_V3 still deserializes spacing/font/size/generic tabs identically to SCHEMA_V2', () => {
    const original = makeState({
      spacing: { 'hsp-md': '50px' },
      typography: { 'text-base': '1.3rem' },
      size: { 'radius-lg': '12px' },
    });
    original.color.semanticMappings.accent = { literal: '#ff8800' }; // forces V3 upgrade

    const json = serialize(original, { colorDefaults: COLOR_BASELINE });
    expect(json.$schema).toBe(SCHEMA_V3);
    const { state, unknownTokens } = deserialize(JSON.parse(JSON.stringify(json)), {
      colorDefaults: COLOR_BASELINE,
    });
    expect(unknownTokens).toEqual([]);
    expect(state.spacing).toEqual(original.spacing);
    expect(state.typography).toEqual(original.typography);
    expect(state.size).toEqual(original.size);
  });

  it('a legacy SCHEMA_V2 document (index-only color.semantic) still hydrates losslessly under the widened deserializer', () => {
    // A pre-#462 export tagged $schema v2 — every semantic value is a plain
    // palette-index integer. Must parse identically whether routed through
    // deserializeV2 (this doc's own tag) — this is the "keep SCHEMA_V2
    // deserialize lossless" guarantee from #462.
    const legacyV2Doc: DesignTokenJsonV2 = {
      $schema: SCHEMA_V2,
      exportedAt: new Date().toISOString(),
      tabs: {
        color: {
          semantic: { '--fixture-semantic-accent': 3, '--fixture-semantic-muted': 9 },
        },
        spacing: { raw: { '--zd-spacing-hgap-md': '60px' } },
      },
    };
    const { state, unknownTokens, warnings } = deserialize(legacyV2Doc, {
      colorDefaults: COLOR_BASELINE,
    });
    expect(unknownTokens).toEqual([]);
    expect(warnings).toEqual([]);
    expect(state.color.semanticMappings.accent).toBe(3);
    expect(state.color.semanticMappings.muted).toBe(9);
    expect(state.color.semanticMappings.active).toBe(COLOR_BASELINE.semanticMappings.active);
    expect(state.spacing['hsp-md']).toBe('60px');
  });
});

// ---------------------------------------------------------------------------
// S5 — serde robustness (#459 audit): order-independent diff compare,
// stale-ref import warning, integer-only V3 index leaves.
// ---------------------------------------------------------------------------

describe('S5 — order-independent semantic diff compare (JSON.stringify key-order bug)', () => {
  it('does not emit a { ref } mapping as changed when only its property insertion order differs from baseline', () => {
    const baseline = cloneBaseline();
    baseline.semanticMappings.active = { ref: { tier: 'palette', item: 'fixture-p3' } };

    const color = cloneBaseline();
    // Structurally identical to the baseline ref above, just built with a
    // different key insertion order (mirrors baseline built by
    // parseSemanticExternalValue's `{tier, item, tab}` vs a UI-produced
    // `{tab, tier, item}}`).
    color.semanticMappings.active = { ref: { item: 'fixture-p3', tier: 'palette' } };

    const json = serialize(makeState({ color }), { colorDefaults: baseline });
    const semMap = json.tabs?.['color']?.['semantic'] as Record<string, unknown> | undefined;
    expect(semMap?.['--fixture-semantic-active']).toBeUndefined();
  });

  it('still emits a { ref } mapping that is genuinely changed from baseline', () => {
    const baseline = cloneBaseline();
    baseline.semanticMappings.active = { ref: { tier: 'palette', item: 'fixture-p3' } };

    const color = cloneBaseline();
    color.semanticMappings.active = { ref: { tier: 'palette', item: 'fixture-p9' } };

    const json = serialize(makeState({ color }), { colorDefaults: baseline });
    expect(json.tabs?.['color']?.['semantic']).toEqual({
      '--fixture-semantic-active': { ref: { tier: 'palette', item: 'fixture-p9' } },
    });
  });
});

describe('S5 — stale { ref } target produces a warning on import (#459 audit)', () => {
  it('warns when a { ref } targets a tab/tier/item absent from the current config, but keeps the parsed ref', () => {
    const payload = {
      $schema: SCHEMA_V3,
      exportedAt: new Date().toISOString(),
      tabs: {
        color: {
          semantic: {
            // No 'ramp' tier exists on any configured tab — a stale reference
            // (e.g. a renamed ramp item, or a host that dropped a tab).
            '--fixture-semantic-active': { ref: { tier: 'ramp', item: 'brand-500' } },
          },
        },
      },
    };
    const { state, warnings } = deserialize(payload, { colorDefaults: COLOR_BASELINE });
    // The value is preserved verbatim rather than falling back to baseline —
    // the apply path already skips an unresolvable ref gracefully.
    expect(state.color.semanticMappings.active).toEqual({ ref: { tier: 'ramp', item: 'brand-500' } });
    expect(
      warnings.some((w) => w.includes('active') && w.includes('ramp') && w.includes('brand-500')),
    ).toBe(true);
  });

  it('does not warn for a { ref } targeting a real tab/tier/item', () => {
    const payload = {
      $schema: SCHEMA_V3,
      exportedAt: new Date().toISOString(),
      tabs: {
        color: {
          semantic: {
            '--fixture-semantic-active': { ref: { tier: 'palette', item: 'fixture-p3' } },
          },
        },
      },
    };
    const { state, warnings } = deserialize(payload, { colorDefaults: COLOR_BASELINE });
    expect(state.color.semanticMappings.active).toEqual({ ref: { tier: 'palette', item: 'fixture-p3' } });
    expect(warnings).toEqual([]);
  });
});

describe('S5 — V3 index leaves require an in-range integer (#459 audit)', () => {
  it('warns and keeps baseline for a non-integer index leaf (2.5)', () => {
    const payload = {
      $schema: SCHEMA_V3,
      exportedAt: new Date().toISOString(),
      tabs: { color: { semantic: { '--fixture-semantic-accent': 2.5 } } },
    };
    const { state, warnings } = deserialize(payload, { colorDefaults: COLOR_BASELINE });
    expect(state.color.semanticMappings.accent).toBe(COLOR_BASELINE.semanticMappings.accent);
    expect(warnings.some((w) => w.includes('accent'))).toBe(true);
  });

  it('warns and keeps baseline for an out-of-range integer index leaf', () => {
    // FIXTURE_CLUSTER.paletteSize is 16, so 99 is out of range.
    const payload = {
      $schema: SCHEMA_V3,
      exportedAt: new Date().toISOString(),
      tabs: { color: { semantic: { '--fixture-semantic-accent': 99 } } },
    };
    const { state, warnings } = deserialize(payload, { colorDefaults: COLOR_BASELINE });
    expect(state.color.semanticMappings.accent).toBe(COLOR_BASELINE.semanticMappings.accent);
    expect(warnings.some((w) => w.includes('accent'))).toBe(true);
  });

  it('still accepts a valid in-range integer index leaf (no regression)', () => {
    const payload = {
      $schema: SCHEMA_V3,
      exportedAt: new Date().toISOString(),
      tabs: { color: { semantic: { '--fixture-semantic-accent': 7 } } },
    };
    const { state, warnings } = deserialize(payload, { colorDefaults: COLOR_BASELINE });
    expect(state.color.semanticMappings.accent).toBe(7);
    expect(warnings).toEqual([]);
  });
});

describe('S5 — composed: stale-ref V3 import + applyFullState keeps the stylesheet default', () => {
  it('a stale { ref } import surfaces a warning AND is skipped at apply time (token keeps its stylesheet default)', () => {
    const payload = {
      $schema: SCHEMA_V3,
      exportedAt: new Date().toISOString(),
      tabs: {
        color: {
          semantic: {
            '--fixture-semantic-active': { ref: { tier: 'ramp', item: 'brand-500' } },
          },
        },
      },
    };
    const { state, warnings } = deserialize(payload, { colorDefaults: COLOR_BASELINE });
    expect(warnings.some((w) => w.includes('active'))).toBe(true);

    // An applySink spy avoids any dependency on a real DOM/jsdom environment
    // (design-token-serde.test.ts runs under the plain "node" vitest project).
    const applyCalls: Array<ReadonlyArray<readonly [string, string]>> = [];
    installFixturePanelConfig({
      applySink: {
        apply(pairs) {
          applyCalls.push(pairs);
        },
        clear() {
          // no-op — this test only asserts on what was applied.
        },
      },
    });

    applyFullState(state);

    const appliedNames = applyCalls.flat().map(([name]) => name);
    // resolveSemanticCssValue's { ref } branch throws inside
    // resolveRefToCssVar (no 'ramp' tier exists), returns null, and the apply
    // path skips a null — so the token is never written and keeps whatever
    // its stylesheet declares.
    expect(appliedNames).not.toContain('--fixture-semantic-active');
  });
});
