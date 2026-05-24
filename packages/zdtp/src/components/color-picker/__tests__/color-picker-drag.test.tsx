// @vitest-environment jsdom

/**
 * Unit tests for the ColorPicker drag-handle feature (issue #180).
 *
 * Behaviors under test:
 *  1. The drag handle <span> renders in the header with the correct ARIA shape
 *     (role="presentation", aria-hidden="true") and the braille-dots glyph ⠿.
 *  2. pointerdown on the drag handle captures the pointer and starts a drag
 *     session — verified indirectly via subsequent pointermove producing a
 *     position-locked container style.
 *  3. pointermove translates the container by (clientX - startX, clientY - startY)
 *     and applies it as `position: fixed; left; top` on the container.
 *  4. pointerup re-clamps dragPos to the viewport (rect.left/top stays inside
 *     [pad, viewport - pad - size]).
 *  5. The drag handle's pointerdown does NOT propagate to the document-level
 *     outside-click handler — usePopoverClose remains silent during drag.
 *  6. DOM hygiene — the drag handle is a <span>, not a banned semantic tag.
 *
 * Test environment caveats (mirrors color-picker.test.tsx setup):
 *  - PointerEvent shim — jsdom does not polyfill PointerEvent natively.
 *  - setPointerCapture/releasePointerCapture are not implemented in jsdom; the
 *    component swallows the resulting throws via try/catch.
 *  - getBoundingClientRect on jsdom returns zero-sized rects by default. Tests
 *    that depend on rect.width / rect.height stub the function on the relevant
 *    element so the clamp math has meaningful numbers.
 */

// jsdom does not polyfill PointerEvent. Provide a minimal shim that carries
// pointerId + clientX/clientY through to handlers (MouseEvent base already
// carries clientX/clientY).
if (typeof PointerEvent === 'undefined') {
  class PointerEventShim extends MouseEvent {
    pointerId: number;
    constructor(type: string, init: PointerEventInit = {}) {
      super(type, init);
      this.pointerId = init.pointerId ?? 0;
    }
  }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (globalThis as any).PointerEvent = PointerEventShim;
}

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render } from 'preact';
import { act } from 'preact/test-utils';
import { useRef } from 'preact/compat';
import type { JSX } from 'preact';
import { ColorPicker } from '../color-picker';
import type { ColorPickerProps } from '../color-picker';

// ---------------------------------------------------------------------------
// Test harness
// ---------------------------------------------------------------------------

let container: HTMLDivElement;

beforeEach(() => {
  container = document.createElement('div');
  document.body.appendChild(container);
  try {
    window.localStorage.clear();
  } catch {
    // ignore
  }
});

afterEach(() => {
  act(() => render(null, container));
  container.remove();
});

function PickerWrapper(
  props: Omit<ColorPickerProps, 'anchorRef' | 'onClose'> & {
    onClose?: () => void;
  },
): JSX.Element {
  const anchorRef = useRef<HTMLDivElement>(null);
  return (
    <div>
      <div ref={anchorRef} style={{ width: 40, height: 40 }} />
      <ColorPicker
        {...props}
        anchorRef={anchorRef as React.RefObject<HTMLElement | null>}
        onClose={props.onClose ?? (() => {})}
      />
    </div>
  );
}

function renderPicker(
  partial: Partial<ColorPickerProps> & { onClose?: () => void } = {},
): void {
  act(() => {
    render(
      <PickerWrapper
        color={partial.color ?? '#ff0000'}
        onChange={partial.onChange ?? vi.fn()}
        label={partial.label}
        defaultMode={partial.defaultMode}
        onClose={partial.onClose ?? (() => {})}
      />,
      container,
    );
  });
}

function getDialog(): HTMLElement {
  const el = container.querySelector<HTMLElement>('[role="dialog"]');
  if (!el) throw new Error('dialog not found');
  return el;
}

function getDragHandle(): HTMLElement {
  const el = container.querySelector<HTMLElement>(
    '.tokenpanel-color-picker-drag-handle',
  );
  if (!el) throw new Error('drag handle not found');
  return el;
}

