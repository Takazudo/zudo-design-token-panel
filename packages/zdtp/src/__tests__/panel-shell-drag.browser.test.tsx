/**
 * Browser-mode gesture pipeline tests for the panel shell (F37).
 *
 * Covers:
 *  1. Drag-to-move: mousedown on header → mousemove → mouseup sequence
 *     drives the DOM-write path (direct style write during drag, state
 *     commit on mouseup) and persists position to localStorage.
 *  2. Resize grip: mousedown on resize handle → mousemove → mouseup
 *     drives the width/height DOM-write path and persists size.
 *  3. Viewport-edge clamping: a drag/resize delta that would exceed the
 *     viewport bounds is clamped by clampPosition / clampSize before the
 *     style is written.
 *  4. Persistence across remount: after a mouseup commit, unmounting and
 *     re-mounting the panel restores the position/size from localStorage.
 *
 * Environment: Playwright Chromium (vitest browser project, *.browser.test.tsx).
 * Real getBoundingClientRect is available — no stubbing needed.
 *
 * Deflaking contract (deflaking-recipe.mdx §4):
 *  - No fixed sleeps. The only timed wait is flushEffects() which is keyed
 *    to Preact's documented rAF + setTimeout(35) scheduler path.
 *  - Mouse events are dispatched synchronously; DOM writes from the handlers
 *    are also synchronous. Assertions after dispatch are immediate.
 *  - Persistence (localStorage) is synchronous in savePosition/saveSize —
 *    no wait needed before the localStorage assertions.
 */

import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { render } from 'preact';
import { act } from 'preact/test-utils';
import DesignTokenTweakPanel from '../panel';
import { getOpenKey, getPositionKey, getSizeKey, VISIBLE_MIN, MIN_PANEL_WIDTH, MIN_PANEL_HEIGHT } from '../state/tweak-state';
import { FIXTURE_PANEL_CONFIG } from './_test-helpers';

// ---------------------------------------------------------------------------
// Config — use the fixture config so color cluster + tabs are valid.
// Passed as prop; configurePanel() call not required.
// ---------------------------------------------------------------------------

const CFG = FIXTURE_PANEL_CONFIG;
const OPEN_KEY = getOpenKey(CFG);
const POSITION_KEY = getPositionKey(CFG);
const SIZE_KEY = getSizeKey(CFG);

// Known seed values — position kept near the origin so there is room to
// drag in both directions without hitting viewport edges. Size is kept
// intentionally small (200×200) so drag-grow tests never hit the viewport
// cap even on narrow Playwright headless windows.
const SEED_POSITION = { top: 100, left: 100 };
const SEED_SIZE = { width: 200, height: 200 };

// ---------------------------------------------------------------------------
// Test harness
// ---------------------------------------------------------------------------

let container: HTMLDivElement;

/**
 * Wait for Preact's effect scheduler to settle.
 *
 * Wait-ok: the 50ms constant covers Preact's rAF + setTimeout(35) flush
 * path. There is no observable "all effects done" signal from outside Preact
 * internals, so a duration wait is the accepted technique here (mirrors
 * _test-helpers.ts::flushEffects).
 */
async function flushEffects(): Promise<void> {
  await new Promise<void>((resolve) =>
    requestAnimationFrame(() => requestAnimationFrame(() => resolve())),
  );
  await new Promise<void>((resolve) => setTimeout(resolve, 50));
}

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

/** Get the panel shell element. Throws if not found. */
function getShell(): HTMLElement {
  const el = container.querySelector<HTMLElement>('.tokenpanel-shell');
  if (!el) throw new Error('panel shell not found — is the panel open?');
  return el;
}

/** Get the panel header element (drag-to-move area). */
function getHeader(): HTMLElement {
  const el = container.querySelector<HTMLElement>('.tokenpanel-header');
  if (!el) throw new Error('.tokenpanel-header not found');
  return el;
}

/** Get the resize handle element. */
function getResizeHandle(): HTMLElement {
  const el = container.querySelector<HTMLElement>('.tokenpanel-resize-handle');
  if (!el) throw new Error('.tokenpanel-resize-handle not found');
  return el;
}

