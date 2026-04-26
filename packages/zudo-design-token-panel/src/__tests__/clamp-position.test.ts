// @vitest-environment jsdom

/**
 * Regression tests for PR #1440 review item B2 — `clampPosition` `panelHeight`
 * tautology bug, plus the codex-review follow-up that caught a symmetric-fix
 * UX regression.
 *
 * The pre-fix code had:
 *
 *   const minTop = -(VISIBLE_MIN / 2);
 *   const maxTop = Math.max(window.innerHeight - VISIBLE_MIN, panelHeight > 0 ? 0 : 0);
 *
 * `panelHeight > 0 ? 0 : 0` was a tautology — both branches yielded 0 — so
 * `panelHeight` was effectively dead code on the upper bound. The original
 * lower-bound `-(VISIBLE_MIN / 2)` was correct in spirit (kept the header
 * visible) but the code looked broken because of the tautology and the
 * unused parameter.
 *
 * The first fix attempt mirrored the horizontal axis symmetrically:
 *
 *   const minTop = -(panelHeight - VISIBLE_MIN);
 *   const maxTop = window.innerHeight - VISIBLE_MIN;
 *
 * That looked right in isolation but introduced a UX regression — the drag
 * handle is the panel header (`panel.tsx` attaches `onMouseDown` to
 * `.tokenpanel-header`), which sits at the top of the panel. With the
 * symmetric lower bound, an upward drag could push the entire header above
 * the viewport, leaving only the footer visible and the panel ungrippable.
 *
 * The shipped fix preserves the original lower-bound policy (header stays
 * visible) but removes the tautology and uses the simpler `maxTop`:
 *
 *   const minTop = -(VISIBLE_MIN / 2);
 *   const maxTop = window.innerHeight - VISIBLE_MIN;
 *
 * `panelHeight` stays on the signature so callers don't churn, but is
 * currently unused on the vertical axis (the panel is CSS-clamped to the
 * viewport via `maxHeight: calc(100vh - 32px)` so a "tall panel" carve-out
 * isn't needed today).
 *
 * These tests pin the asymmetric vertical clamp + the symmetric horizontal
 * clamp.
 */

import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { clampPosition, VISIBLE_MIN } from '../state/tweak-state';

const ORIGINAL_INNER_WIDTH = window.innerWidth;
const ORIGINAL_INNER_HEIGHT = window.innerHeight;

function setViewport(w: number, h: number): void {
  // jsdom allows direct assignment to window.innerWidth / innerHeight, but
  // some environments require a configurable property descriptor. Wrap in
  // Object.defineProperty so this works under both.
  Object.defineProperty(window, 'innerWidth', { value: w, configurable: true });
  Object.defineProperty(window, 'innerHeight', { value: h, configurable: true });
}

describe('clampPosition', () => {
  beforeEach(() => {
    setViewport(1024, 768);
  });

  afterEach(() => {
    setViewport(ORIGINAL_INNER_WIDTH, ORIGINAL_INNER_HEIGHT);
  });

  it('returns positions inside the legal range unchanged', () => {
    const result = clampPosition(100, 50, 600, 500);
    expect(result).toEqual({ top: 100, right: 50 });
  });

  it('clamps top to maxTop = innerHeight - VISIBLE_MIN', () => {
    // Try to push the panel below the bottom edge — clamp to the maximum
    // (so 60px of the panel-top, including the header, stays visible).
    const result = clampPosition(99999, 0, 600, 500);
    expect(result.top).toBe(window.innerHeight - VISIBLE_MIN);
  });

  it('clamps top to minTop = -(VISIBLE_MIN / 2) — keeps the header reachable', () => {
    // Try to push the panel above the top edge — clamp to a small upward
    // overshoot so the header (the only drag handle) stays visible.
    // Symmetric mirroring of the horizontal axis would let the header
    // leave the viewport entirely; that's the regression codex flagged in
    // the review of the first B2 fix attempt.
    const result = clampPosition(-99999, 0, 600, 500);
    expect(result.top).toBe(-(VISIBLE_MIN / 2));
  });

  it('clamps right symmetrically on the horizontal axis (panelWidth scales the lower bound)', () => {
    // Maximum: panel can be pushed past the left edge but VISIBLE_MIN must
    // remain visible.
    const farLeft = clampPosition(0, 99999, 600, 500);
    expect(farLeft.right).toBe(window.innerWidth - VISIBLE_MIN);
    // Minimum: panel can be pushed past the right edge by panelWidth -
    // VISIBLE_MIN. The horizontal axis IS symmetric because the header
    // spans the full panel width — any leftover horizontal slice contains
    // a draggable strip of the header.
    const farRight = clampPosition(0, -99999, 600, 500);
    expect(farRight.right).toBe(-(600 - VISIBLE_MIN));
  });

  it('vertical lower bound does NOT depend on panelHeight (regression for B2 + codex review follow-up)', () => {
    // Both a tall and a short panel land at the same minTop = -(VISIBLE_MIN/2).
    // The asymmetry with the horizontal axis is intentional: header-as-drag-
    // handle means we can't mirror the horizontal lower bound vertically.
    const small = clampPosition(-99999, 0, 600, 200);
    const large = clampPosition(-99999, 0, 600, 800);
    expect(small.top).toBe(-(VISIBLE_MIN / 2));
    expect(large.top).toBe(-(VISIBLE_MIN / 2));
  });

  it('produces a deterministic result on degenerate (sub-VISIBLE_MIN) viewports — PR #1440 M-13', () => {
    // PR #1440 review item M-13 — when the viewport is narrower / shorter
    // than VISIBLE_MIN, the raw maxTop / maxRight could fall below their
    // respective minimums and Math.min/Math.max would emit Math.max's
    // first argument. Pin the actual return so a future regression in
    // bound-collapse logic is caught.
    setViewport(20, 20);
    const result = clampPosition(0, 0, 600, 500);
    // Vertical: minTopRaw = -30, maxTopRaw = -40 (innerHeight - VISIBLE_MIN).
    // Collapse maxTop to minTopRaw — both bounds become -30.
    expect(result.top).toBe(-(VISIBLE_MIN / 2));
    // Horizontal: minRight = -540 (-(panelWidth - VISIBLE_MIN)),
    // maxRightRaw = -40. minRight < maxRightRaw so no collapse needed.
    expect(result.right).toBeGreaterThanOrEqual(-540);
    expect(result.right).toBeLessThanOrEqual(-40);
  });

  it('handles a viewport narrower than panelWidth without inverting horizontal bounds', () => {
    // When innerWidth < VISIBLE_MIN, maxRightRaw goes negative below
    // minRight; the collapse keeps both at minRight so the result stays
    // deterministic.
    setViewport(20, 800);
    const result = clampPosition(100, 0, 600, 500);
    expect(Number.isFinite(result.right)).toBe(true);
    expect(Number.isFinite(result.top)).toBe(true);
  });
});
