// @vitest-environment jsdom

/**
 * Unit tests for InspectorOverlay.
 *
 * Environment constraints (same as highlight-overlay):
 * - jsdom's getBoundingClientRect() returns zeros — we stub it per element.
 * - jsdom does not implement elementFromPoint — we stub it to return the
 *   fixture target so mousemove resolves a hovered element.
 * - clipboard.writeText is mocked so the copy path is observable.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render } from 'preact';
import { act } from 'preact/test-utils';
import { InspectorOverlay } from '../inspector-overlay';

// ---------------------------------------------------------------------------
// Setup / teardown
// ---------------------------------------------------------------------------

let container: HTMLDivElement;
let target: HTMLAnchorElement;
let writeText: ReturnType<typeof vi.fn>;

beforeEach(() => {
  container = document.createElement('div');
  document.body.appendChild(container);

  // Fixture host element to inspect.
  target = document.createElement('a');
  target.id = 'cta';
  target.setAttribute('href', '/go');
  target.textContent = 'Go';
  document.body.appendChild(target);
  target.getBoundingClientRect = () =>
    ({ top: 10, left: 20, width: 100, height: 40, right: 120, bottom: 50, x: 20, y: 10, toJSON: () => ({}) }) as DOMRect;

  // Stub elementFromPoint (unimplemented in jsdom).
  document.elementFromPoint = () => target;

  // Mock the modern clipboard API.
  writeText = vi.fn().mockResolvedValue(undefined);
  Object.defineProperty(navigator, 'clipboard', {
    value: { writeText },
    configurable: true,
  });
});

afterEach(() => {
  render(null, container);
  container.remove();
  target.remove();
  vi.restoreAllMocks();
});

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function pressAlt(): void {
  window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Alt', altKey: true, bubbles: true }));
}

function releaseAlt(): void {
  window.dispatchEvent(new KeyboardEvent('keyup', { key: 'Alt', altKey: false, bubbles: true }));
}

function moveOverTarget(): void {
  document.dispatchEvent(new MouseEvent('mousemove', { clientX: 50, clientY: 30, bubbles: true }));
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('InspectorOverlay', () => {
  // Each state transition needs its own act() so the resulting re-render +
  // effect (which attaches the next phase's listener) commits before the next
  // event is dispatched. Arming attaches the mousemove/click listeners; only
  // then does a mousemove resolve a hovered element.

  it('renders no highlight box until Alt is held and the pointer moves', () => {
    act(() => {
      render(<InspectorOverlay enabled={true} />, container);
    });
    expect(document.querySelector('.tokenpanel-elpath-box')).toBeNull();

    act(() => pressAlt());
    act(() => moveOverTarget());
    expect(document.querySelector('.tokenpanel-elpath-box')).not.toBeNull();
  });

  it('shows the element label with the summary descriptor', () => {
    act(() => {
      render(<InspectorOverlay enabled={true} />, container);
    });
    act(() => pressAlt());
    act(() => moveOverTarget());
    const label = document.querySelector('.tokenpanel-elpath-label-name');
    expect(label?.textContent).toBe('a#cta');
  });

  it('does nothing while disabled, even with Alt + mousemove', () => {
    act(() => {
      render(<InspectorOverlay enabled={false} />, container);
    });
    act(() => pressAlt());
    act(() => moveOverTarget());
    expect(document.querySelector('.tokenpanel-elpath-box')).toBeNull();
  });

  it('clears the highlight when Alt is released', () => {
    act(() => {
      render(<InspectorOverlay enabled={true} />, container);
    });
    act(() => pressAlt());
    act(() => moveOverTarget());
    expect(document.querySelector('.tokenpanel-elpath-box')).not.toBeNull();

    act(() => releaseAlt());
    expect(document.querySelector('.tokenpanel-elpath-box')).toBeNull();
  });

  it('copies the annotated path and shows a toast on inspect-click', async () => {
    act(() => {
      render(<InspectorOverlay enabled={true} />, container);
    });
    act(() => pressAlt());
    act(() => moveOverTarget());

    await act(async () => {
      document.dispatchEvent(new MouseEvent('click', { clientX: 50, clientY: 30, bubbles: true }));
      // Flush the copyToClipboard → setToast microtask chain (writeText await +
      // copyToClipboard await + the setToast that follows).
      for (let i = 0; i < 5; i++) await Promise.resolve();
    });

    expect(writeText).toHaveBeenCalledTimes(1);
    const copied = writeText.mock.calls[0][0] as string;
    expect(copied).toContain('element:  a#cta');
    expect(copied).toContain('selector: #cta');

    const toast = document.querySelector('.tokenpanel-elpath-toast-text');
    expect(toast?.textContent).toContain('Copied path: a#cta');
  });

  it('swallows the inspect-click so host handlers do not fire', () => {
    const hostClick = vi.fn();
    target.addEventListener('click', hostClick);

    act(() => {
      render(<InspectorOverlay enabled={true} />, container);
    });
    act(() => pressAlt());
    act(() => moveOverTarget());
    act(() => {
      target.dispatchEvent(new MouseEvent('click', { clientX: 50, clientY: 30, bubbles: true }));
    });

    expect(hostClick).not.toHaveBeenCalled();
  });
});