/** Read the shell's inline left and top as numbers (px stripped). */
function shellPosition(shell: HTMLElement): { left: number; top: number } {
  return {
    left: parseFloat(shell.style.left),
    top: parseFloat(shell.style.top),
  };
}

/** Read the shell's inline width and height as numbers (px stripped). */
function shellSize(shell: HTMLElement): { width: number; height: number } {
  return {
    width: parseFloat(shell.style.width),
    height: parseFloat(shell.style.height),
  };
}

beforeEach(() => {
  // Seed localStorage with known open / position / size state so the panel
  // mounts open at a deterministic viewport-safe position.
  localStorage.clear();
  localStorage.setItem(OPEN_KEY, '1');
  localStorage.setItem(POSITION_KEY, JSON.stringify(SEED_POSITION));
  localStorage.setItem(SIZE_KEY, JSON.stringify(SEED_SIZE));

  container = document.createElement('div');
  document.body.appendChild(container);

  // Render and let mount effects settle.
  act(() => {
    render(<DesignTokenTweakPanel instanceConfig={CFG} />, container);
  });
});

afterEach(async () => {
  // Flush any pending effects before unmounting to avoid stale listeners.
  await flushEffects();
  act(() => {
    render(null, container);
  });
  container.remove();
  localStorage.clear();
});

// ---------------------------------------------------------------------------
// 1. Drag-to-move — pointer-sequence tests
// ---------------------------------------------------------------------------

describe('panel drag-to-move — pointer sequence', () => {
  it('pointermove after pointerdown on header moves the shell inline style', async () => {
    await flushEffects();
    const shell = getShell();
    const header = getHeader();

    // Mousedown on the header (not on a button/tab — fires on the header div itself)
    fireMouse(header, 'mousedown', 200, 200);
    // Mousemove: delta (+80, +50)
    fireMouse(document, 'mousemove', 280, 250);

    // DOM is written synchronously during mousemove. The shell's inline style
    // should reflect the delta from the seed position.
    // Expected: left = 100 + 80 = 180, top = 100 + 50 = 150 (both within viewport)
    const pos = shellPosition(shell);
    expect(pos.left).toBeCloseTo(180, 0);
    expect(pos.top).toBeCloseTo(150, 0);

    fireMouse(document, 'mouseup', 280, 250);
  });

  it('multiple mousemoves track the latest delta', async () => {
    await flushEffects();
    const shell = getShell();
    const header = getHeader();

    fireMouse(header, 'mousedown', 200, 200);
    fireMouse(document, 'mousemove', 250, 230); // delta (+50, +30) → (150, 130)
    fireMouse(document, 'mousemove', 260, 240); // delta (+60, +40) → (160, 140)

    const pos = shellPosition(shell);
    expect(pos.left).toBeCloseTo(160, 0);
    expect(pos.top).toBeCloseTo(140, 0);

    fireMouse(document, 'mouseup', 260, 240);
  });

  it('mouseup commits position to localStorage', async () => {
    await flushEffects();
    const header = getHeader();

    fireMouse(header, 'mousedown', 200, 200);
    fireMouse(document, 'mousemove', 300, 270); // delta (+100, +70)
    fireMouse(document, 'mouseup', 300, 270);

    // savePosition writes synchronously on mouseup.
    const stored = JSON.parse(localStorage.getItem(POSITION_KEY) ?? 'null') as {
      top: number;
      left: number;
    } | null;
    expect(stored).not.toBeNull();
    // Seed was (100, 100); delta (100, 70) → (200, 170) — within viewport
    expect(stored!.left).toBeCloseTo(200, 0);
    expect(stored!.top).toBeCloseTo(170, 0);
  });

  it('mousemove before pointerdown does NOT move the shell', async () => {
    await flushEffects();
    const shell = getShell();

    // Force a repaint so the style reflects the mount-time loaded position.
    const initialLeft = shell.style.left;
    const initialTop = shell.style.top;

    // Move without a preceding mousedown — drag session is not active.
    fireMouse(document, 'mousemove', 999, 999);

    expect(shell.style.left).toBe(initialLeft);
    expect(shell.style.top).toBe(initialTop);
  });

  it('after mouseup, further mousemove does NOT move the shell', async () => {
    await flushEffects();
    const shell = getShell();
    const header = getHeader();

    fireMouse(header, 'mousedown', 200, 200);
    fireMouse(document, 'mousemove', 250, 230);
    fireMouse(document, 'mouseup', 250, 230);

    const leftAfterUp = shell.style.left;
    const topAfterUp = shell.style.top;

    // A subsequent move must not move the panel.
    fireMouse(document, 'mousemove', 999, 999);

    expect(shell.style.left).toBe(leftAfterUp);
    expect(shell.style.top).toBe(topAfterUp);
  });
});

