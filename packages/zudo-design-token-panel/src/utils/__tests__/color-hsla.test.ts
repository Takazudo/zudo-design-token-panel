import { describe, expect, it } from 'vitest';
import { hexToHsla, hslaToHex } from '../color-hsla';

describe('hexToHsla', () => {
  it('parses 6-digit opaque hex — acceptance criterion', () => {
    const result = hexToHsla('#ff0000');
    expect(result.h).toBe(0);
    expect(result.s).toBe(100);
    expect(result.l).toBe(50);
    expect(result.a).toBe(100);
  });

  it('parses 8-digit hex with alpha — acceptance criterion', () => {
    const result = hexToHsla('#ff000080');
    expect(result.h).toBe(0);
    expect(result.s).toBe(100);
    expect(result.l).toBe(50);
    // 0x80 = 128; 128/255*100 ≈ 50.196 → rounds to 50
    expect(result.a).toBe(50);
  });

  it('parses fully transparent 8-digit hex', () => {
    const result = hexToHsla('#ff000000');
    expect(result.a).toBe(0);
  });

  it('parses fully opaque 8-digit hex (ff alpha)', () => {
    const result = hexToHsla('#ff0000ff');
    expect(result.a).toBe(100);
  });

  it('parses 3-char shorthand #rgb the same as #rrggbb', () => {
    const short = hexToHsla('#f00');
    const long = hexToHsla('#ff0000');
    expect(short).toEqual(long);
  });

  it('parses 4-char shorthand #rgba the same as #rrggbbaa', () => {
    const short = hexToHsla('#f008');
    const long = hexToHsla('#ff000088');
    expect(short).toEqual(long);
  });

  it('returns saturation 0 for grays', () => {
    expect(hexToHsla('#888888').s).toBe(0);
  });

  it('returns INVALID_HSLA default for empty string', () => {
    expect(hexToHsla('')).toEqual({ h: 0, s: 0, l: 0, a: 100 });
  });

  it('returns INVALID_HSLA default for wrong-length hex', () => {
    // 5 hex digits (#fffff) — not a valid 3/4/6/8 digit form
    expect(hexToHsla('#fffff')).toEqual({ h: 0, s: 0, l: 0, a: 100 });
  });

  it('returns INVALID_HSLA default for non-hex characters', () => {
    expect(hexToHsla('#gghhii')).toEqual({ h: 0, s: 0, l: 0, a: 100 });
  });

  it('returns INVALID_HSLA default when missing # prefix', () => {
    expect(hexToHsla('ff0000')).toEqual({ h: 0, s: 0, l: 0, a: 100 });
  });

  it('handles blue correctly', () => {
    const result = hexToHsla('#0000ff');
    expect(result.h).toBe(240);
    expect(result.s).toBe(100);
    expect(result.l).toBe(50);
    expect(result.a).toBe(100);
  });

  it('handles green correctly', () => {
    const result = hexToHsla('#00ff00');
    expect(result.h).toBe(120);
    expect(result.s).toBe(100);
    expect(result.l).toBe(50);
    expect(result.a).toBe(100);
  });

  it('handles white correctly', () => {
    const result = hexToHsla('#ffffff');
    expect(result.l).toBe(100);
    expect(result.s).toBe(0);
    expect(result.a).toBe(100);
  });

  it('handles black correctly', () => {
    const result = hexToHsla('#000000');
    expect(result.l).toBe(0);
    expect(result.s).toBe(0);
    expect(result.a).toBe(100);
  });
});

describe('hslaToHex', () => {
  it('emits 6-digit #rrggbb when a === 100 — acceptance criterion', () => {
    expect(hslaToHex(0, 100, 50, 100)).toBe('#ff0000');
  });

  it('emits 8-digit #rrggbbaa when a < 100 — acceptance criterion', () => {
    // 50% alpha: Math.round(50/100*255) = Math.round(127.5) = 128 = 0x80
    expect(hslaToHex(0, 100, 50, 50)).toBe('#ff000080');
  });

  it('emits 8-digit when a === 0', () => {
    const result = hslaToHex(0, 100, 50, 0);
    expect(result).toBe('#ff000000');
  });

  it('round-trips with hexToHsla for pure saturated colors', () => {
    // Integer-rounded HSL cannot exactly represent all hex values; use primary
    // colors whose HSL round-trip is lossless (integer h/s/l at exact values).
    for (const hex of ['#ff0000', '#00ff00', '#0000ff', '#ffff00', '#00ffff', '#ff00ff']) {
      const { h, s, l, a } = hexToHsla(hex);
      expect(hslaToHex(h, s, l, a)).toBe(hex);
    }
  });

  it('round-trips with hexToHsla for color with alpha', () => {
    const { h, s, l, a } = hexToHsla('#ff000080');
    const hex = hslaToHex(h, s, l, a);
    expect(hex).toBe('#ff000080');
  });

  it('handles hue wrap-around (360 == 0)', () => {
    expect(hslaToHex(360, 100, 50, 100)).toBe('#ff0000');
  });

  it('handles blue', () => {
    expect(hslaToHex(240, 100, 50, 100)).toBe('#0000ff');
  });

  it('handles green', () => {
    expect(hslaToHex(120, 100, 50, 100)).toBe('#00ff00');
  });

  it('handles white (s=0)', () => {
    expect(hslaToHex(0, 0, 100, 100)).toBe('#ffffff');
  });

  it('handles black (s=0, l=0)', () => {
    expect(hslaToHex(0, 0, 0, 100)).toBe('#000000');
  });

  it('various alpha round-trips: 0, 25, 75', () => {
    for (const a of [0, 25, 75]) {
      const hex = hslaToHex(0, 100, 50, a);
      const parsed = hexToHsla(hex);
      expect(parsed.a).toBe(a);
    }
  });

  it('clamps out-of-range s, l, a to nearest valid value', () => {
    // s > 100 is treated as 100
    expect(hslaToHex(0, 200, 50, 100)).toBe(hslaToHex(0, 100, 50, 100));
    // l > 100 is treated as 100 (white)
    expect(hslaToHex(0, 100, 200, 100)).toBe('#ffffff');
    // a > 100 is treated as 100 (opaque, no alpha byte)
    expect(hslaToHex(0, 100, 50, 120)).toBe('#ff0000');
    // a < 0 is treated as 0 (transparent)
    expect(hslaToHex(0, 100, 50, -10)).toBe('#ff000000');
  });
});