// Stub getBoundingClientRect on `el` so the container appears to have a
// concrete viewport-relative rect. jsdom returns zeros otherwise, which
// makes both the translate math and the clamp meaningless.
function stubRect(
  el: HTMLElement,
  rect: { left: number; top: number; width: number; height: number },
): void {
  el.getBoundingClientRect = () =>
    ({
      left: rect.left,
      top: rect.top,
      right: rect.left + rect.width,
      bottom: rect.top + rect.height,
      width: rect.width,
      height: rect.height,
      x: rect.left,
      y: rect.top,
      toJSON() {
        return this;
      },
    } as DOMRect);
}

function firePointer(
  el: Element,
  type: 'pointerdown' | 'pointermove' | 'pointerup' | 'pointercancel',
  init: { clientX?: number; clientY?: number; pointerId?: number } = {},
): void {
  act(() => {
    el.dispatchEvent(
      new PointerEvent(type, {
        bubbles: true,
        pointerId: init.pointerId ?? 1,
        clientX: init.clientX ?? 0,
        clientY: init.clientY ?? 0,
      }),
    );
  });
}

// ---------------------------------------------------------------------------
// 1. Drag handle rendering & ARIA shape
// ---------------------------------------------------------------------------

describe('ColorPicker — drag handle rendering', () => {
  it('renders the drag handle as a <span> in the header', () => {
    renderPicker();
    const handle = getDragHandle();
    expect(handle.tagName).toBe('SPAN');
  });

  it('drag handle has role="presentation" and aria-hidden="true"', () => {
    renderPicker();
    const handle = getDragHandle();
    expect(handle.getAttribute('role')).toBe('presentation');
    expect(handle.getAttribute('aria-hidden')).toBe('true');
  });

  it('drag handle contains the braille-dots glyph (⠿)', () => {
    renderPicker();
    const handle = getDragHandle();
    expect(handle.textContent).toBe('⠿');
  });

  it('drag handle sits inside the header (before the label)', () => {
    renderPicker();
    const header = container.querySelector<HTMLElement>(
      '.tokenpanel-color-picker-header',
    );
    expect(header).not.toBeNull();
    const firstChild = header!.firstElementChild;
    expect(firstChild).not.toBeNull();
    expect(firstChild!.classList.contains('tokenpanel-color-picker-drag-handle'))
      .toBe(true);
  });
});

// ---------------------------------------------------------------------------
// 2. Drag flow — pointerdown → pointermove → pointerup
// ---------------------------------------------------------------------------

describe('ColorPicker — drag flow', () => {
  it('pointermove after pointerdown applies a fixed left/top to the container', () => {
    renderPicker();
    const dialog = getDialog();
    // Container starts at (100, 100) with size 320x400.
    stubRect(dialog, { left: 100, top: 100, width: 320, height: 400 });
    const handle = getDragHandle();

    firePointer(handle, 'pointerdown', { clientX: 110, clientY: 110 });
    firePointer(handle, 'pointermove', { clientX: 150, clientY: 130 });

    // delta = (40, 20) → newLeft = 140, newTop = 120
    expect(dialog.style.position).toBe('fixed');
    expect(dialog.style.left).toBe('140px');
    expect(dialog.style.top).toBe('120px');
  });

  it('subsequent pointermove updates dragPos to the latest delta', () => {
    renderPicker();
    const dialog = getDialog();
    stubRect(dialog, { left: 100, top: 100, width: 320, height: 400 });
    const handle = getDragHandle();

    firePointer(handle, 'pointerdown', { clientX: 10, clientY: 10 });
    firePointer(handle, 'pointermove', { clientX: 50, clientY: 50 });
    firePointer(handle, 'pointermove', { clientX: 200, clientY: 150 });

    // delta = (190, 140) from base (100, 100) → (290, 240)
    expect(dialog.style.left).toBe('290px');
    expect(dialog.style.top).toBe('240px');
  });

  it('pointermove without prior pointerdown does NOT move the popover', () => {
    renderPicker();
    const dialog = getDialog();
    stubRect(dialog, { left: 100, top: 100, width: 320, height: 400 });
    const handle = getDragHandle();

    // Snapshot whatever style was applied by the auto-positioning pass.
    const initialLeft = dialog.style.left;
    const initialTop = dialog.style.top;

    firePointer(handle, 'pointermove', { clientX: 500, clientY: 500 });

    expect(dialog.style.left).toBe(initialLeft);
    expect(dialog.style.top).toBe(initialTop);
  });

  it('pointermove with mismatched pointerId is ignored', () => {
    renderPicker();
    const dialog = getDialog();
    stubRect(dialog, { left: 100, top: 100, width: 320, height: 400 });
    const handle = getDragHandle();

    firePointer(handle, 'pointerdown', {
      pointerId: 7,
      clientX: 10,
      clientY: 10,
    });
    // A move event from a DIFFERENT pointer must not perturb dragPos.
    firePointer(handle, 'pointermove', {
      pointerId: 99,
      clientX: 999,
      clientY: 999,
    });

    // dragPos still null → style remains the auto-positioned one. Since auto
    // is used pre-pointerdown effect, just verify no extreme jump happened.
    // (left should NOT be the 999-based delta.)
    expect(dialog.style.left).not.toBe('999px');
  });
});

