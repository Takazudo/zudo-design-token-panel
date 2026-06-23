/**
 * Tests for the OKLCH channel-curve math helpers.
 */
import { describe, expect, it } from 'vitest';
import {
  CHANNEL_MAX,
  stepX,
  valueToY,
  yToValue,
  clampHueForPersist,
  HUE_PERSIST_MAX,
} from '../palette-curve';
import { MAX_OKLCH_CHROMA, oklchaToCss, cssToOklcha } from '../color-oklch';

// ---------------------------------------------------------------------------
// CHANNEL_MAX
// ---------------------------------------------------------------------------

describe('CHANNEL_MAX', () => {
  it('l is 100', () => {
    expect(CHANNEL_MAX.l).toBe(100);
  });

  it('c is MAX_OKLCH_CHROMA (0.37)', () => {
    expect(CHANNEL_MAX.c).toBe(MAX_OKLCH_CHROMA);
    expect(CHANNEL_MAX.c).toBe(0.37);
  });

  it('h is 360', () => {
    expect(CHANNEL_MAX.h).toBe(360);
  });
});

// ---------------------------------------------------------------------------
// stepX
// ---------------------------------------------------------------------------

describe('stepX', () => {
  it('centers node 0 of 4 at 0.125', () => {
    expect(stepX(0, 4)).toBeCloseTo(0.125);
  });

  it('centers node 1 of 4 at 0.375', () => {
    expect(stepX(1, 4)).toBeCloseTo(0.375);
  });

  it('centers node 2 of 4 at 0.625', () => {
    expect(stepX(2, 4)).toBeCloseTo(0.625);
  });

  it('centers node 3 of 4 at 0.875', () => {
    expect(stepX(3, 4)).toBeCloseTo(0.875);
  });

  it('centers node 0 of 1 at 0.5 (single node)', () => {
    expect(stepX(0, 1)).toBeCloseTo(0.5);
  });

  it('centers node 0 of 2 at 0.25', () => {
    expect(stepX(0, 2)).toBeCloseTo(0.25);
  });

  it('centers node 1 of 2 at 0.75', () => {
    expect(stepX(1, 2)).toBeCloseTo(0.75);
  });
});

// ---------------------------------------------------------------------------
// valueToY — basic mapping
// ---------------------------------------------------------------------------

describe('valueToY — lightness (l)', () => {
  it('l=0 → y=1 (bottom of axis)', () => {
    expect(valueToY(0, 'l')).toBeCloseTo(1);
  });

  it('l=100 → y=0 (top of axis)', () => {
    expect(valueToY(100, 'l')).toBeCloseTo(0);
  });

  it('l=50 → y=0.5 (midpoint)', () => {
    expect(valueToY(50, 'l')).toBeCloseTo(0.5);
  });
});

describe('valueToY — chroma (c)', () => {
  it('c=0 → y=1', () => {
    expect(valueToY(0, 'c')).toBeCloseTo(1);
  });

  it('c=MAX_OKLCH_CHROMA → y=0', () => {
    expect(valueToY(MAX_OKLCH_CHROMA, 'c')).toBeCloseTo(0);
  });

  it('c=MAX_OKLCH_CHROMA/2 → y=0.5', () => {
    expect(valueToY(MAX_OKLCH_CHROMA / 2, 'c')).toBeCloseTo(0.5);
  });
});

describe('valueToY — hue (h)', () => {
  it('h=0 → y=1 (bottom, same as h=360)', () => {
    expect(valueToY(0, 'h')).toBeCloseTo(1);
  });

  it('h=360 → y=0 (top, same as h=0 but clamped not wrapped)', () => {
    expect(valueToY(360, 'h')).toBeCloseTo(0);
  });

  it('h=180 → y=0.5', () => {
    expect(valueToY(180, 'h')).toBeCloseTo(0.5);
  });
});

// ---------------------------------------------------------------------------
// yToValue — basic mapping
// ---------------------------------------------------------------------------

describe('yToValue — lightness (l)', () => {
  it('y=1 → l=0', () => {
    expect(yToValue(1, 'l')).toBeCloseTo(0);
  });

  it('y=0 → l=100', () => {
    expect(yToValue(0, 'l')).toBeCloseTo(100);
  });

  it('y=0.5 → l=50', () => {
    expect(yToValue(0.5, 'l')).toBeCloseTo(50);
  });
});

describe('yToValue — chroma (c)', () => {
  it('y=1 → c=0', () => {
    expect(yToValue(1, 'c')).toBeCloseTo(0);
  });

  it('y=0 → c=MAX_OKLCH_CHROMA', () => {
    expect(yToValue(0, 'c')).toBeCloseTo(MAX_OKLCH_CHROMA);
  });

  it('y=0.5 → c=MAX_OKLCH_CHROMA/2', () => {
    expect(yToValue(0.5, 'c')).toBeCloseTo(MAX_OKLCH_CHROMA / 2);
  });
});

describe('yToValue — hue (h)', () => {
  it('y=1 → h=0', () => {
    expect(yToValue(1, 'h')).toBeCloseTo(0);
  });

  it('y=0 → h=360', () => {
    expect(yToValue(0, 'h')).toBeCloseTo(360);
  });

  it('y=0.5 → h=180', () => {
    expect(yToValue(0.5, 'h')).toBeCloseTo(180);
  });
});

// ---------------------------------------------------------------------------
// valueToY / yToValue round-trip per channel
// ---------------------------------------------------------------------------