// ---------------------------------------------------------------------------
// 2. Drag-to-move — viewport-edge clamping
// ---------------------------------------------------------------------------

describe('panel drag-to-move — viewport-edge clamping', () => {
  it('clamped to right edge: left cannot exceed innerWidth − VISIBLE_MIN', async () => {
    await flushEffects();
    const shell = getShell();
    const header = getHeader();

    // Seed position is (100, 100). Drag far right: startX=200, moveX=100000.
    fireMouse(header, 'mousedown', 200, 200);
    fireMouse(document, 'mousemove', 100200, 200); // enormous delta right

    const pos = shellPosition(shell);
    // Right clamp: maxLeft = innerWidth - VISIBLE_MIN
    const maxLeft = window.innerWidth - VISIBLE_MIN;
    expect(pos.left).toBeLessThanOrEqual(maxLeft + 0.5); // allow fp rounding
    // Also should not be the raw (100 + 99800) = 100100 value
    expect(pos.left).toBeLessThan(10000);

    fireMouse(document, 'mouseup', 100200, 200);
  });

  it('clamped to top: top cannot exceed innerHeight − VISIBLE_MIN', async () => {
    await flushEffects();
    const shell = getShell();
    const header = getHeader();

    fireMouse(header, 'mousedown', 200, 200);
    fireMouse(document, 'mousemove', 200, 100200); // enormous delta downward

    const pos = shellPosition(shell);
    const maxTop = window.innerHeight - VISIBLE_MIN;
    expect(pos.top).toBeLessThanOrEqual(maxTop + 0.5);
    expect(pos.top).toBeLessThan(10000);

    fireMouse(document, 'mouseup', 200, 100200);
  });

  it('clamped at left edge: left floor keeps VISIBLE_MIN strip on-screen', async () => {
    await flushEffects();
    const shell = getShell();
    const header = getHeader();
    // panelWidth from shell inline style (set from seeded size = SEED_SIZE.width)
    const panelWidth = parseFloat(shell.style.width) || SEED_SIZE.width;

    fireMouse(header, 'mousedown', 200, 200);
    fireMouse(document, 'mousemove', -100000, 200); // enormous delta left

    const pos = shellPosition(shell);
    const minLeft = -(panelWidth - VISIBLE_MIN);
    expect(pos.left).toBeGreaterThanOrEqual(minLeft - 0.5);
    expect(pos.left).toBeGreaterThan(-10000);

    fireMouse(document, 'mouseup', -100000, 200);
  });
});

// ---------------------------------------------------------------------------
// 3. Drag-to-move — persistence across remount
// ---------------------------------------------------------------------------

