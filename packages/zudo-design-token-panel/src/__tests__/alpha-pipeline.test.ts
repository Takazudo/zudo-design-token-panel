// @vitest-environment jsdom
/**
 * Tests for the alpha-aware persist + apply pipeline (issue #174).
 *
 * Covers:
 *  - cssColorToHex: 8-digit pass-through, 4-char shorthand expansion,
 *    rgba() with alpha < 1, rgb() 6-digit regression guards.
 *  - colorRefToIndex: alpha ignored for similarity search.
 *  - setCssVar: 8-digit hex round-trip via document.documentElement.style.
 */
import { describe, it, expect } from 'vitest';
import { cssColorToHex, colorRefToIndex, setCssVar } from '../state/tweak-state';

describe('cssColorToHex — 8-digit and 4-char alpha support', () => {
  it('passes through an 8-digit hex unchanged', () => {
    expect(cssColorToHex('#ff000080')).toBe('#ff000080');
  });

  it('expands 4-char shorthand #RGBA to #RRGGBBAA', () => {
    expect(cssColorToHex('#f00f')).toBe('#ff0000ff');
  });

  it('converts rgba() with alpha < 1 to 8-digit hex', () => {
    // rgba(255, 0, 0, 0.5) → alpha byte: round(0.5 * 255) = 128 = 0x80
    expect(cssColorToHex('rgba(255, 0, 0, 0.5)')).toBe('#ff000080');
  });

  it('rgb() without alpha still returns 6-digit hex', () => {
    expect(cssColorToHex('rgb(255, 0, 0)')).toBe('#ff0000');
  });

  it('rgba() with alpha === 1 returns 6-digit hex', () => {
    expect(cssColorToHex('rgba(255, 0, 0, 1)')).toBe('#ff0000');
  });

  it('#ff0000 regression guard — still returns 6-digit', () => {
    expect(cssColorToHex('#ff0000')).toBe('#ff0000');
  });

  it('foobar regression guard — still returns #000000', () => {
    expect(cssColorToHex('foobar')).toBe('#000000');
  });
});

describe('colorRefToIndex — alpha ignored for similarity', () => {
  it('matches an 8-digit hex ref to a 6-digit palette entry by RGB proximity', () => {
    // #3366cc80 has RGB #3366cc — nearest to palette[0]=#3366cc, not palette[1]=#000000
    const result = colorRefToIndex('#3366cc80', ['#3366cc', '#000000'], 0);
    expect(result).toBe(0);
  });
});

describe('colorRefToIndex — ref normalization', () => {
  // The fix for the codex-adversarial finding: equivalent color notations must
  // resolve to the same palette slot via exact-match (not fall through to the
  // alpha-dropping RGB distance match).

  it('rgba() ref matches an equivalent 8-digit hex palette entry exactly', () => {
    // rgba(255,0,0,0.5) normalizes to #ff000080
    // Palette has both an opaque red and the translucent red — we want the
    // translucent slot, not the opaque one. Without normalization the
    // rawIdx miss would fall through to RGB distance and pick the first
    // RGB-equivalent (the opaque slot), silently losing alpha.
    const result = colorRefToIndex('rgba(255,0,0,0.5)', ['#ff0000', '#ff000080'], 0);
    expect(result).toBe(1);
  });

  it('4-char shorthand ref matches an 8-digit hex palette entry', () => {
    // #f008 → #ff000088
    const result = colorRefToIndex('#f008', ['#ffffff', '#ff000088'], 0);
    expect(result).toBe(1);
  });

  it('rgb() ref still matches an opaque 6-digit hex palette entry', () => {
    const result = colorRefToIndex('rgb(255,0,0)', ['#ff0000', '#000000'], 0);
    expect(result).toBe(0);
  });
});

describe('setCssVar — 8-digit hex round-trip in jsdom', () => {
  it('sets and retrieves an 8-digit hex CSS custom property', () => {
    setCssVar('--test-alpha-color', '#ff000080');
    const value = document.documentElement.style.getPropertyValue('--test-alpha-color');
    expect(value).toBe('#ff000080');
  });
});
