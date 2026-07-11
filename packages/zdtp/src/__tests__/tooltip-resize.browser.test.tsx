/**
 * Browser-mode regression test for issue #516 — tooltip stale position after
 * panel resize.
 *
 * Bug: the tooltip's top/left is computed from `triggerEl.getBoundingClientRect()`
 * inside a render-driven `useEffect` (tooltip.tsx). Grip-drag resize
 * (panel.tsx's `handleResizeStart`) writes `.tokenpanel-shell`'s width/height
 * directly to the DOM WITHOUT a Preact re-render (perf choice), so a tooltip
 * that is already visible and never left its trigger (no mouseleave/mouseenter
 * cycle) had no signal telling it to recompute — it just sat at the
 * pre-resize coordinates.
 *
 * Fix under test: while a tooltip is visible, tooltip.tsx observes the
 * trigger's `.tokenpanel-shell` ancestor via a real ResizeObserver and also
 * listens for window 'resize' — both hide the tooltip (same UX as the
 * existing scroll-hide behavior), so a stale position is never shown; the
 * user sees it again, correctly positioned, only on the next hover.
 *
 * This must run against a REAL ResizeObserver (Chromium, via the `browser`
 * vitest project) — jsdom does not implement ResizeObserver at all, so the
 * unit-test suite (controls/__tests__/tooltip.test.tsx) can only exercise
 * this path with a hand-rolled stand-in. A body-level observer would never
 * fire here: the panel is `position: fixed`, so resizing it does not resize
 * `document.body`. This test drives an ACTUAL grip-drag (mousedown on
 * `.tokenpanel-resize-handle` → mousemove → mouseup), the same gesture
 * `panel-shell-drag.browser.test.tsx` uses, to prove the shell-scoped
 * observer — not a body observer — is what catches it.
 */

import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { render } from 'preact';
import { act } from 'preact/test-utils';
import DesignTokenTweakPanel from '../panel';
import { getOpenKey, getPositionKey, getSizeKey } from '../state/tweak-state';
import { FIXTURE_PANEL_CONFIG, flushEffects } from './_test-helpers';

const CFG = FIXTURE_PANEL_CONFIG;
const OPEN_KEY = getOpenKey(CFG);
const POSITION_KEY = getPositionKey(CFG);
const SIZE_KEY = getSizeKey(CFG);

// Same seed as panel-shell-drag.browser.test.tsx: near the origin (room to
// grow/shrink in every direction) and intentionally small so a grip-drag grow
// never hits the viewport cap on a headless Playwright window.
const SEED_POSITION = { top: 100, left: 100 };
const SEED_SIZE = { width: 200, height: 200 };

let container: HTMLDivElement;

/** Fire a native MouseEvent on `el` with explicit clientX/clientY. */
function fireMouse(
  el: Element | Document,
  type: 'mousedown' | 'mousemove' | 'mouseup',
  clientX: number,
  clientY: number,
): void {
  el.dispatchEvent(
    new MouseEvent(type, {
      bubbles: true,
      cancelable: true,
      clientX,
      clientY,
    }),
  );
}

function getResizeHandle(): HTMLElement {
  const el = container.querySelector<HTMLElement>('.tokenpanel-resize-handle');
  if (!el) throw new Error('.tokenpanel-resize-handle not found');
  return el;
}

/** First tooltip trigger on the default (color) tab — a PaletteSelector row. */
function getFirstTrigger(): HTMLElement {
  const el = container.querySelector<HTMLElement>('.tokenpanel-palette-trigger');
  if (!el) throw new Error('.tokenpanel-palette-trigger not found');
  return el;
}

function getTooltip(): HTMLElement {
  const el = document.querySelector<HTMLElement>('.tokenpanel-tooltip');
  if (!el) throw new Error('.tokenpanel-tooltip not found');
  return el;
}

function isTooltipVisible(): boolean {
  return getTooltip().getAttribute('data-show') === 'true';
}

