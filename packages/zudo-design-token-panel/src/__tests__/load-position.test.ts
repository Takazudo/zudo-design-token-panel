// @vitest-environment jsdom

/**
 * Centered-default behaviour for the panel's first-open position.
 *
 * Pre-fix: `DEFAULT_POSITION` was a hard-coded `{ top: 60, right: 20 }` static
 * constant, so fresh-localStorage installs always landed the panel in the
 * upper-right corner — far from where the user expects it.
 *
 * Post-fix: `defaultPosition()` computes a runtime viewport-centered position
 * (panelW = min(1200, 0.8 * innerWidth), centered both axes), and
 * `loadPosition()` falls back to that instead of `DEFAULT_POSITION` when no
 * saved value exists or the saved value is malformed. The static
 * `DEFAULT_POSITION` is retained as the SSR fallback inside
 * `defaultPosition()` (typeof window === 'undefined' branch).
 *
 * Saved-value behaviour is UNCHANGED — a valid `{top, right}` entry in
 * localStorage still loads verbatim, so existing users keep their dragged
 * position exactly as today.
 */

import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import {
  DEFAULT_POSITION,
  defaultPosition,
  getPositionKey,
  loadPosition,
  type PanelPosition,
} from '../state/tweak-state';
import { __resetPanelConfigForTests } from '../config/panel-config';
import { installFixturePanelConfig } from './_test-helpers';

const ORIGINAL_INNER_WIDTH = window.innerWidth;
const ORIGINAL_INNER_HEIGHT = window.innerHeight;

function setViewport(w: number, h: number): void {
  Object.defineProperty(window, 'innerWidth', { value: w, configurable: true });
  Object.defineProperty(window, 'innerHeight', { value: h, configurable: true });
}

describe('defaultPosition', () => {
  beforeEach(() => {
    installFixturePanelConfig();
    localStorage.clear();
  });

  afterEach(() => {
    setViewport(ORIGINAL_INNER_WIDTH, ORIGINAL_INNER_HEIGHT);
    localStorage.clear();
    __resetPanelConfigForTests();
  });

  it('returns the viewport center for a 1440×900 viewport (panel 1152×720)', () => {
    setViewport(1440, 900);
    const pos = defaultPosition();
    // panelW = min(1200, 0.8*1440) = min(1200, 1152) = 1152
    // panelH = min(800, 0.8*900)  = min(800, 720)  = 720
    // top  = round((900 - 720) / 2) = 90
    // right = round((1440 - 1152) / 2) = 144
    expect(pos.top).toBeGreaterThanOrEqual(88);
    expect(pos.top).toBeLessThanOrEqual(92);
    expect(pos.right).toBeGreaterThanOrEqual(142);
    expect(pos.right).toBeLessThanOrEqual(146);
  });

  it('returns the viewport center for a 1920×1080 viewport (panel capped at 1200×800)', () => {
    setViewport(1920, 1080);
    const pos = defaultPosition();
    // panelW = min(1200, 0.8*1920) = min(1200, 1536) = 1200
    // panelH = min(800, 0.8*1080) = min(800, 864) = 800
    // top  = round((1080 - 800) / 2) = 140
    // right = round((1920 - 1200) / 2) = 360
    expect(pos.top).toBeGreaterThanOrEqual(138);
    expect(pos.top).toBeLessThanOrEqual(142);
    expect(pos.right).toBeGreaterThanOrEqual(358);
    expect(pos.right).toBeLessThanOrEqual(362);
  });

  it('returns {top:0, right:0} on a degenerate 0×0 viewport (no negative offsets)', () => {
    setViewport(0, 0);
    const pos = defaultPosition();
    // panelW = min(1200, 0) = 0; panelH = min(800, 0) = 0
    // top  = max(0, round(0)) = 0
    // right = max(0, round(0)) = 0
    expect(pos.top).toBe(0);
    expect(pos.right).toBe(0);
  });

  it('returns deterministic non-negative offsets for a narrow viewport (375×667)', () => {
    setViewport(375, 667);
    const pos = defaultPosition();
    // panelW = min(1200, 0.8*375) = min(1200, 300) = 300
    // panelH = min(800, 0.8*667) = min(800, 533.6) = 533.6
    // top  = round((667 - 533.6) / 2) = round(66.7) ≈ 67
    // right = round((375 - 300) / 2) = round(37.5) ≈ 38
    expect(pos.top).toBeGreaterThanOrEqual(65);
    expect(pos.top).toBeLessThanOrEqual(69);
    expect(pos.right).toBeGreaterThanOrEqual(36);
    expect(pos.right).toBeLessThanOrEqual(40);
  });
});

describe('loadPosition', () => {
  beforeEach(() => {
    installFixturePanelConfig();
    localStorage.clear();
    setViewport(1440, 900);
  });

  afterEach(() => {
    setViewport(ORIGINAL_INNER_WIDTH, ORIGINAL_INNER_HEIGHT);
    localStorage.clear();
    __resetPanelConfigForTests();
  });

  it('returns defaultPosition() (centered) when localStorage is empty (no saved entry)', () => {
    const pos = loadPosition();
    const expected = defaultPosition();
    expect(pos.top).toBe(expected.top);
    expect(pos.right).toBe(expected.right);
    // Sanity: centered values, not the static {60, 20}.
    expect(pos.top).not.toBe(DEFAULT_POSITION.top);
    expect(pos.right).not.toBe(DEFAULT_POSITION.right);
  });

  it('returns the saved value verbatim when localStorage has a valid entry', () => {
    const saved: PanelPosition = { top: 300, right: 400 };
    localStorage.setItem(getPositionKey(), JSON.stringify(saved));
    const pos = loadPosition();
    expect(pos.top).toBe(300);
    expect(pos.right).toBe(400);
  });

  it('returns defaultPosition() when the saved entry is malformed JSON', () => {
    localStorage.setItem(getPositionKey(), '{not valid json');
    const pos = loadPosition();
    const expected = defaultPosition();
    expect(pos.top).toBe(expected.top);
    expect(pos.right).toBe(expected.right);
  });

  it('returns defaultPosition() when the saved entry has missing/non-numeric fields', () => {
    localStorage.setItem(getPositionKey(), JSON.stringify({ top: 'oops', right: 20 }));
    const pos = loadPosition();
    const expected = defaultPosition();
    expect(pos.top).toBe(expected.top);
    expect(pos.right).toBe(expected.right);
  });

  it('returns defaultPosition() when the saved entry is a JSON literal with the wrong shape', () => {
    localStorage.setItem(getPositionKey(), JSON.stringify({ unrelated: 'field' }));
    const pos = loadPosition();
    const expected = defaultPosition();
    expect(pos.top).toBe(expected.top);
    expect(pos.right).toBe(expected.right);
  });
});
