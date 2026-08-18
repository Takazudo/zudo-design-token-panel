// @vitest-environment jsdom

/**
 * Coherence between the panel's first-open position and its first-open size.
 *
 * Pre-fix, `defaultPosition()` and `defaultSize()` derived the panel width
 * independently: the position centered a phantom `min(1200, 0.8 * vw)` panel
 * while the size raised that same value to the `MIN_PANEL_WIDTH` floor of 320.
 * On a 320px viewport that produced `left 32 + width 320 = 352` — 32px of the
 * panel hanging off-screen. `clampPosition()` did not rescue it: it is a
 * permissive drag-recovery clamp that only keeps `VISIBLE_MIN` px grabbable.
 *
 * Post-fix both delegate to `defaultGeometry()`, which clamps the size first
 * and centers against that rectangle, so the spawned panel is fully contained
 * on any viewport wide enough to hold the minimum panel width.
 */

import { afterEach, describe, expect, it } from 'vitest';
import {
  MIN_PANEL_HEIGHT,
  MIN_PANEL_WIDTH,
  defaultGeometry,
  defaultPosition,
  defaultSize,
} from '../state/tweak-state';

const ORIGINAL_INNER_WIDTH = window.innerWidth;
const ORIGINAL_INNER_HEIGHT = window.innerHeight;

function setViewport(w: number, h: number): void {
  Object.defineProperty(window, 'innerWidth', { value: w, configurable: true });
  Object.defineProperty(window, 'innerHeight', { value: h, configurable: true });
}

afterEach(() => {
  setViewport(ORIGINAL_INNER_WIDTH, ORIGINAL_INNER_HEIGHT);
});

describe('defaultGeometry — narrow-viewport containment', () => {
  const widths = [320, 340, 352, 360, 375, 414];
  const heights = [568, 667];

  for (const w of widths) {
    for (const h of heights) {
      it(`spawns fully on-screen at ${w}×${h}`, () => {
        setViewport(w, h);
        const geom = defaultGeometry();
        expect(geom.left).toBeGreaterThanOrEqual(0);
        expect(geom.top).toBeGreaterThanOrEqual(0);
        expect(geom.left + geom.width).toBeLessThanOrEqual(w);
        expect(geom.top + geom.height).toBeLessThanOrEqual(h);
      });
    }
  }

  it('places the panel flush at left 0 with the minimum width on a 320px viewport', () => {
    // The original repro: pre-fix this was left 32 + width 320 = 352 on a
    // 320px viewport. The MIN_PANEL_WIDTH floor is intentional, so the only
    // correct centering is flush against the left edge.
    setViewport(320, 568);
    const geom = defaultGeometry();
    expect(geom.width).toBe(MIN_PANEL_WIDTH);
    expect(geom.left).toBe(0);
  });

  it('centers against the floored width on a 375px viewport', () => {
    // width = clamp(0.8*375 = 300) → 320; left = round((375 - 320) / 2) = 28.
    setViewport(375, 667);
    const geom = defaultGeometry();
    expect(geom.width).toBe(MIN_PANEL_WIDTH);
    expect(geom.left).toBe(28);
  });
});

describe('defaultGeometry — desktop centering is unchanged', () => {
  it('centers a 1152×720 panel on a 1440×900 viewport', () => {
    setViewport(1440, 900);
    expect(defaultGeometry()).toEqual({ top: 90, left: 144, width: 1152, height: 720 });
  });

  it('centers the 1200×800 cap on a 1920×1080 viewport', () => {
    setViewport(1920, 1080);
    expect(defaultGeometry()).toEqual({ top: 140, left: 360, width: 1200, height: 800 });
  });
});

describe('defaultGeometry — degenerate viewport', () => {
  it('returns the {top:0, left:0} origin and the minimum size on a 0×0 viewport', () => {
    setViewport(0, 0);
    const geom = defaultGeometry();
    expect(geom.top).toBe(0);
    expect(geom.left).toBe(0);
    expect(geom.width).toBe(MIN_PANEL_WIDTH);
    expect(geom.height).toBe(MIN_PANEL_HEIGHT);
  });
});

describe('defaultPosition / defaultSize agree with defaultGeometry', () => {
  for (const [w, h] of [
    [320, 568],
    [375, 667],
    [1440, 900],
  ] as const) {
    it(`are two views of the same rectangle at ${w}×${h}`, () => {
      setViewport(w, h);
      const geom = defaultGeometry();
      expect(defaultPosition()).toEqual({ top: geom.top, left: geom.left });
      expect(defaultSize()).toEqual({ width: geom.width, height: geom.height });
    });
  }
});