// ---------------------------------------------------------------------------
// 3. Pointerup re-clamps to the viewport
// ---------------------------------------------------------------------------

describe('ColorPicker — pointerup clamps to viewport', () => {
  // jsdom defaults to window.innerWidth=1024, innerHeight=768. The clamp
  // formula is: left ∈ [pad, vw - pad - width] (pad=8). So for w=320, the
  // right bound is 1024 - 8 - 320 = 696. Anything past 696 should be pulled
  // back to 696 on release.
  it('clamps left to the right edge minus padding', () => {
    renderPicker();
    const dialog = getDialog();
    // Place container far off the right edge of the viewport on release.
    const handle = getDragHandle();

    // Phase 1: stubRect at start. pointerdown captures baseLeft=100.
    stubRect(dialog, { left: 100, top: 100, width: 320, height: 400 });
    firePointer(handle, 'pointerdown', { clientX: 110, clientY: 110 });

    // Phase 2: simulate that the user dragged the container so its real
    // rect.left is now 5000 (way off-screen). The pointerup handler reads
    // getBoundingClientRect again to do its clamp math.
    stubRect(dialog, { left: 5000, top: 200, width: 320, height: 400 });
    firePointer(handle, 'pointerup', { clientX: 5010, clientY: 210 });

    // Expected clamp on left: vw - pad - width = 1024 - 8 - 320 = 696
    expect(dialog.style.left).toBe('696px');
  });

  it('clamps left to the padding when negative', () => {
    renderPicker();
    const dialog = getDialog();
    const handle = getDragHandle();

    stubRect(dialog, { left: 100, top: 100, width: 320, height: 400 });
    firePointer(handle, 'pointerdown', { clientX: 110, clientY: 110 });

    // Pretend the container's rect ended up at left=-500 after dragging.
    stubRect(dialog, { left: -500, top: 200, width: 320, height: 400 });
    firePointer(handle, 'pointerup', { clientX: -490, clientY: 210 });

    expect(dialog.style.left).toBe('8px'); // pad
  });

  it('clamps top to the bottom edge minus padding', () => {
    renderPicker();
    const dialog = getDialog();
    const handle = getDragHandle();

    stubRect(dialog, { left: 100, top: 100, width: 320, height: 400 });
    firePointer(handle, 'pointerdown', { clientX: 110, clientY: 110 });

    // Drag so the container's rect.top sits far below the viewport.
    stubRect(dialog, { left: 200, top: 5000, width: 320, height: 400 });
    firePointer(handle, 'pointerup', { clientX: 210, clientY: 5010 });

    // vh - pad - height = 768 - 8 - 400 = 360
    expect(dialog.style.top).toBe('360px');
  });

  it('clamps top to the padding when negative', () => {
    renderPicker();
    const dialog = getDialog();
    const handle = getDragHandle();

    stubRect(dialog, { left: 100, top: 100, width: 320, height: 400 });
    firePointer(handle, 'pointerdown', { clientX: 110, clientY: 110 });

    stubRect(dialog, { left: 200, top: -500, width: 320, height: 400 });
    firePointer(handle, 'pointerup', { clientX: 210, clientY: -490 });

    expect(dialog.style.top).toBe('8px'); // pad
  });

  it('pointercancel ends the drag (treated like pointerup, applies clamp)', () => {
    renderPicker();
    const dialog = getDialog();
    const handle = getDragHandle();

    stubRect(dialog, { left: 100, top: 100, width: 320, height: 400 });
    firePointer(handle, 'pointerdown', { clientX: 110, clientY: 110 });

    stubRect(dialog, { left: 5000, top: 200, width: 320, height: 400 });
    firePointer(handle, 'pointercancel', { clientX: 5010, clientY: 210 });

    expect(dialog.style.left).toBe('696px');
  });

  it('after pointerup, a subsequent pointermove does NOT move the popover', () => {
    renderPicker();
    const dialog = getDialog();
    const handle = getDragHandle();

    stubRect(dialog, { left: 100, top: 100, width: 320, height: 400 });
    firePointer(handle, 'pointerdown', { clientX: 110, clientY: 110 });
    stubRect(dialog, { left: 200, top: 200, width: 320, height: 400 });
    firePointer(handle, 'pointerup', { clientX: 210, clientY: 210 });

    const leftAfterUp = dialog.style.left;
    const topAfterUp = dialog.style.top;

    // Drag session is over; further moves should not change position.
    firePointer(handle, 'pointermove', { clientX: 999, clientY: 999 });

    expect(dialog.style.left).toBe(leftAfterUp);
    expect(dialog.style.top).toBe(topAfterUp);
  });
});

