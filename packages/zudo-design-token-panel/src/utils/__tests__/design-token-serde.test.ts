import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  DesignTokenSchemaError,
  deserialize,
  getDesignTokenSchema,
  serialize,
  type DesignTokenJson,
} from '../design-token-serde';
import type { ColorTweakState, TweakState } from '../../state/tweak-state';
import { __resetPanelConfigForTests } from '../../config/panel-config';
import { installFixturePanelConfig } from '../../__tests__/_test-helpers';

beforeEach(() => {
  installFixturePanelConfig();
});

/**
 * Ported from zudo-doc's `src/utils/__tests__/design-token-serde.test.ts`.
 * Adaptations for zmod2:
 *   - `font` slice renamed to `typography` to match the Sub 1 envelope.
 *   - `$schema` value is `zudo-design-tokens/v1` (asserted via the exported
 *     constant, not a hard-coded string).
 *   - Sub 6 retargeted the spacing/font manifest at Tier-1 `--zd-*` tokens:
 *     `--spacing-hsp-md` → `--zd-spacing-hgap-md` (default `40px`),
 *     `--text-body` → `--zd-font-base-size` (id also renamed `text-body` →
 *     `text-base`, default `1.4rem`). `--radius-lg` is unchanged.
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
    surface: 0,
    muted: 8,
    accent: 5,
    accentHover: 14,
    codeBg: 10,
    codeFg: 11,
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

describe('serialize', () => {
  it('always includes $schema and exportedAt', () => {
    const state = makeState();
    const json = serialize(state, { colorDefaults: COLOR_BASELINE });
    expect(json.$schema).toBe(getDesignTokenSchema());
    expect(typeof json.exportedAt).toBe('string');
    expect(() => new Date(json.exportedAt).toISOString()).not.toThrow();
  });

  it('emits nothing in color / spacing / typography / size when state matches baseline', () => {
    const json = serialize(makeState(), { colorDefaults: COLOR_BASELINE });
    expect(json.color).toBeUndefined();
    expect(json.spacing).toBeUndefined();
    expect(json.typography).toBeUndefined();
    expect(json.size).toBeUndefined();
  });

  it('emits only changed spacing tokens by default (diff-only)', () => {
    const state = makeState({ spacing: { 'hsp-md': '50px' } });
    const json = serialize(state, { colorDefaults: COLOR_BASELINE });
    expect(json.spacing).toEqual({ '--zd-spacing-hgap-md': '50px' });
  });

  it('drops spacing overrides that match the manifest default', () => {
    // 40px is the declared default for --zd-spacing-hgap-md, so it should
    // NOT appear in diff-only output.
    const state = makeState({ spacing: { 'hsp-md': '40px' } });
    const json = serialize(state, { colorDefaults: COLOR_BASELINE });
    expect(json.spacing).toBeUndefined();
  });

  it('emits full token blocks when includeDefaults=true', () => {
    const json = serialize(makeState(), {
      colorDefaults: COLOR_BASELINE,
      includeDefaults: true,
    });
    expect(json.color).toBeDefined();
    expect(json.color?.palette).toHaveLength(16);
    expect(json.spacing?.['--zd-spacing-hgap-md']).toBe('40px');
    expect(json.typography?.['--zd-font-base-size']).toBe('1.4rem');
    expect(json.size?.['--radius-lg']).toBe('8px');
  });

  it('emits the palette when any hex differs', () => {
    const color = cloneBaseline();
    color.palette[5] = '#ff00ff';
    const json = serialize(makeState({ color }), {
      colorDefaults: COLOR_BASELINE,
    });
    expect(json.color?.palette).toHaveLength(16);
    expect(json.color?.palette?.[5]).toBe('#ff00ff');
  });

  it('emits only differing base-color fields', () => {
    const color = cloneBaseline();
    color.cursor = 9;
    const json = serialize(makeState({ color }), {
      colorDefaults: COLOR_BASELINE,
    });
    expect(json.color?.base).toEqual({ cursor: 9 });
    expect(json.color?.palette).toBeUndefined();
  });

  it('emits only differing semantic mappings', () => {
    const color = cloneBaseline();
    color.semanticMappings.accent = 7;
    const json = serialize(makeState({ color }), {
      colorDefaults: COLOR_BASELINE,
    });
    expect(json.color?.semantic).toEqual({ accent: 7 });
  });

  it('emits an active remap and round-trips it cleanly through deserialize', () => {
    const color = cloneBaseline();
    color.semanticMappings.active = 5; // was 14
    const json = serialize(makeState({ color }), {
      colorDefaults: COLOR_BASELINE,
    });
    expect(json.color?.semantic).toEqual({ active: 5 });

    const text = JSON.stringify(json);
    const parsed = JSON.parse(text);
    const { state, unknownTokens } = deserialize(parsed, {
      colorDefaults: COLOR_BASELINE,
    });
    expect(unknownTokens).toEqual([]);
    expect(state.color.semanticMappings.active).toBe(5);
  });

  it('emits shikiTheme only when it differs', () => {
    const color = cloneBaseline();
    color.shikiTheme = 'vitesse-dark';
    const json = serialize(makeState({ color }), {
      colorDefaults: COLOR_BASELINE,
    });
    expect(json.color?.shikiTheme).toBe('vitesse-dark');
  });
});

describe('deserialize', () => {
  it('round-trips a diff-only export cleanly', () => {
    const original = makeState({
      spacing: { 'hsp-md': '50px', 'vsp-sm': '24px' },
      typography: { 'text-base': '1.3rem' },
      size: { 'radius-lg': '12px' },
    });
    original.color.cursor = 9;

    const json = serialize(original, { colorDefaults: COLOR_BASELINE });
    const text = JSON.stringify(json);
    const parsed = JSON.parse(text);
    const { state, unknownTokens } = deserialize(parsed, {
      colorDefaults: COLOR_BASELINE,
    });

    expect(unknownTokens).toEqual([]);
    expect(state.spacing).toEqual(original.spacing);
    expect(state.typography).toEqual(original.typography);
    expect(state.size).toEqual(original.size);
    expect(state.color.cursor).toBe(9);
    expect(state.color.palette).toEqual(COLOR_BASELINE.palette);
  });

  it('collects unknown CSS var names in unknownTokens', () => {
    const payload: DesignTokenJson = {
      $schema: getDesignTokenSchema(),
      exportedAt: new Date().toISOString(),
      spacing: {
        '--zd-spacing-hgap-md': '50px',
        '--spacing-nope': '1rem',
      },
      size: {
        '--radius-imaginary': '20px',
      },
    };
    const { state, unknownTokens } = deserialize(payload, {
      colorDefaults: COLOR_BASELINE,
    });
    expect(state.spacing).toEqual({ 'hsp-md': '50px' });
    expect(state.size).toEqual({});
    expect(unknownTokens.sort()).toEqual(['--radius-imaginary', '--spacing-nope'].sort());
  });

  it('throws schema-mismatch when $schema is wrong', () => {
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

  it('falls back to baseline for absent color fields', () => {
    const payload: DesignTokenJson = {
      $schema: getDesignTokenSchema(),
      exportedAt: new Date().toISOString(),
      color: { base: { cursor: 3 } },
    };
    const { state } = deserialize(payload, { colorDefaults: COLOR_BASELINE });
    expect(state.color.cursor).toBe(3);
    expect(state.color.background).toBe(COLOR_BASELINE.background);
    expect(state.color.palette).toEqual(COLOR_BASELINE.palette);
    expect(state.color.shikiTheme).toBe(COLOR_BASELINE.shikiTheme);
  });

  it("warns-then-ignores palette arrays that aren't exactly 16 long", () => {
    const payload: DesignTokenJson = {
      $schema: getDesignTokenSchema(),
      exportedAt: new Date().toISOString(),
      color: { palette: ['#111', '#222'] },
    };
    const { state, warnings } = deserialize(payload, {
      colorDefaults: COLOR_BASELINE,
    });
    expect(state.color.palette).toEqual(COLOR_BASELINE.palette);
    expect(warnings.some((w) => w.includes('palette'))).toBe(true);
  });

  it("warns when palette has 16 entries but some aren't strings", () => {
    // Craft a 16-long array whose 3rd slot is a number — previously this fell
    // back silently because the length check was looser.
    const rawPalette: unknown[] = Array.from({ length: 16 }, (_, i) =>
      i === 2 ? 42 : `#${i.toString(16).padStart(2, '0').repeat(3)}`,
    );
    const payload = {
      $schema: getDesignTokenSchema(),
      exportedAt: new Date().toISOString(),
      color: { palette: rawPalette },
    };
    const { state, warnings } = deserialize(payload, {
      colorDefaults: COLOR_BASELINE,
    });
    expect(state.color.palette).toEqual(COLOR_BASELINE.palette);
    expect(warnings.some((w) => w.includes('non-string'))).toBe(true);
  });
});