describe('valueToY / yToValue round-trip', () => {
  it('l: value → y → value round-trip at l=0', () => {
    expect(yToValue(valueToY(0, 'l'), 'l')).toBeCloseTo(0);
  });

  it('l: value → y → value round-trip at l=50', () => {
    expect(yToValue(valueToY(50, 'l'), 'l')).toBeCloseTo(50);
  });

  it('l: value → y → value round-trip at l=100', () => {
    expect(yToValue(valueToY(100, 'l'), 'l')).toBeCloseTo(100);
  });

  it('c: value → y → value round-trip at c=0', () => {
    expect(yToValue(valueToY(0, 'c'), 'c')).toBeCloseTo(0);
  });

  it('c: value → y → value round-trip at c=MAX_OKLCH_CHROMA/2', () => {
    const mid = MAX_OKLCH_CHROMA / 2;
    expect(yToValue(valueToY(mid, 'c'), 'c')).toBeCloseTo(mid);
  });

  it('c: value → y → value round-trip at c=MAX_OKLCH_CHROMA', () => {
    expect(yToValue(valueToY(MAX_OKLCH_CHROMA, 'c'), 'c')).toBeCloseTo(MAX_OKLCH_CHROMA);
  });

  it('h: value → y → value round-trip at h=0', () => {
    expect(yToValue(valueToY(0, 'h'), 'h')).toBeCloseTo(0);
  });

  it('h: value → y → value round-trip at h=180', () => {
    expect(yToValue(valueToY(180, 'h'), 'h')).toBeCloseTo(180);
  });

  it('h: value → y → value round-trip at h=360', () => {
    expect(yToValue(valueToY(360, 'h'), 'h')).toBeCloseTo(360);
  });
});

// ---------------------------------------------------------------------------
// H clamping (no wrap-around)
// ---------------------------------------------------------------------------

describe('H clamping — no wrap-around', () => {
  it('valueToY: h > 360 is clamped to 360 (y=0)', () => {
    // h=720 should clamp to 360, giving y=0 rather than wrapping
    expect(valueToY(720, 'h')).toBeCloseTo(0);
  });

  it('valueToY: h < 0 is clamped to 0 (y=1)', () => {
    // h=-90 should clamp to 0, giving y=1
    expect(valueToY(-90, 'h')).toBeCloseTo(1);
  });

  it('yToValue: y < 0 is clamped to 0 (h=360)', () => {
    expect(yToValue(-0.5, 'h')).toBeCloseTo(360);
  });

  it('yToValue: y > 1 is clamped to 1 (h=0)', () => {
    expect(yToValue(1.5, 'h')).toBeCloseTo(0);
  });

  it('valueToY: h=0 and h=360 give distinct Y values (0° at bottom, 360° at top)', () => {
    // 0° → y=1 (bottom), 360° → y=0 (top); they map differently — clamp, not wrap
    expect(valueToY(0, 'h')).toBeCloseTo(1);
    expect(valueToY(360, 'h')).toBeCloseTo(0);
  });
});

// ---------------------------------------------------------------------------
// L and C clamping
// ---------------------------------------------------------------------------

describe('L clamping', () => {
  it('valueToY: l > 100 is clamped to y=0', () => {
    expect(valueToY(150, 'l')).toBeCloseTo(0);
  });

  it('valueToY: l < 0 is clamped to y=1', () => {
    expect(valueToY(-10, 'l')).toBeCloseTo(1);
  });

  it('yToValue: y < 0 is clamped to l=100', () => {
    expect(yToValue(-0.5, 'l')).toBeCloseTo(100);
  });

  it('yToValue: y > 1 is clamped to l=0', () => {
    expect(yToValue(1.5, 'l')).toBeCloseTo(0);
  });
});

describe('C clamping', () => {
  it('valueToY: c > MAX_OKLCH_CHROMA is clamped to y=0', () => {
    expect(valueToY(1, 'c')).toBeCloseTo(0);
  });

  it('valueToY: c < 0 is clamped to y=1', () => {
    expect(valueToY(-0.1, 'c')).toBeCloseTo(1);
  });
});

// ---------------------------------------------------------------------------
// clampHueForPersist — stable oklch() round-trip (no wrap to 0 at the top)
// ---------------------------------------------------------------------------

describe('clampHueForPersist', () => {
  it('HUE_PERSIST_MAX is just below 360', () => {
    expect(HUE_PERSIST_MAX).toBeLessThan(360);
    expect(HUE_PERSIST_MAX).toBeGreaterThan(359);
  });

  it('caps h=360 to HUE_PERSIST_MAX', () => {
    expect(clampHueForPersist(360)).toBe(HUE_PERSIST_MAX);
  });

  it('caps h>360 (e.g. 720) to HUE_PERSIST_MAX', () => {
    expect(clampHueForPersist(720)).toBe(HUE_PERSIST_MAX);
  });

  it('leaves hues below 360 unchanged', () => {
    expect(clampHueForPersist(0)).toBe(0);
    expect(clampHueForPersist(180)).toBe(180);
    expect(clampHueForPersist(359.5)).toBe(359.5);
  });

  it('a capped hue survives an oklch() string round-trip (stays near the top)', () => {
    const css = oklchaToCss({ l: 50, c: 0.1, h: clampHueForPersist(360), a: 100 });
    const parsed = cssToOklcha(css);
    expect(parsed).not.toBeNull();
    expect(parsed!.h).toBeGreaterThan(359);
    expect(parsed!.h).toBeLessThan(360);
  });

  it('documents the bug the cap prevents: an UNCAPPED h=360 wraps to 0', () => {
    const parsed = cssToOklcha(oklchaToCss({ l: 50, c: 0.1, h: 360, a: 100 }));
    expect(parsed!.h).toBeCloseTo(0);
  });
});
