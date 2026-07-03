// @vitest-environment jsdom

/**
 * Unit tests for the shared dismiss-layer stack (#446 F10).
 *
 * Contract:
 *  - Exactly ONE layer (the topmost) reacts to a single Escape.
 *  - "Topmost" is DOM depth, not registration order.
 *  - The consumed Escape is marked defaultPrevented so base-layer listeners
 *    (the panel shell, running in the bubble phase) stand down.
 *  - An already-consumed Escape is ignored.
 */

import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  pushDismissLayer,
  dismissLayerCount,
  __resetDismissLayersForTests,
} from '../dismiss-layer';

afterEach(() => {
  __resetDismissLayersForTests();
  document.body.innerHTML = '';
});

function pressEscape(target: EventTarget = document.body): KeyboardEvent {
  const e = new KeyboardEvent('keydown', {
    key: 'Escape',
    bubbles: true,
    cancelable: true,
  });
  target.dispatchEvent(e);
  return e;
}

describe('dismiss-layer stack', () => {
  it('registers and unregisters layers', () => {
    expect(dismissLayerCount()).toBe(0);
    const remove = pushDismissLayer({ onEscape: () => {}, getElement: () => null });
    expect(dismissLayerCount()).toBe(1);
    remove();
    expect(dismissLayerCount()).toBe(0);
  });

  it('Escape dismisses only the topmost (last-registered) layer', () => {
    const a = vi.fn();
    const b = vi.fn();
    pushDismissLayer({ onEscape: a, getElement: () => null });
    pushDismissLayer({ onEscape: b, getElement: () => null });
    pressEscape();
    expect(b).toHaveBeenCalledOnce();
    expect(a).not.toHaveBeenCalled();
  });

  it('marks the event defaultPrevented so base listeners can stand down', () => {
    pushDismissLayer({ onEscape: () => {}, getElement: () => null });
    const e = pressEscape();
    expect(e.defaultPrevented).toBe(true);
  });

  it('does not preventDefault when no layers are registered', () => {
    const e = pressEscape();
    expect(e.defaultPrevented).toBe(false);
  });

  it('picks the DOM-deepest layer regardless of registration order', () => {
    const outer = document.createElement('div');
    const inner = document.createElement('div');
    outer.appendChild(inner);
    document.body.appendChild(outer);
    const outerFn = vi.fn();
    const innerFn = vi.fn();
    // Register INNER first, OUTER second. Last-registered would pick OUTER, but
    // INNER is the deeper DOM node so it must win.
    pushDismissLayer({ onEscape: innerFn, getElement: () => inner });
    pushDismissLayer({ onEscape: outerFn, getElement: () => outer });
    pressEscape();
    expect(innerFn).toHaveBeenCalledOnce();
    expect(outerFn).not.toHaveBeenCalled();
  });

  it('closes one layer per press — a second press hits the next layer', () => {
    const a = vi.fn();
    const removeA = pushDismissLayer({ onEscape: a, getElement: () => null });
    const b = vi.fn();
    const removeB = pushDismissLayer({
      onEscape: () => {
        b();
        removeB();
      },
      getElement: () => null,
    });
    pressEscape();
    expect(b).toHaveBeenCalledOnce();
    expect(a).not.toHaveBeenCalled();
    // b removed itself; the next press reaches a.
    pressEscape();
    expect(a).toHaveBeenCalledOnce();
    removeA();
  });

  it('ignores an Escape already consumed by an earlier handler', () => {
    const fn = vi.fn();
    pushDismissLayer({ onEscape: fn, getElement: () => null });
    const e = new KeyboardEvent('keydown', {
      key: 'Escape',
      bubbles: true,
      cancelable: true,
    });
    e.preventDefault();
    document.body.dispatchEvent(e);
    expect(fn).not.toHaveBeenCalled();
  });

  it('ignores non-Escape keys', () => {
    const fn = vi.fn();
    pushDismissLayer({ onEscape: fn, getElement: () => null });
    document.body.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true }),
    );
    expect(fn).not.toHaveBeenCalled();
  });
});
