// @vitest-environment jsdom

/**
 * Unit tests for HighlightOverlay.
 *
 * Key test-environment constraints:
 * - jsdom's getBoundingClientRect() returns all-zeros for unlayouted elements.
 *   We stub it per element.
 * - jsdom's requestAnimationFrame is non-deterministic; we replace it with a
 *   manual flush queue so we can advance exactly one tick between assertions.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render } from 'preact';
import { act } from 'preact/test-utils';
import { HighlightOverlay, type HighlightOverlayItem } from '../highlight-overlay';
import { Z } from '../../styles/z-index-tokens';

// ---------------------------------------------------------------------------
// Manual RAF queue — deterministic single-tick advance
// ---------------------------------------------------------------------------

type RafCallback = (time: number) => void;
let rafQueue: RafCallback[] = [];
let rafTime = 0;

function flushRaf(): void {
  const toRun = rafQueue.slice();
  rafQueue = [];
  for (const cb of toRun) {
    cb(rafTime++);
  }
}

// ---------------------------------------------------------------------------
// Setup / teardown
// ---------------------------------------------------------------------------

let container: HTMLDivElement;

beforeEach(() => {
  rafQueue = [];
  rafTime = 0;

  // Install deterministic RAF
  window.requestAnimationFrame = (cb: RafCallback): number => {
    rafQueue.push(cb);
    return rafQueue.length;
  };
  window.cancelAnimationFrame = vi.fn((_id: number) => {
    // For simplicity, cancellation is not modelled in these tests because we
    // assert state after deliberate flushes only.
  });

  container = document.createElement('div');
  document.body.appendChild(container);
});

afterEach(() => {
  act(() => render(null, container));
  document.body.removeChild(container);
  vi.restoreAllMocks();
});

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeElement(rect: { top: number; left: number; width: number; height: number }): Element {
  const el = document.createElement('div');
  el.getBoundingClientRect = () =>
    ({
      top: rect.top,
      left: rect.left,
      width: rect.width,
      height: rect.height,
      right: rect.left + rect.width,
      bottom: rect.top + rect.height,
      x: rect.left,
      y: rect.top,
      toJSON: () => ({}),
    } as DOMRect);
  return el;
}

function makeItem(
  rect: { top: number; left: number; width: number; height: number },
  color: string,
  outlineWidth: number,
): HighlightOverlayItem {
  return {
    element: makeElement(rect),
    slot: { color, outlineWidth },
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('HighlightOverlay', () => {
  it('renders nothing when items array is empty', () => {
    act(() => {
      render(<HighlightOverlay items={[]} />, container);
    });
    const overlays = container.querySelectorAll('.tokenpanel-highlight-overlay');
    expect(overlays).toHaveLength(0);
  });

  it('renders 1 overlay div for 1 item', () => {
    const item = makeItem({ top: 10, left: 20, width: 100, height: 30 }, '#ff0000', 2);

    act(() => {
      render(<HighlightOverlay items={[item]} />, container);
    });

    const overlays = container.querySelectorAll('.tokenpanel-highlight-overlay');
    expect(overlays).toHaveLength(1);
  });

  it('sets correct initial rect on the overlay', () => {
    const item = makeItem({ top: 10, left: 20, width: 100, height: 30 }, '#ff0000', 2);

    act(() => {
      render(<HighlightOverlay items={[item]} />, container);
    });

    const overlay = container.querySelector('.tokenpanel-highlight-overlay') as HTMLElement;
    expect(overlay.style.top).toBe('10px');
    expect(overlay.style.left).toBe('20px');
    expect(overlay.style.width).toBe('100px');
    expect(overlay.style.height).toBe('30px');
  });

  it('uses position:fixed on overlay divs', () => {
    const item = makeItem({ top: 0, left: 0, width: 50, height: 50 }, '#00ff00', 1);

    act(() => {
      render(<HighlightOverlay items={[item]} />, container);
    });

    const overlay = container.querySelector('.tokenpanel-highlight-overlay') as HTMLElement;
    expect(overlay.style.position).toBe('fixed');
  });

  it('applies the overlay z-index token', () => {
    const item = makeItem({ top: 0, left: 0, width: 50, height: 50 }, '#00ff00', 1);

    act(() => {
      render(<HighlightOverlay items={[item]} />, container);
    });

    const overlay = container.querySelector('.tokenpanel-highlight-overlay') as HTMLElement;
    expect(overlay.style.zIndex).toBe(String(Z.overlay));
  });

  it('sets outline using slot color and outlineWidth', () => {
    const item = makeItem({ top: 0, left: 0, width: 50, height: 50 }, '#abcdef', 3);

    act(() => {
      render(<HighlightOverlay items={[item]} />, container);
    });

    const overlay = container.querySelector('.tokenpanel-highlight-overlay') as HTMLElement;
    expect(overlay.style.outline).toBe('3px solid #abcdef');
  });

  it('sets box-shadow inset fallback with slot color and outlineWidth', () => {
    const item = makeItem({ top: 0, left: 0, width: 50, height: 50 }, '#ff0000', 2);

    act(() => {
      render(<HighlightOverlay items={[item]} />, container);
    });

    const overlay = container.querySelector('.tokenpanel-highlight-overlay') as HTMLElement;
    expect(overlay.style.boxShadow).toBe('inset 0 0 0 2px #ff0000');
  });

  it('renders 3 overlays with their respective slot colors and widths', () => {
    const items = [
      makeItem({ top: 0, left: 0, width: 50, height: 50 }, '#ff0000', 2),
      makeItem({ top: 100, left: 100, width: 80, height: 40 }, '#00ff00', 3),
      makeItem({ top: 200, left: 200, width: 60, height: 60 }, '#0000ff', 1),
    ];

    act(() => {
      render(<HighlightOverlay items={items} />, container);
    });

    const overlays = container.querySelectorAll(
      '.tokenpanel-highlight-overlay',
    ) as NodeListOf<HTMLElement>;
    expect(overlays).toHaveLength(3);

    expect(overlays[0].style.outline).toBe('2px solid #ff0000');
    expect(overlays[1].style.outline).toBe('3px solid #00ff00');
    expect(overlays[2].style.outline).toBe('1px solid #0000ff');

    expect(overlays[0].style.boxShadow).toBe('inset 0 0 0 2px #ff0000');
    expect(overlays[1].style.boxShadow).toBe('inset 0 0 0 3px #00ff00');
    expect(overlays[2].style.boxShadow).toBe('inset 0 0 0 1px #0000ff');
  });

  it('RAF tick updates overlay position when element rect changes (simulates scroll)', async () => {
    let top = 10;
    // Element must be connected (isConnected === true) for the RAF tick to update it.
    const el = document.createElement('div');
    document.body.appendChild(el);
    el.getBoundingClientRect = () =>
      ({
        top,
        left: 0,
        width: 100,
        height: 50,
        right: 100,
        bottom: top + 50,
        x: 0,
        y: top,
        toJSON: () => ({}),
      } as DOMRect);

    const item: HighlightOverlayItem = { element: el, slot: { color: '#ff0000', outlineWidth: 2 } };

    act(() => {
      render(<HighlightOverlay items={[item]} />, container);
    });

    const overlay = container.querySelector('.tokenpanel-highlight-overlay') as HTMLElement;
    expect(overlay.style.top).toBe('10px');

    // Simulate scroll: element's rect.top changes
    top = 200;

    // Advance one RAF tick — the loop should update the overlay style
    act(() => {
      flushRaf();
    });

    expect(overlay.style.top).toBe('200px');
    el.remove();
  });

  it('RAF tick updates overlay position when element rect changes (simulates resize)', async () => {
    let width = 100;
    // Element must be connected (isConnected === true) for the RAF tick to update it.
    const el = document.createElement('div');
    document.body.appendChild(el);
    el.getBoundingClientRect = () =>
      ({
        top: 0,
        left: 0,
        width,
        height: 50,
        right: width,
        bottom: 50,
        x: 0,
        y: 0,
        toJSON: () => ({}),
      } as DOMRect);

    const item: HighlightOverlayItem = { element: el, slot: { color: '#00ff00', outlineWidth: 1 } };

    act(() => {
      render(<HighlightOverlay items={[item]} />, container);
    });

    const overlay = container.querySelector('.tokenpanel-highlight-overlay') as HTMLElement;
    expect(overlay.style.width).toBe('100px');

    // Simulate resize: element's rect.width changes
    width = 300;

    act(() => {
      flushRaf();
    });

    expect(overlay.style.width).toBe('300px');
    el.remove();
  });

  it('warns once and renders only 200 items when given more than 200', () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => undefined);

    const items: HighlightOverlayItem[] = Array.from({ length: 205 }, (_, i) =>
      makeItem({ top: i, left: 0, width: 10, height: 10 }, '#ff0000', 2),
    );

    act(() => {
      render(<HighlightOverlay items={items} />, container);
    });

    const overlays = container.querySelectorAll('.tokenpanel-highlight-overlay');
    expect(overlays).toHaveLength(200);

    expect(warnSpy).toHaveBeenCalledTimes(1);
    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringContaining('205 items'),
    );
  });

  it('does not warn again on re-render when still over 200', () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => undefined);

    const items: HighlightOverlayItem[] = Array.from({ length: 205 }, (_, i) =>
      makeItem({ top: i, left: 0, width: 10, height: 10 }, '#ff0000', 2),
    );

    act(() => {
      render(<HighlightOverlay items={items} />, container);
    });
    act(() => {
      render(<HighlightOverlay items={items} />, container);
    });

    expect(warnSpy).toHaveBeenCalledTimes(1);
  });

  it('sets pointer-events none on overlays', () => {
    const item = makeItem({ top: 0, left: 0, width: 50, height: 50 }, '#ff0000', 2);

    act(() => {
      render(<HighlightOverlay items={[item]} />, container);
    });

    const overlay = container.querySelector('.tokenpanel-highlight-overlay') as HTMLElement;
    expect(overlay.style.pointerEvents).toBe('none');
  });

  it('sets aria-hidden on overlays (purely visual, skip screen readers)', () => {
    const item = makeItem({ top: 0, left: 0, width: 50, height: 50 }, '#ff0000', 2);

    act(() => {
      render(<HighlightOverlay items={[item]} />, container);
    });

    const overlay = container.querySelector('.tokenpanel-highlight-overlay') as HTMLElement;
    expect(overlay.getAttribute('aria-hidden')).toBe('true');
  });

  // F26: RAF tick must NOT call getBoundingClientRect on disconnected elements
  // and must hide the overlay div to prevent a phantom ring at the viewport origin.
  it('RAF tick hides overlay div and skips getBoundingClientRect for disconnected elements', () => {
    const el = document.createElement('div');
    document.body.appendChild(el);

    const rectSpy = vi.spyOn(el, 'getBoundingClientRect').mockReturnValue({
      top: 10, left: 20, width: 100, height: 50,
      right: 120, bottom: 60, x: 20, y: 10,
      toJSON: () => ({}),
    } as DOMRect);

    const item: HighlightOverlayItem = { element: el, slot: { color: '#ff0000', outlineWidth: 2 } };

    act(() => {
      render(<HighlightOverlay items={[item]} />, container);
    });

    // Flush one tick while element is connected — getBoundingClientRect IS called.
    act(() => { flushRaf(); });
    const callsWhileConnected = rectSpy.mock.calls.length;
    expect(callsWhileConnected).toBeGreaterThanOrEqual(1);

    // Disconnect the element from the DOM.
    el.remove();
    expect(el.isConnected).toBe(false);

    // Flush another tick — getBoundingClientRect must NOT be called again.
    act(() => { flushRaf(); });
    expect(rectSpy.mock.calls.length).toBe(callsWhileConnected);

    // The overlay div must be hidden (display: none) to prevent the phantom ring.
    const overlayDiv = container.querySelector('.tokenpanel-highlight-overlay') as HTMLElement;
    expect(overlayDiv.style.display).toBe('none');
  });
});
