// @vitest-environment jsdom

/**
 * Coverage for `clampSize` — width/height bounds clamping used by both
 * `loadSize` and the panel's resize handler / window-resize re-clamp effect.
 *
 * Caps are sourced from `MIN_PANEL_WIDTH / MIN_PANEL_HEIGHT / MAX_PANEL_WIDTH
 * / MAX_PANEL_HEIGHT` and the current viewport (`innerWidth -
 * SIZE_VIEWPORT_MARGIN`, `innerHeight - SIZE_VIEWPORT_MARGIN`). The viewport
 * upper bound matters when a saved size from a wider monitor is loaded on a
 * narrower one — the panel should shrink to fit, not render off-screen.
 */

import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import {
  clampSize,
  MAX_PANEL_HEIGHT,
  MAX_PANEL_WIDTH,
  MIN_PANEL_HEIGHT,
  MIN_PANEL_WIDTH,
} from '../state/tweak-state';

const ORIGINAL_INNER_WIDTH = window.innerWidth;
const ORIGINAL_INNER_HEIGHT = window.innerHeight;

function setViewport(w: number, h: number): void {
  Object.defineProperty(window, 'innerWidth', { value: w, configurable: true });
  Object.defineProperty(window, 'innerHeight', { value: h, configurable: true });
}

describe('clampSize', () => {
  beforeEach(() => {
    setViewport(1920, 1080);
  });

  afterEach(() => {
    setViewport(ORIGINAL_INNER_WIDTH, ORIGINAL_INNER_HEIGHT);
  });

  it('returns sizes inside the legal range unchanged', () => {
    const result = clampSize(800, 600);
    expect(result).toEqual({ width: 800, height: 600 });
  });

  it('clamps width to MIN_PANEL_WIDTH when smaller', () => {
    const result = clampSize(50, 400);
    expect(result.width).toBe(MIN_PANEL_WIDTH);
    expect(result.height).toBe(400);
  });

  it('clamps height to MIN_PANEL_HEIGHT when smaller', () => {
    const result = clampSize(800, 50);
    expect(result.width).toBe(800);
    expect(result.height).toBe(MIN_PANEL_HEIGHT);
  });

  it('clamps to MIN_PANEL_WIDTH × MIN_PANEL_HEIGHT for fully degenerate values', () => {
    const result = clampSize(0, 0);
    expect(result.width).toBe(MIN_PANEL_WIDTH);
    expect(result.height).toBe(MIN_PANEL_HEIGHT);
  });

  it('clamps width to MAX_PANEL_WIDTH on a huge viewport when caller passes a huge value', () => {
    setViewport(4000, 3000);
    const result = clampSize(99999, 99999);
    expect(result.width).toBe(MAX_PANEL_WIDTH);
    expect(result.height).toBe(MAX_PANEL_HEIGHT);
  });

  it('clamps to viewport-minus-margin on a small viewport (saved value too big)', () => {
    setViewport(1024, 768);
    const result = clampSize(1500, 900);
    // SIZE_VIEWPORT_MARGIN = 32, so caps are (1024-32, 768-32) = (992, 736).
    expect(result.width).toBe(992);
    expect(result.height).toBe(736);
  });

  it('respects MIN_PANEL_* even when the viewport is smaller than the minimum', () => {
    // Pathological tiny viewport — keep the minimum so the panel stays usable
    // when the user re-enlarges the window.
    setViewport(100, 100);
    const result = clampSize(50, 50);
    expect(result.width).toBe(MIN_PANEL_WIDTH);
    expect(result.height).toBe(MIN_PANEL_HEIGHT);
  });
});
