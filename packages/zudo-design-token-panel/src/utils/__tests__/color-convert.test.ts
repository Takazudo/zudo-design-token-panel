import { describe, expect, it } from 'vitest';
import { hexToHsl, hslToHex } from '../color-convert';

describe('hexToHsl', () => {
  it('parses long-form #rrggbb', () => {
    const result = hexToHsl('#ff0000');
    expect(result.h).toBe(0);
    expect(result.s).toBe(100);
    expect(result.l).toBe(50);
  });

  it('parses 3-char shorthand #rgb the same as its expanded #rrggbb form', () => {
    // #f00 must behave identically to #ff0000 — previously the slice-based
    // parser silently produced NaN-laden output for the short form.
    const short = hexToHsl('#f00');
    const long = hexToHsl('#ff0000');
    expect(short).toEqual(long);
    expect(Number.isFinite(short.h)).toBe(true);
    expect(Number.isFinite(short.s)).toBe(true);
    expect(Number.isFinite(short.l)).toBe(true);
  });

  it('parses 3-char shorthand for an arbitrary color', () => {
    expect(hexToHsl('#abc')).toEqual(hexToHsl('#aabbcc'));
  });

  it('parses 4-char shorthand #rgba consistent with #rrggbbaa', () => {
    const short = hexToHsl('#f00f');
    const long = hexToHsl('#ff0000ff');
    expect(short).toEqual(long);
    expect(Number.isFinite(short.h)).toBe(true);
  });

  it('returns saturation 0 for grays', () => {
    expect(hexToHsl('#888888').s).toBe(0);
    // Same for the 3-char form.
    expect(hexToHsl('#888').s).toBe(0);
  });
});

describe('hslToHex', () => {
  it('round-trips with hexToHsl for a saturated color', () => {
    const { h, s, l } = hexToHsl('#ff0000');
    expect(hslToHex(h, s, l)).toBe('#ff0000');
  });
});