beforeEach(() => {
  localStorage.clear();
  localStorage.setItem(OPEN_KEY, '1');
  localStorage.setItem(POSITION_KEY, JSON.stringify(SEED_POSITION));
  localStorage.setItem(SIZE_KEY, JSON.stringify(SEED_SIZE));

  container = document.createElement('div');
  document.body.appendChild(container);

  act(() => {
    render(<DesignTokenTweakPanel instanceConfig={CFG} />, container);
  });
});

afterEach(async () => {
  await flushEffects();
  act(() => {
    render(null, container);
  });
  container.remove();
  localStorage.clear();
});

describe('tooltip — hides on actual panel grip-drag resize (#516)', () => {
  it('an in-progress grip-drag resize hides a visible tooltip', async () => {
    await flushEffects();
    const trigger = getFirstTrigger();

    act(() => {
      trigger.dispatchEvent(new MouseEvent('mouseenter', { bubbles: true }));
    });
    expect(isTooltipVisible()).toBe(true);

    // Real grip-drag: mousedown on the resize handle, then mousemove — this
    // is the exact gesture that mutates `.tokenpanel-shell`'s width/height
    // directly (handleResizeStart in panel.tsx) without ever re-rendering the
    // tooltip. The mouse never crosses the trigger, so no mouseleave/mouseenter
    // fires — the only thing that can hide the tooltip is the shell's
    // ResizeObserver picking up the style mutation.
    const grip = getResizeHandle();
    fireMouse(grip, 'mousedown', 500, 500);
    fireMouse(document, 'mousemove', 580, 560);

    // ResizeObserver callbacks are scheduled by the browser engine, not by
    // Preact — flushEffects' rAF+rAF+50ms wait covers both.
    await flushEffects();

    expect(isTooltipVisible()).toBe(false);

    fireMouse(document, 'mouseup', 580, 560);
  });

  it('window resize also hides a visible tooltip', async () => {
    await flushEffects();
    const trigger = getFirstTrigger();

    act(() => {
      trigger.dispatchEvent(new MouseEvent('mouseenter', { bubbles: true }));
    });
    expect(isTooltipVisible()).toBe(true);

    window.dispatchEvent(new Event('resize'));
    await flushEffects();

    expect(isTooltipVisible()).toBe(false);
  });

  it('re-hovering after a resize shows the tooltip adjacent to the trigger, not floating at stale coordinates', async () => {
    await flushEffects();
    const trigger = getFirstTrigger();

    act(() => {
      trigger.dispatchEvent(new MouseEvent('mouseenter', { bubbles: true }));
    });
    expect(isTooltipVisible()).toBe(true);

    const grip = getResizeHandle();
    fireMouse(grip, 'mousedown', 500, 500);
    fireMouse(document, 'mousemove', 700, 640); // grow by (+200, +140)
    await flushEffects();
    expect(isTooltipVisible()).toBe(false); // hidden by the resize, per above
    fireMouse(document, 'mouseup', 700, 640);

    // Re-hover the SAME trigger element after the resize.
    act(() => {
      trigger.dispatchEvent(new MouseEvent('mouseleave', { bubbles: true }));
    });
    act(() => {
      trigger.dispatchEvent(new MouseEvent('mouseenter', { bubbles: true }));
    });
    expect(isTooltipVisible()).toBe(true);

    const tooltip = getTooltip();
    const triggerRect = trigger.getBoundingClientRect();
    const tipRect = tooltip.getBoundingClientRect();

    // Correct-position assertion: the tip must be immediately adjacent
    // (within the 6px gap tooltip.tsx uses, plus a little slack for
    // sub-pixel rounding) to the trigger's CURRENT (post-resize) rect —
    // either directly above or directly below it. If the fix regressed and
    // the tooltip re-showed at a cached pre-resize rect instead of a fresh
    // getBoundingClientRect() read, this would fail whenever the resize (a
    // +200/+140 grow from a 200x200 seed) shifted the panel's internal
    // layout enough to move the tip out of the gap tolerance.
    const gapTolerance = 10;
    const isAboveTrigger = Math.abs(tipRect.bottom - triggerRect.top) <= gapTolerance;
    const isBelowTrigger = Math.abs(tipRect.top - triggerRect.bottom) <= gapTolerance;
    expect(isAboveTrigger || isBelowTrigger).toBe(true);
  });
});
