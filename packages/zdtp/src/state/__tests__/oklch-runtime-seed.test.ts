// @vitest-environment jsdom
/**
 * Runtime OKLCH preservation (issue #435 / #433 part 2).
 *
 * `state.palette` must carry RAW color strings (hex OR `oklch(...)`) instead of
 * being eagerly clipped to sRGB hex on seed. The jsdom environment here is
 * load-bearing: jsdom's canvas `getContext('2d')` returns null, so the
 * `cssColorToHex` canvas round-trip is unavailable and the OLD seed code
 * (`scheme.palette.map(cssColorToHex)`) collapsed every `oklch()` entry to
 * '#000000'. These tests pin the post-fix behavior: oklch survives verbatim.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  colorRefToIndex,
  getActivePrimaryCluster,
  getStorageKeyV3,
  initColorFromSchemeData,
  loadPersistedState,
  type ColorTweakState,
  type StorageLike,
} from '../tweak-state';
import type { ColorScheme } from '../../config/color-schemes';
import { __resetPanelConfigForTests } from '../../config/panel-config';
import { installFixturePanelConfig } from '../../__tests__/_test-helpers';

/** 16 distinct oklch palette entries; index 15 is wide-gamut (out of sRGB). */
const oklchPalette: string[] = [
  'oklch(0.20 0.02 0)', // 0
  'oklch(0.30 0.04 30)', // 1
  'oklch(0.50 0.12 250)', // 2
  'oklch(0.40 0.06 90)', // 3
  'oklch(0.55 0.10 140)', // 4
  'oklch(0.60 0.14 200)', // 5
  'oklch(0.65 0.18 300)', // 6
  'oklch(0.70 0.20 350)', // 7
  'oklch(0.45 0.08 60)', // 8
  'oklch(0.50 0.10 120)', // 9
  'oklch(0.58 0.16 180)', // 10
  'oklch(0.62 0.12 220)', // 11
  'oklch(0.68 0.22 320)', // 12
  'oklch(0.72 0.24 40)', // 13
  'oklch(0.75 0.15 160)', // 14
  'oklch(0.70 0.37 30)', // 15 — wide-gamut chroma, outside sRGB
];

const hexPalette16 = Array.from(
  { length: 16 },
  (_, i) => `#${i.toString(16).padStart(2, '0').repeat(3)}`,
);

function makeOklchScheme(overrides: Partial<ColorScheme> = {}): ColorScheme {
  return {
    background: 0,
    foreground: 15,
    cursor: 6,
    selectionBg: 0,
    selectionFg: 15,
    palette: oklchPalette as ColorScheme['palette'],
    ...overrides,
  };
}

