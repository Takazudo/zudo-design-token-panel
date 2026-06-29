// @vitest-environment jsdom

/**
 * Coverage for `defaultSize` + `loadSize` — the size storage track that
 * mirrors `loadPosition`/`savePosition` for the user-resized panel
 * dimensions.
 *
 * Save semantics use `saveSize`; `loadSize` is the read-side that the panel
 * calls on mount, and it falls back to `defaultSize()` on missing /
 * malformed entries, matching how `loadPosition` falls back to
 * `defaultPosition()`.
 */

import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import {
  defaultSize,
  getSizeKey,
  loadSize,
  MIN_PANEL_HEIGHT,
  MIN_PANEL_WIDTH,
  type PanelSize,
} from '../state/tweak-state';
import { __resetPanelConfigForTests } from '../config/panel-config';
import { installFixturePanelConfig } from './_test-helpers';

const ORIGINAL_INNER_WIDTH = window.innerWidth;
const ORIGINAL_INNER_HEIGHT = window.innerHeight;

function setViewport(w: number, h: number): void {
  Object.defineProperty(window, 'innerWidth', { value: w, configurable: true });
  Object.defineProperty(window, 'innerHeight', { value: h, configurable: true });
}

describe('defaultSize', () => {
  beforeEach(() => {
    installFixturePanelConfig();
    localStorage.clear();
  });

  afterEach(() => {
    setViewport(ORIGINAL_INNER_WIDTH, ORIGINAL_INNER_HEIGHT);
    localStorage.clear();
    __resetPanelConfigForTests();
  });

  it('matches the historical min(1200, 0.8*vw) × min(800, 0.8*vh) rule on a 1440×900 viewport', () => {
    setViewport(1440, 900);
    const size = defaultSize();
    expect(size.width).toBeCloseTo(1152); // 0.8 * 1440
    expect(size.height).toBeCloseTo(720); // 0.8 * 900
  });

  it('caps at 1200 × 800 on a large 1920×1080 viewport', () => {
    setViewport(1920, 1080);
    const size = defaultSize();
    expect(size.width).toBe(1200);
    expect(size.height).toBe(800);
  });

  it('clamps up to the MIN_PANEL floor on a phone-width viewport (375×667)', () => {
    // 0.8 * 375 = 300, below MIN_PANEL_WIDTH (320) — the panel stays usable
    // and draggable/resizable at this width since narrow mode was removed.
    setViewport(375, 667);
    const size = defaultSize();
    expect(size.width).toBe(MIN_PANEL_WIDTH);
    expect(size.height).toBeCloseTo(0.8 * 667); // 533.6, above MIN_PANEL_HEIGHT
  });
});

describe('loadSize', () => {
  beforeEach(() => {
    installFixturePanelConfig();
    localStorage.clear();
    setViewport(1920, 1080);
  });

  afterEach(() => {
    setViewport(ORIGINAL_INNER_WIDTH, ORIGINAL_INNER_HEIGHT);
    localStorage.clear();
    __resetPanelConfigForTests();
  });

  it('returns defaultSize() when localStorage is empty (no saved entry)', () => {
    const size = loadSize();
    const expected = defaultSize();
    expect(size.width).toBe(expected.width);
    expect(size.height).toBe(expected.height);
  });

  it('returns the saved value verbatim when localStorage has a valid entry within bounds', () => {
    const saved: PanelSize = { width: 900, height: 600 };
    localStorage.setItem(getSizeKey(), JSON.stringify(saved));
    const size = loadSize();
    expect(size.width).toBe(900);
    expect(size.height).toBe(600);
  });

  it('clamps an oversized saved value to the current viewport', () => {
    setViewport(1024, 768);
    const saved: PanelSize = { width: 5000, height: 5000 };
    localStorage.setItem(getSizeKey(), JSON.stringify(saved));
    const size = loadSize();
    // SIZE_VIEWPORT_MARGIN = 32; caps = (1024-32, 768-32).
    expect(size.width).toBe(992);
    expect(size.height).toBe(736);
  });

  it('clamps an undersized saved value up to MIN_PANEL_WIDTH × MIN_PANEL_HEIGHT', () => {
    const saved: PanelSize = { width: 10, height: 10 };
    localStorage.setItem(getSizeKey(), JSON.stringify(saved));
    const size = loadSize();
    expect(size.width).toBe(MIN_PANEL_WIDTH);
    expect(size.height).toBe(MIN_PANEL_HEIGHT);
  });

  it('returns defaultSize() when the saved entry is malformed JSON', () => {
    localStorage.setItem(getSizeKey(), '{not valid json');
    const size = loadSize();
    const expected = defaultSize();
    expect(size.width).toBe(expected.width);
    expect(size.height).toBe(expected.height);
  });

  it('returns defaultSize() when the saved entry has missing/non-numeric fields', () => {
    localStorage.setItem(getSizeKey(), JSON.stringify({ width: 'oops', height: 600 }));
    const size = loadSize();
    const expected = defaultSize();
    expect(size.width).toBe(expected.width);
    expect(size.height).toBe(expected.height);
  });

  it('returns defaultSize() when the saved entry has the wrong shape', () => {
    localStorage.setItem(getSizeKey(), JSON.stringify({ unrelated: 'field' }));
    const size = loadSize();
    const expected = defaultSize();
    expect(size.width).toBe(expected.width);
    expect(size.height).toBe(expected.height);
  });
});