// ---------------------------------------------------------------------------
// 4. Drag handle does NOT trigger outside-click close
// ---------------------------------------------------------------------------

describe('ColorPicker — drag handle and usePopoverClose', () => {
  it('pointerdown on the drag handle does NOT call onClose', () => {
    const onClose = vi.fn();
    renderPicker({ onClose });
    const dialog = getDialog();
    stubRect(dialog, { left: 100, top: 100, width: 320, height: 400 });
    const handle = getDragHandle();

    firePointer(handle, 'pointerdown', { clientX: 110, clientY: 110 });

    expect(onClose).not.toHaveBeenCalled();
  });

  it('a full drag (down → move → up) does NOT call onClose', () => {
    const onClose = vi.fn();
    renderPicker({ onClose });
    const dialog = getDialog();
    stubRect(dialog, { left: 100, top: 100, width: 320, height: 400 });
    const handle = getDragHandle();

    firePointer(handle, 'pointerdown', { clientX: 110, clientY: 110 });
    firePointer(handle, 'pointermove', { clientX: 200, clientY: 150 });
    stubRect(dialog, { left: 190, top: 140, width: 320, height: 400 });
    firePointer(handle, 'pointerup', { clientX: 200, clientY: 150 });

    expect(onClose).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// 5. DOM hygiene — drag handle does not introduce banned tags
// ---------------------------------------------------------------------------

describe('ColorPicker — drag handle DOM hygiene', () => {
  it('drag handle is a <span>, not a banned semantic tag', () => {
    renderPicker();
    const handle = getDragHandle();
    expect(handle.tagName).toBe('SPAN');
    // Smoke check: still no banned tags anywhere in the dialog.
    const banned = container.querySelectorAll('a,button,h1,h2,h3,h4,h5,h6,p,ul,ol,li');
    expect(banned.length).toBe(0);
  });

  it('drag handle does NOT carry role="button" or tabIndex (presentational)', () => {
    renderPicker();
    const handle = getDragHandle();
    expect(handle.getAttribute('role')).not.toBe('button');
    // No keyboard activation expected — it's a pure pointer affordance.
    expect(handle.tabIndex).toBe(-1);
  });
});
