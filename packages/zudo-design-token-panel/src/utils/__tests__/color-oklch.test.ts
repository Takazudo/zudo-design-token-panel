/**
 * Tests for the OKLCH math module.
 *
 * Reference colors used for OKLCH↔HSL drift tests are chosen to cover a
 * range of hues and saturations so that any systematic conversion error is
 * likely to be caught.
 */
import { describe, expect, it } from 'vitest';
import {
  oklchaToCss,
  hexToOklcha,
  oklchaToHex,
  oklchaToHsla,
  hslaToOklcha,
  clampToSrgbGamut,
  isInSrgbGamut,
  MAX_OKLCH_CHROMA,
  type Oklcha,
  type Hsla,
} from '../color-oklch';
import { converter, inGamut, useMode, modeOklch, modeOklab, modeRgb, modeHsl, differenceEuclidean } from 'culori/fn';

useMode(modeOklch);
useMode(modeOklab);
useMode(modeRgb);
useMode(modeHsl);

const toOklabForDiff = converter('oklab');
const rgbInGamut = inGamut('rgb');

// deltaEOK approximation: Euclidean distance in OKLab space
// OKLab is perceptually uniform so distance ≈ ΔE-OK
const deltaEOk = differenceEuclidean('oklab');

function oklchaToOklabForDiff(o: Oklcha) {
  return toOklabForDiff({
    mode: 'oklch' as const,
    l: o.l / 100,
    c: o.c,
    h: o.h,
    alpha: o.a / 100,
  });
}

// ---------------------------------------------------------------------------
// oklchaToCss
// ---------------------------------------------------------------------------

