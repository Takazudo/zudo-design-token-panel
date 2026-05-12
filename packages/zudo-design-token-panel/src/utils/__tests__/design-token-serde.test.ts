import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  DesignTokenSchemaError,
  SCHEMA_V1,
  SCHEMA_V2,
  deserialize,
  getDesignTokenSchema,
  serialize,
  type DesignTokenJsonV2,
} from '../design-token-serde';
import type { ColorTweakState, TweakState } from '../../state/tweak-state';
import { __resetPanelConfigForTests } from '../../config/panel-config';
import { installFixturePanelConfig, FIXTURE_CLUSTER } from '../../__tests__/_test-helpers';

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
    installFixturePanelConfig({
      colorCluster: {
        ...FIXTURE_CLUSTER,
        id: 'small',
        paletteSize: SMALL_PALETTE_SIZE,
        paletteCssVarTemplate: '--small-p{n}',
        semanticDefaults: {},
        semanticCssNames: {},
        baseDefaults: {},
      },
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
