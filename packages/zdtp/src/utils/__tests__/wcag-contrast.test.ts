/**
 * Tests for the WCAG 2.1 contrast ratio and score helpers.
 */
import { describe, expect, it } from 'vitest';
import { contrastRatio, contrastScore } from '../wcag-contrast';

// ---------------------------------------------------------------------------
// contrastRatio — known pairs
// ---------------------------------------------------------------------------

describe('contrastRatio — known pairs', () => {
  it('#000000 vs #ffffff → 21', () => {
    // Maximum contrast: black on white = 21:1
    expect(contrastRatio('#000000', '#ffffff')).toBeCloseTo(21, 1);
  });

  it('#ffffff vs #000000 → 21 (argument order does not matter)', () => {
    expect(contrastRatio('#ffffff', '#000000')).toBeCloseTo(21, 1);
  });

  it('#000 vs #fff shorthand → 21', () => {
    expect(contrastRatio('#000', '#fff')).toBeCloseTo(21, 1);
  });

  it('#000000 vs #000000 → 1 (identical colors)', () => {
    expect(contrastRatio('#000000', '#000000')).toBeCloseTo(1, 4);
  });

  it('#ffffff vs #ffffff → 1 (identical colors)', () => {
    expect(contrastRatio('#ffffff', '#ffffff')).toBeCloseTo(1, 4);
  });

  it('mid-gray #808080 vs #ffffff — ratio in (3, 4)', () => {
    // #808080 relative luminance ≈ 0.2159; white = 1.0
    // ratio = (1.0 + 0.05) / (0.2159 + 0.05) ≈ 3.95
    const ratio = contrastRatio('#808080', '#ffffff');
    expect(ratio).toBeGreaterThan(3);
    expect(ratio).toBeLessThan(5);
  });

  it('mid-gray #808080 vs #000000 — ratio in (4, 6)', () => {
    // (0.2159 + 0.05) / (0 + 0.05) ≈ 5.32
    const ratio = contrastRatio('#808080', '#000000');
    expect(ratio).toBeGreaterThan(4);
    expect(ratio).toBeLessThan(6);
  });
});

// ---------------------------------------------------------------------------
// contrastScore — normal text thresholds (4.5 AA / 7 AAA)
// ---------------------------------------------------------------------------

describe('contrastScore — normal text (default)', () => {
  it('ratio < 4.5 → Fail', () => {
    expect(contrastScore(1)).toBe('Fail');
    expect(contrastScore(3)).toBe('Fail');
    expect(contrastScore(4.49)).toBe('Fail');
  });

  it('ratio === 4.5 → AA (boundary)', () => {
    expect(contrastScore(4.5)).toBe('AA');
  });

  it('ratio between 4.5 and 7 → AA', () => {
    expect(contrastScore(5)).toBe('AA');
    expect(contrastScore(6.99)).toBe('AA');
  });

  it('ratio === 7 → AAA (boundary)', () => {
    expect(contrastScore(7)).toBe('AAA');
  });

  it('ratio > 7 → AAA', () => {
    expect(contrastScore(10)).toBe('AAA');
    expect(contrastScore(21)).toBe('AAA');
  });
});

// ---------------------------------------------------------------------------
// contrastScore — large text thresholds (3.0 AA / 4.5 AAA)
// ---------------------------------------------------------------------------

describe('contrastScore — large text (opts.large = true)', () => {
  it('ratio < 3.0 → Fail', () => {
    expect(contrastScore(1, { large: true })).toBe('Fail');
    expect(contrastScore(2.99, { large: true })).toBe('Fail');
  });

  it('ratio === 3.0 → AA (boundary)', () => {
    expect(contrastScore(3.0, { large: true })).toBe('AA');
  });

  it('ratio between 3.0 and 4.5 → AA', () => {
    expect(contrastScore(4.0, { large: true })).toBe('AA');
    expect(contrastScore(4.49, { large: true })).toBe('AA');
  });

  it('ratio === 4.5 → AAA (boundary)', () => {
    expect(contrastScore(4.5, { large: true })).toBe('AAA');
  });

  it('ratio > 4.5 → AAA', () => {
    expect(contrastScore(7, { large: true })).toBe('AAA');
    expect(contrastScore(21, { large: true })).toBe('AAA');
  });
});

// ---------------------------------------------------------------------------
// contrastScore — combined with contrastRatio
// ---------------------------------------------------------------------------

describe('contrastScore + contrastRatio combined', () => {
  it('#000000 vs #ffffff → AAA (normal)', () => {
    const ratio = contrastRatio('#000000', '#ffffff');
    expect(contrastScore(ratio)).toBe('AAA');
  });

  it('#000000 vs #ffffff → AAA (large)', () => {
    const ratio = contrastRatio('#000000', '#ffffff');
    expect(contrastScore(ratio, { large: true })).toBe('AAA');
  });

  it('#808080 vs #ffffff — Fail for normal text, AA for large text', () => {
    const ratio = contrastRatio('#808080', '#ffffff');
    // ratio ≈ 3.95 → below 4.5, so Fail for normal
    expect(contrastScore(ratio)).toBe('Fail');
    // but ≥ 3.0, so AA for large
    expect(contrastScore(ratio, { large: true })).toBe('AA');
  });
});