describe('oklchaToCss', () => {
  it('emits oklch() without alpha when a===100', () => {
    const css = oklchaToCss({ l: 50, c: 0.2, h: 30, a: 100 });
    expect(css).toMatch(/^oklch\(/);
    expect(css).not.toContain('/');
  });

  it('emits oklch() with alpha when a<100', () => {
    const css = oklchaToCss({ l: 50, c: 0.2, h: 30, a: 50 });
    expect(css).toContain('/');
  });

  it('correctly encodes l as a 0–1 fraction of the 0–100 input', () => {
    const css = oklchaToCss({ l: 100, c: 0, h: 0, a: 100 });
    expect(css).toContain('1.0000');
  });
});

// ---------------------------------------------------------------------------
// hexToOklcha
// ---------------------------------------------------------------------------

describe('hexToOklcha — invalid input', () => {
  it('returns fallback for empty string', () => {
    const r = hexToOklcha('');
    expect(r).toEqual({ l: 0, c: 0, h: 0, a: 100 });
  });

  it('returns fallback for non-hex string', () => {
    const r = hexToOklcha('notacolor');
    expect(r).toEqual({ l: 0, c: 0, h: 0, a: 100 });
  });

  it('returns fallback for bare hash', () => {
    const r = hexToOklcha('#');
    expect(r).toEqual({ l: 0, c: 0, h: 0, a: 100 });
  });
});

describe('hexToOklcha — 3-char shorthand', () => {
  it('#abc returns the same as #aabbcc', () => {
    const short = hexToOklcha('#abc');
    const long = hexToOklcha('#aabbcc');
    expect(short.l).toBeCloseTo(long.l, 2);
    expect(short.c).toBeCloseTo(long.c, 4);
    expect(short.h).toBeCloseTo(long.h, 1);
    expect(short.a).toBeCloseTo(long.a, 2);
  });
});

describe('hexToOklcha — alpha handling', () => {
  it('#ff000080 returns a ≈ 50 (128/255 * 100 ≈ 50.2)', () => {
    const r = hexToOklcha('#ff000080');
    expect(r.a).toBeCloseTo(50, 0);
  });

  it('fully opaque #ff0000 returns a === 100', () => {
    const r = hexToOklcha('#ff0000');
    expect(r.a).toBeCloseTo(100, 2);
  });
});

describe('hexToOklcha — black produces zero chroma', () => {
  it('#000000 returns c === 0', () => {
    const r = hexToOklcha('#000000');
    expect(r.c).toBeCloseTo(0, 4);
    expect(r.l).toBeCloseTo(0, 2);
  });
});

// ---------------------------------------------------------------------------
// oklchaToHex
// ---------------------------------------------------------------------------

describe('oklchaToHex', () => {
  it('returns #000000 for black (a===100)', () => {
    expect(oklchaToHex({ l: 0, c: 0, h: 0, a: 100 })).toBe('#000000');
  });

  it('emits 8-digit hex when a<100', () => {
    const hex = oklchaToHex({ l: 50, c: 0, h: 0, a: 50 });
    expect(hex).toHaveLength(9); // # + 8 chars
  });

  it('emits 6-digit hex when a===100 (no alwaysAlpha)', () => {
    const hex = oklchaToHex({ l: 50, c: 0.1, h: 180, a: 100 });
    expect(hex).toHaveLength(7); // # + 6 chars
  });

  it('emits 8-digit hex when alwaysAlpha:true even for a===100', () => {
    const hex = oklchaToHex({ l: 0, c: 0, h: 0, a: 100 }, { alwaysAlpha: true });
    expect(hex).toHaveLength(9);
  });

  it('6-digit hex round-trip: #ff0000 survives hex→oklcha→hex', () => {
    const oklcha = hexToOklcha('#ff0000');
    const back = oklchaToHex(oklcha);
    expect(back).toBe('#ff0000');
  });

  it('6-digit hex round-trip: #00ff00', () => {
    const oklcha = hexToOklcha('#00ff00');
    const back = oklchaToHex(oklcha);
    expect(back).toBe('#00ff00');
  });

  it('6-digit hex round-trip: #0000ff', () => {
    const oklcha = hexToOklcha('#0000ff');
    const back = oklchaToHex(oklcha);
    expect(back).toBe('#0000ff');
  });

  it('6-digit hex round-trip: #aabbcc', () => {
    const oklcha = hexToOklcha('#aabbcc');
    const back = oklchaToHex(oklcha);
    expect(back).toBe('#aabbcc');
  });
});

// ---------------------------------------------------------------------------
// oklchaToHsla / hslaToOklcha — round-trip drift ≤ ΔE-OK 2
// ---------------------------------------------------------------------------

describe('OKLCH↔HSL round-trip drift', () => {
  const referenceHexColors = [
    '#ff0000', // red
    '#00ff00', // green
    '#0000ff', // blue
    '#ffff00', // yellow
    '#ff00ff', // magenta
    '#00ffff', // cyan
    '#ff8800', // orange
    '#884400', // brown
    '#336699', // slate blue
    '#ffffff', // white
    '#808080', // gray
  ];

  for (const hex of referenceHexColors) {
    it(`${hex}: OKLCH→HSL→OKLCH drift ≤ ΔE-OK 2`, () => {
      const original = hexToOklcha(hex);
      const hsla = oklchaToHsla(original);
      const roundTripped = hslaToOklcha(hsla);

      const orig = oklchaToOklabForDiff(original);
      const rt = oklchaToOklabForDiff(roundTripped);
      if (!orig || !rt) return; // achromatic edge cases are fine

      const delta = deltaEOk(orig, rt);
      expect(delta).toBeLessThanOrEqual(2);
    });
  }

  it('oklchaToHsla preserves alpha', () => {
    const o: Oklcha = { l: 50, c: 0.1, h: 120, a: 75 };
    const hsla = oklchaToHsla(o);
    expect(hsla.a).toBeCloseTo(75, 2);
  });

  it('hslaToOklcha preserves alpha', () => {
    const h: Hsla = { h: 120, s: 50, l: 50, a: 75 };
    const oklcha = hslaToOklcha(h);
    expect(oklcha.a).toBeCloseTo(75, 2);
  });
});

// ---------------------------------------------------------------------------
// clampToSrgbGamut
// ---------------------------------------------------------------------------

describe('clampToSrgbGamut', () => {
  it('preserves L and H', () => {
    // A wide-gamut color with high chroma that exceeds sRGB
    const o: Oklcha = { l: 70, c: MAX_OKLCH_CHROMA, h: 150, a: 100 };
    const clamped = clampToSrgbGamut(o);
    expect(clamped.l).toBeCloseTo(o.l, 0);
    expect(clamped.h).toBeCloseTo(o.h, 0);
  });

  it('result is in sRGB gamut', () => {
    const o: Oklcha = { l: 70, c: 0.5, h: 150, a: 100 };
    const clamped = clampToSrgbGamut(o);
    expect(isInSrgbGamut(clamped)).toBe(true);
  });

  it('in-gamut color is returned unchanged (within float tolerance)', () => {
    const o: Oklcha = { l: 50, c: 0, h: 0, a: 100 }; // black
    const clamped = clampToSrgbGamut(o);
    expect(clamped.l).toBeCloseTo(50, 1);
    expect(clamped.c).toBeCloseTo(0, 4);
  });
});

// ---------------------------------------------------------------------------
// isInSrgbGamut
// ---------------------------------------------------------------------------

describe('isInSrgbGamut', () => {
  it('matches culori inGamut("rgb") for black', () => {
    const o: Oklcha = { l: 0, c: 0, h: 0, a: 100 };
    const culoriResult = rgbInGamut({
      mode: 'oklch' as const,
      l: o.l / 100,
      c: o.c,
      h: o.h,
    });
    expect(isInSrgbGamut(o)).toBe(culoriResult);
  });

  it('matches culori inGamut("rgb") for red', () => {
    const o = hexToOklcha('#ff0000');
    const culoriResult = rgbInGamut({
      mode: 'oklch' as const,
      l: o.l / 100,
      c: o.c,
      h: o.h,
    });
    expect(isInSrgbGamut(o)).toBe(culoriResult);
  });

  it('out-of-gamut high-chroma color returns false', () => {
    // Very high chroma color exceeding sRGB
    const o: Oklcha = { l: 70, c: 0.5, h: 150, a: 100 };
    expect(isInSrgbGamut(o)).toBe(false);
  });

  it('in-gamut gray returns true', () => {
    const o: Oklcha = { l: 50, c: 0, h: 0, a: 100 };
    expect(isInSrgbGamut(o)).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// MAX_OKLCH_CHROMA constant
// ---------------------------------------------------------------------------

describe('MAX_OKLCH_CHROMA', () => {
  it('is 0.37', () => {
    expect(MAX_OKLCH_CHROMA).toBe(0.37);
  });
});