describe('panel drag-to-move — persistence across remount', () => {
  it('dragged position restores from localStorage after remount', async () => {
    await flushEffects();
    const header = getHeader();

    // Drag by (+60, +40)
    fireMouse(header, 'mousedown', 200, 200);
    fireMouse(document, 'mousemove', 260, 240);
    fireMouse(document, 'mouseup', 260, 240);

    // Read the position that was persisted.
    const stored = JSON.parse(localStorage.getItem(POSITION_KEY) ?? 'null') as {
      top: number;
      left: number;
    };
    expect(stored).not.toBeNull();

    // Unmount the panel.
    act(() => {
      render(null, container);
    });
    await flushEffects();

    // Re-mount with the same config (same storage prefix → reads the same keys).
    act(() => {
      render(<DesignTokenTweakPanel instanceConfig={CFG} />, container);
    });
    await flushEffects();

    const shell = getShell();
    const restoredPos = shellPosition(shell);

    // After remount the shell style reflects the persisted position.
    expect(restoredPos.left).toBeCloseTo(stored.left, 0);
    expect(restoredPos.top).toBeCloseTo(stored.top, 0);
  });
});

// ---------------------------------------------------------------------------
// 4. Resize grip — pointer-sequence tests
// ---------------------------------------------------------------------------

describe('panel resize-grip — pointer sequence', () => {
  it('pointermove after pointerdown on grip grows the shell width and height', async () => {
    await flushEffects();
    const shell = getShell();
    const grip = getResizeHandle();

    const initialSize = shellSize(shell);

    // Grip mousedown at (500, 500), then move right/down by (+80, +60).
    // SEED_SIZE (200×200) is intentionally small so the resulting 280×260 panel
    // fits well within any realistic viewport.
    fireMouse(grip, 'mousedown', 500, 500);
    fireMouse(document, 'mousemove', 580, 560);

    const size = shellSize(shell);
    // Clamp to viewport bounds just in case (defensive — should not trigger with
    // seed 200 + delta 80 on any Playwright headless viewport ≥ 414px).
    const maxW = window.innerWidth - 32; // SIZE_VIEWPORT_MARGIN = 32
    const maxH = window.innerHeight - 32;
    const expectedW = Math.min(initialSize.width + 80, maxW);
    const expectedH = Math.min(initialSize.height + 60, maxH);
    expect(size.width).toBeCloseTo(expectedW, 0);
    expect(size.height).toBeCloseTo(expectedH, 0);

    fireMouse(document, 'mouseup', 580, 560);
  });

  it('resize grip drag shrinks width and height when moved left/up', async () => {
    await flushEffects();
    const shell = getShell();
    const grip = getResizeHandle();

    const initialSize = shellSize(shell);

    // Drag left/up by (-50, -40). Clamped to MIN_PANEL_* floor.
    fireMouse(grip, 'mousedown', 500, 500);
    fireMouse(document, 'mousemove', 450, 460);

    const size = shellSize(shell);
    const expectedW = Math.max(MIN_PANEL_WIDTH, initialSize.width - 50);
    const expectedH = Math.max(MIN_PANEL_HEIGHT, initialSize.height - 40);
    expect(size.width).toBeCloseTo(expectedW, 0);
    expect(size.height).toBeCloseTo(expectedH, 0);

    fireMouse(document, 'mouseup', 450, 460);
  });

  it('mouseup commits size to localStorage', async () => {
    await flushEffects();
    const shell = getShell();
    const grip = getResizeHandle();

    const initialSize = shellSize(shell);

    fireMouse(grip, 'mousedown', 500, 500);
    fireMouse(document, 'mousemove', 600, 580); // delta (+100, +80)
    fireMouse(document, 'mouseup', 600, 580);

    // saveSize writes synchronously on mouseup.
    const stored = JSON.parse(localStorage.getItem(SIZE_KEY) ?? 'null') as {
      width: number;
      height: number;
    } | null;
    expect(stored).not.toBeNull();
    // Expected: initialSize + delta, clamped to viewport
    const maxW = window.innerWidth - 32; // SIZE_VIEWPORT_MARGIN = 32
    const expectedW = Math.min(initialSize.width + 100, maxW);
    const maxH = window.innerHeight - 32;
    const expectedH = Math.min(initialSize.height + 80, maxH);
    expect(stored!.width).toBeCloseTo(expectedW, 0);
    expect(stored!.height).toBeCloseTo(expectedH, 0);
  });

  it('after mouseup, further mousemove does NOT change size', async () => {
    await flushEffects();
    const shell = getShell();
    const grip = getResizeHandle();

    fireMouse(grip, 'mousedown', 500, 500);
    fireMouse(document, 'mousemove', 580, 560);
    fireMouse(document, 'mouseup', 580, 560);

    const widthAfterUp = shell.style.width;
    const heightAfterUp = shell.style.height;

    fireMouse(document, 'mousemove', 9999, 9999);

    expect(shell.style.width).toBe(widthAfterUp);
    expect(shell.style.height).toBe(heightAfterUp);
  });
});