function makeStorage(initial: Record<string, string> = {}): StorageLike & {
  entries: Record<string, string>;
} {
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

let warnSpy: ReturnType<typeof vi.spyOn>;

beforeEach(() => {
  installFixturePanelConfig();
  warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
});

afterEach(() => {
  __resetPanelConfigForTests();
  warnSpy.mockRestore();
});

describe('initColorFromSchemeData — raw OKLCH seed (no eager hex clip)', () => {
  it('stores oklch palette entries VERBATIM (no hex, no #000000)', () => {
    const cluster = getActivePrimaryCluster();
    const state = initColorFromSchemeData(makeOklchScheme(), cluster);

    expect(state.palette).toEqual(oklchPalette);
    // Defensive: nothing got clipped to hex and nothing collapsed to black.
    for (const entry of state.palette) {
      expect(entry.startsWith('#')).toBe(false);
      expect(entry).not.toBe('#000000');
    }
  });

  it('seeds a wide-gamut oklch() entry under jsdom without collapsing to #000000', () => {
    // jsdom canvas can't parse oklch — the OLD map(cssColorToHex) would have
    // turned the wide-gamut p15 into '#000000'. The raw value must survive.
    const cluster = getActivePrimaryCluster();
    const state = initColorFromSchemeData(makeOklchScheme(), cluster);

    expect(state.palette[15]).toBe('oklch(0.70 0.37 30)');
    expect(state.palette.includes('#000000')).toBe(false);
  });

  it('returns a fresh palette array (not aliased to scheme.palette)', () => {
    const scheme = makeOklchScheme();
    const state = initColorFromSchemeData(scheme, getActivePrimaryCluster());
    expect(state.palette).not.toBe(scheme.palette);
    expect(state.palette).toEqual([...scheme.palette]);
  });

  it('resolves an oklch base ref to the correct palette index during seed', () => {
    // background ref is the same color as p2 but serialized differently — it
    // must resolve to index 2 via the OKLCH-aware match, not collapse to 0.
    const state = initColorFromSchemeData(
      makeOklchScheme({ background: 'oklch(0.500 0.1200 250.00)' }),
      getActivePrimaryCluster(),
    );
    expect(state.background).toBe(2);
  });

  it('re-seeds verbatim through the Scheme-dropdown path (default cluster)', () => {
    // Mirrors color-tab.tsx:548 handleLoadPreset → initColorFromSchemeData(scheme)
    // with no explicit cluster (resolves getActivePrimaryCluster()).
    const state = initColorFromSchemeData(makeOklchScheme());
    expect(state.palette).toEqual(oklchPalette);
    expect(state.palette.includes('#000000')).toBe(false);
  });
});

describe('colorRefToIndex — OKLCH format-tolerance + alpha-awareness', () => {
  it('matches a differently-serialized oklch ref by canonical epsilon', () => {
    const idx = colorRefToIndex('oklch(0.500 0.1200 250.00)', oklchPalette, 0);
    expect(idx).toBe(2);
  });

  it('disambiguates same-L/C/H but DIFFERENT alpha (alpha included in epsilon)', () => {
    // Two slots differ only in alpha; refs must bind to the matching alpha,
    // never collapse to the wrong slot.
    const palette = [
      'oklch(0.60 0.10 120)', // 0 — opaque
      'oklch(0.60 0.10 120 / 0.5)', // 1 — 50% alpha
    ];
    // Differently-serialized opaque ref → slot 0 (a=100), not slot 1 (a=50).
    expect(colorRefToIndex('oklch(0.600 0.100 120.0)', palette, 9)).toBe(0);
    // Differently-serialized 50%-alpha ref → slot 1, not slot 0.
    expect(colorRefToIndex('oklch(0.600 0.100 120.0 / 0.50)', palette, 9)).toBe(1);
  });

  it('uses a circular hue delta so ~360° and ~0° are adjacent', () => {
    const palette = ['oklch(0.6 0.1 0.0003)', 'oklch(0.5 0.2 200)'];
    expect(colorRefToIndex('oklch(0.6 0.1 359.9999)', palette, 9)).toBe(0);
  });

  it('does NOT merge genuinely different oklch colors', () => {
    const palette = ['oklch(0.6 0.1 120)', 'oklch(0.601 0.1 120)'];
    expect(colorRefToIndex('oklch(0.601 0.1 120)', palette, 9)).toBe(1);
    expect(colorRefToIndex('oklch(0.6 0.1 120)', palette, 9)).toBe(0);
  });
});

describe('colorRefToIndex — existing hex/rgb behavior unchanged', () => {
  it('returns a numeric ref as-is', () => {
    expect(colorRefToIndex(7, hexPalette16, 0)).toBe(7);
  });

  it('exact-matches a raw hex ref', () => {
    expect(colorRefToIndex('#0a0a0a', hexPalette16, 0)).toBe(10);
  });

  it('matches equivalent notations via canonical hex (rgba vs #rrggbbaa)', () => {
    const palette = ['#ffffff', '#ff000080', '#000000'];
    expect(colorRefToIndex('rgba(255,0,0,0.5)', palette, 0)).toBe(1);
  });

  it('falls back to nearest base-RGB color when no exact match exists', () => {
    const palette = ['#000000', '#ff0000', '#00ff00', '#0000ff'];
    // Closest to a slightly-off red is the red slot.
    expect(colorRefToIndex('#fe0101', palette, 0)).toBe(1);
  });

  it('returns the fallback only when ref is undefined', () => {
    expect(colorRefToIndex(undefined, hexPalette16, 4)).toBe(4);
  });
});

describe('persist → hydrate round-trip preserves oklch() byte-for-byte', () => {
  it('loads a v3 envelope with an oklch palette unchanged', () => {
    const defaults: ColorTweakState = {
      palette: hexPalette16,
      background: 0,
      foreground: 15,
      cursor: 6,
      selectionBg: 0,
      selectionFg: 15,
      semanticMappings: { accent: 6, muted: 8, active: 14 },
      shikiTheme: 'dracula',
    };
    const v3 = {
      color: {
        palette: oklchPalette,
        background: 2,
        foreground: 15,
        cursor: 6,
        selectionBg: 0,
        selectionFg: 15,
        semanticMappings: { accent: 6, muted: 8, active: 14 },
        shikiTheme: 'dracula',
      },
    };
    const storage = makeStorage({ [getStorageKeyV3()]: JSON.stringify(v3) });

    const result = loadPersistedState(storage, defaults);

    expect(result).not.toBeNull();
    expect(result!.color.palette).toEqual(oklchPalette);
    // Byte-for-byte: the wide-gamut entry is preserved, not clamped.
    expect(result!.color.palette[15]).toBe('oklch(0.70 0.37 30)');
  });
});

describe('initColorFromSchemeData — non-oklch entries are sanitised (regression)', () => {
  it('normalises an invalid non-color palette entry to a safe #000000 instead of leaking it', () => {
    // The bundled `Default Dark` scheme carries a stray non-color slot — `"18"` at
    // index 9, referenced by `background: 9`. Preserving palette entries verbatim
    // for the OKLCH feature must NOT regress this: an unparseable string has to be
    // sanitised (cssColorToHex → '#000000') rather than written to a CSS custom
    // property as the literal `18`.
    const cluster = getActivePrimaryCluster();
    const mixed = [...oklchPalette];
    mixed[9] = '18';
    const state = initColorFromSchemeData(
      makeOklchScheme({ palette: mixed as ColorScheme['palette'] }),
      cluster,
    );

    expect(state.palette[9]).toBe('#000000');
    // …while the real oklch entries alongside it are still preserved raw.
    expect(state.palette[0]).toBe(oklchPalette[0]);
    expect(state.palette[15]).toBe(oklchPalette[15]);
  });

  it('canonicalises a valid shorthand hex entry rather than dropping it', () => {
    const cluster = getActivePrimaryCluster();
    const mixed = [...oklchPalette];
    mixed[2] = '#abc';
    const state = initColorFromSchemeData(
      makeOklchScheme({ palette: mixed as ColorScheme['palette'] }),
      cluster,
    );

    expect(state.palette[2]).toBe('#aabbcc');
  });
});