// ---------------------------------------------------------------------------
// 5. Resize grip — viewport-edge clamping (min/max size)
// ---------------------------------------------------------------------------

describe('panel resize-grip — size clamping', () => {
  it('width cannot shrink below MIN_PANEL_WIDTH', async () => {
    await flushEffects();
    const shell = getShell();
    const grip = getResizeHandle();

    // Drag far left to force shrink below minimum.
    fireMouse(grip, 'mousedown', 500, 500);
    fireMouse(document, 'mousemove', 500 - 100000, 500);

    const size = shellSize(shell);
    expect(size.width).toBeGreaterThanOrEqual(MIN_PANEL_WIDTH);
    // Must not be the raw (initialWidth − 100000) clamped to 0 — MIN_PANEL_WIDTH is the floor.
    expect(size.width).toBeGreaterThan(0);

    fireMouse(document, 'mouseup', 500 - 100000, 500);
  });

  it('height cannot shrink below MIN_PANEL_HEIGHT', async () => {
    await flushEffects();
    const shell = getShell();
    const grip = getResizeHandle();

    fireMouse(grip, 'mousedown', 500, 500);
    fireMouse(document, 'mousemove', 500, 500 - 100000);

    const size = shellSize(shell);
    expect(size.height).toBeGreaterThanOrEqual(MIN_PANEL_HEIGHT);

    fireMouse(document, 'mouseup', 500, 500 - 100000);
  });

  it('width cannot exceed viewport width minus margin', async () => {
    await flushEffects();
    const shell = getShell();
    const grip = getResizeHandle();

    fireMouse(grip, 'mousedown', 500, 500);
    fireMouse(document, 'mousemove', 500 + 100000, 500);

    const size = shellSize(shell);
    // clampSize caps at max(MIN_PANEL_WIDTH, min(MAX_PANEL_WIDTH, vw - SIZE_VIEWPORT_MARGIN))
    // where SIZE_VIEWPORT_MARGIN = 32.
    const maxAllowed = window.innerWidth - 32;
    expect(size.width).toBeLessThanOrEqual(maxAllowed + 0.5);

    fireMouse(document, 'mouseup', 500 + 100000, 500);
  });
});

// ---------------------------------------------------------------------------
// 6. Resize grip — persistence across remount
// ---------------------------------------------------------------------------

describe('panel resize-grip — persistence across remount', () => {
  it('resized dimensions restore from localStorage after remount', async () => {
    await flushEffects();
    const shell = getShell();
    const grip = getResizeHandle();

    // Confirm initial size loaded from seed before dragging.
    const initialSize = shellSize(shell);
    expect(initialSize.width).toBeGreaterThan(0);

    fireMouse(grip, 'mousedown', 500, 500);
    fireMouse(document, 'mousemove', 570, 560); // delta (+70, +60)
    fireMouse(document, 'mouseup', 570, 560);

    const stored = JSON.parse(localStorage.getItem(SIZE_KEY) ?? 'null') as {
      width: number;
      height: number;
    };
    expect(stored).not.toBeNull();

    act(() => {
      render(null, container);
    });
    await flushEffects();

    act(() => {
      render(<DesignTokenTweakPanel instanceConfig={CFG} />, container);
    });
    await flushEffects();

    const shellAfterRemount = getShell();
    const restoredSize = shellSize(shellAfterRemount);

    expect(restoredSize.width).toBeCloseTo(stored.width, 0);
    expect(restoredSize.height).toBeCloseTo(stored.height, 0);
  });
});
