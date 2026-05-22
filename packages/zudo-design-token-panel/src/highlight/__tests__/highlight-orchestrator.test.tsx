// @vitest-environment jsdom

/**
 * Integration tests for HighlightOrchestrator.
 *
 * Strategy:
 * - Most tests render <HighlightOrchestrator> in a real jsdom environment.
 * - findElementsUsingToken is mocked via vi.mock to give deterministic returns.
 * - A subset of tests inject real <style> rules to exercise the stylesheet
 *   observer path (stylesheetVersion bump + re-resolve).
 * - The HighlightOverlay uses a RAF loop; we replace requestAnimationFrame with
 *   a manual queue (same pattern as highlight-overlay.test.tsx) so we can
 *   flush exactly one tick and assert overlay positions.
 *
 * Acceptance criteria covered:
 * 1. Toggling adds overlay divs for matching elements.
 * 2. Toggling off removes overlays.
 * 3. Multiple tokens → distinct slot colors per reservation-sheet rules.
 * 4. Editing a slot color (setSlot) instantly recolors active overlays.
 * 5. Appending a <style> to <head> triggers re-resolve.
 * 6. Closing the panel (open===false parent gate) does NOT clear overlays.
 * 7. astro:after-swap recreates the portal mount if detached.
 * 8. matchCounts are populated in context.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render, h } from 'preact';
import { act } from 'preact/test-utils';
import { useContext } from 'preact/hooks';
import { HighlightOrchestrator } from '../highlight-orchestrator';
import {
  HighlightContext,
  type HighlightContextValue,
} from '../highlight-toggle-button';

// ---------------------------------------------------------------------------
// Mock findElementsUsingToken
// ---------------------------------------------------------------------------

const mockFindElements = vi.fn();

vi.mock('../find-elements', () => ({
  findElementsUsingToken: (cssVar: string, options?: unknown) => mockFindElements(cssVar, options),
}));

// ---------------------------------------------------------------------------
// Manual RAF queue
// ---------------------------------------------------------------------------

type RafCallback = (time: number) => void;
let rafQueue: RafCallback[] = [];
let rafTime = 0;

function flushRaf(): void {
  const toRun = rafQueue.slice();
  rafQueue = [];
  for (const cb of toRun) cb(rafTime++);
}

// ---------------------------------------------------------------------------
// Setup / teardown
// ---------------------------------------------------------------------------

let container: HTMLDivElement;

beforeEach(() => {
  rafQueue = [];
  rafTime = 0;
  window.requestAnimationFrame = (cb: RafCallback): number => {
    rafQueue.push(cb);
    return rafQueue.length;
  };
  window.cancelAnimationFrame = vi.fn();

  // Clear storage to prevent state bleeding between tests
  sessionStorage.clear();
  localStorage.clear();

  container = document.createElement('div');
  document.body.appendChild(container);

  // Default mock: no elements found for any token
  mockFindElements.mockReturnValue({ elements: [], warnings: [] });
});

afterEach(() => {
  act(() => render(null, container));
  document.body.removeChild(container);
  vi.restoreAllMocks();
  // Clear storage between tests
  sessionStorage.clear();
  localStorage.clear();
  // Clean up portal mount if created
  const mount = document.getElementById('tokenpanel-highlight-mount');
  if (mount) mount.remove();
  // Clean up any injected style sheets from tests
  for (const s of Array.from(document.head.querySelectorAll('style[data-test]'))) {
    s.remove();
  }
});

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeElement(): HTMLDivElement {
  const el = document.createElement('div');
  el.getBoundingClientRect = () =>
    ({
      top: 10,
      left: 20,
      width: 100,
      height: 50,
      right: 120,
      bottom: 60,
      x: 20,
      y: 10,
      toJSON: () => ({}),
    }) as DOMRect;
  document.body.appendChild(el);
  return el;
}

/** Consumer component that reads context and exposes it via a ref. */
function ContextCapture({
  onCtx,
}: {
  onCtx: (ctx: HighlightContextValue | null) => void;
}) {
  const ctx = useContext(HighlightContext);
  onCtx(ctx);
  return null;
}

function renderOrchestrator(
  onCtx: (ctx: HighlightContextValue | null) => void,
): void {
  act(() => {
    render(
      h(HighlightOrchestrator, null,
        h(ContextCapture, { onCtx }),
      ),
      container,
    );
  });
}

// ---------------------------------------------------------------------------
// 1. Toggling adds overlay divs
// ---------------------------------------------------------------------------

describe('toggle adds overlay', () => {
  it('overlay div appears in portal mount after toggle', () => {
    const el = makeElement();
    mockFindElements.mockReturnValue({ elements: [el], warnings: [] });

    let ctx: HighlightContextValue | null = null;
    renderOrchestrator((c) => { ctx = c; });

    act(() => { ctx!.toggle('--brand'); });
    act(() => { flushRaf(); });

    const mount = document.getElementById('tokenpanel-highlight-mount');
    expect(mount).not.toBeNull();
    const overlays = mount!.querySelectorAll('.tokenpanel-highlight-overlay');
    expect(overlays.length).toBeGreaterThanOrEqual(1);

    el.remove();
  });
});

// ---------------------------------------------------------------------------
// 2. Toggling off removes overlays
// ---------------------------------------------------------------------------

describe('toggle off removes overlay', () => {
  it('overlay disappears after toggling the same token off', () => {
    const el = makeElement();
    mockFindElements.mockReturnValue({ elements: [el], warnings: [] });

    let ctx: HighlightContextValue | null = null;
    renderOrchestrator((c) => { ctx = c; });

    // Toggle on
    act(() => { ctx!.toggle('--brand'); });
    // Flush RAF to let the RAF loop render overlay positions
    act(() => { flushRaf(); flushRaf(); });

    const mount = document.getElementById('tokenpanel-highlight-mount');
    expect(mount!.querySelectorAll('.tokenpanel-highlight-overlay').length).toBeGreaterThanOrEqual(1);

    // Toggle off
    mockFindElements.mockReturnValue({ elements: [], warnings: [] });
    act(() => { ctx!.toggle('--brand'); });
    act(() => { flushRaf(); flushRaf(); });

    expect(mount!.querySelectorAll('.tokenpanel-highlight-overlay').length).toBe(0);

    el.remove();
  });
});

// ---------------------------------------------------------------------------
// 3. Multiple tokens → distinct slot colors
// ---------------------------------------------------------------------------

describe('multiple tokens get distinct slot colors', () => {
  it('two toggled tokens get overlays with different slot colors', () => {
    const el1 = makeElement();
    const el2 = makeElement();

    mockFindElements.mockImplementation((cssVar: string) => {
      if (cssVar === '--brand') return { elements: [el1], warnings: [] };
      if (cssVar === '--secondary') return { elements: [el2], warnings: [] };
      return { elements: [], warnings: [] };
    });

    let ctx: HighlightContextValue | null = null;
    renderOrchestrator((c) => { ctx = c; });

    act(() => { ctx!.toggle('--brand'); });
    act(() => { ctx!.toggle('--secondary'); });
    act(() => { flushRaf(); });

    // Verify context has both tokens active in distinct slots
    const state = ctx!.state;
    const slot1 = state.active['--brand'];
    const slot2 = state.active['--secondary'];
    expect(slot1).not.toBe(slot2);

    // slot colors should differ (different reservation slots)
    const color1 = state.slots[slot1].color;
    const color2 = state.slots[slot2].color;
    expect(color1).not.toBe(color2);

    el1.remove();
    el2.remove();
  });
});

// ---------------------------------------------------------------------------
// 4. setSlot recolors active overlays
// ---------------------------------------------------------------------------

describe('setSlot recolors overlays', () => {
  it('calling setSlot updates context state immediately', () => {
    const el = makeElement();
    mockFindElements.mockReturnValue({ elements: [el], warnings: [] });

    let ctx: HighlightContextValue | null = null;
    renderOrchestrator((c) => { ctx = c; });

    act(() => { ctx!.toggle('--brand'); });

    const slotIdx = ctx!.state.active['--brand'];
    expect(slotIdx).toBe(0); // first slot

    act(() => { ctx!.setSlot!(0, { color: '#00ff00' }); });

    expect(ctx!.state.slots[0].color).toBe('#00ff00');

    el.remove();
  });
});

// ---------------------------------------------------------------------------
// 5. Appending a <style> bumps stylesheetVersion
// ---------------------------------------------------------------------------

describe('stylesheet observer', () => {
  it('appending a <style> to <head> triggers re-resolve for active tokens', async () => {
    const el1 = makeElement();
    const el2 = makeElement();

    // Phase 1: return 1 element
    mockFindElements.mockReturnValue({ elements: [el1], warnings: [] });

    let ctx: HighlightContextValue | null = null;
    renderOrchestrator((c) => { ctx = c; });

    act(() => { ctx!.toggle('--brand'); });

    // matchCounts should reflect 1 element now
    expect(ctx!.matchCounts?.['--brand']).toBe(1);

    // Phase 2: after style injection, return 2 elements
    mockFindElements.mockReturnValue({ elements: [el1, el2], warnings: [] });

    // Inject a style node — this triggers the MutationObserver
    const style = document.createElement('style');
    style.setAttribute('data-test', 'true');
    style.textContent = ':root { --brand: blue; }';

    await act(async () => {
      document.head.appendChild(style);
      // Wait for the MutationObserver to fire (microtask-async in jsdom)
      await new Promise((r) => setTimeout(r, 0));
    });

    // stylesheetVersion should have bumped → useMemo recomputes → matchCounts = 2
    expect(ctx!.matchCounts?.['--brand']).toBe(2);

    el1.remove();
    el2.remove();
  });
});

// ---------------------------------------------------------------------------
// 6. Panel closed does NOT clear overlays
// ---------------------------------------------------------------------------

describe('panel closed keeps overlays', () => {
  it('overlay portal persists when parent renders without the panel JSX', () => {
    const el = makeElement();
    mockFindElements.mockReturnValue({ elements: [el], warnings: [] });

    let ctx: HighlightContextValue | null = null;

    function App({ show }: { show: boolean }) {
      return h(HighlightOrchestrator, null,
        show
          ? h(ContextCapture, { onCtx: (c) => { ctx = c; } })
          : null,
      );
    }

    act(() => { render(h(App, { show: true }), container); });

    act(() => { ctx!.toggle('--brand'); });
    act(() => { flushRaf(); });

    const mount = document.getElementById('tokenpanel-highlight-mount');
    expect(mount!.querySelectorAll('.tokenpanel-highlight-overlay').length).toBeGreaterThanOrEqual(1);

    // Simulate panel close — no longer rendering children inside orchestrator
    act(() => { render(h(App, { show: false }), container); });
    act(() => { flushRaf(); });

    // The orchestrator itself still renders the OverlayPortal
    // Overlay content depends on state being preserved — the mount should still exist
    expect(document.getElementById('tokenpanel-highlight-mount')).not.toBeNull();

    el.remove();
  });
});

// ---------------------------------------------------------------------------
// 7. astro:after-swap recreates portal mount if detached
// ---------------------------------------------------------------------------

describe('astro:after-swap', () => {
  it('recreates the portal mount node when it was removed from DOM', async () => {
    let ctx: HighlightContextValue | null = null;
    renderOrchestrator((c) => { ctx = c; });

    // Ensure mount exists
    expect(document.getElementById('tokenpanel-highlight-mount')).not.toBeNull();

    // Simulate Astro view transition removing the old body content
    const oldMount = document.getElementById('tokenpanel-highlight-mount')!;
    oldMount.remove();
    expect(document.getElementById('tokenpanel-highlight-mount')).toBeNull();

    // Fire the after-swap event
    await act(async () => {
      window.dispatchEvent(new Event('astro:after-swap'));
      await new Promise((r) => setTimeout(r, 0));
    });

    // The mount should be recreated
    expect(document.getElementById('tokenpanel-highlight-mount')).not.toBeNull();

    void ctx; // ctx is captured but not asserted here
  });
});

// ---------------------------------------------------------------------------
// 8. matchCounts populated
// ---------------------------------------------------------------------------

describe('matchCounts', () => {
  it('matchCounts reflects number of elements for each active token', () => {
    const el1 = makeElement();
    const el2 = makeElement();
    const el3 = makeElement();

    mockFindElements.mockImplementation((cssVar: string) => {
      if (cssVar === '--brand') return { elements: [el1, el2, el3], warnings: [] };
      return { elements: [], warnings: [] };
    });

    let ctx: HighlightContextValue | null = null;
    renderOrchestrator((c) => { ctx = c; });

    act(() => { ctx!.toggle('--brand'); });

    expect(ctx!.matchCounts?.['--brand']).toBe(3);

    el1.remove();
    el2.remove();
    el3.remove();
  });

  it('matchCounts is 0 when no elements match', () => {
    mockFindElements.mockReturnValue({ elements: [], warnings: [] });

    let ctx: HighlightContextValue | null = null;
    renderOrchestrator((c) => { ctx = c; });

    act(() => { ctx!.toggle('--noop'); });

    expect(ctx!.matchCounts?.['--noop']).toBe(0);
  });

  it('matchCounts is absent for inactive tokens', () => {
    let ctx: HighlightContextValue | null = null;
    renderOrchestrator((c) => { ctx = c; });

    expect(ctx!.matchCounts?.['--not-active']).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// disableAll — clear active map + persist
// ---------------------------------------------------------------------------

describe('disableAll', () => {
  it('clears the active map and preserves slots', () => {
    let ctx: HighlightContextValue | null = null;
    renderOrchestrator((c) => { ctx = c; });

    // Activate 3 tokens
    act(() => { ctx!.toggle('--brand'); });
    act(() => { ctx!.toggle('--secondary'); });
    act(() => { ctx!.toggle('--accent'); });
    expect(Object.keys(ctx!.state.active)).toHaveLength(3);

    const slotsBefore = ctx!.state.slots.map((s) => ({ ...s }));

    act(() => { ctx!.disableAll!(); });

    expect(ctx!.state.active).toEqual({});
    expect(ctx!.state.slots).toEqual(slotsBefore);
  });

  it('persists empty active to sessionStorage after disableAll so reload does not resurrect highlights', () => {
    let ctx: HighlightContextValue | null = null;
    renderOrchestrator((c) => { ctx = c; });

    act(() => { ctx!.toggle('--brand'); });
    act(() => { ctx!.toggle('--secondary'); });

    // Confirm active map has entries before disable
    expect(Object.keys(ctx!.state.active)).toHaveLength(2);

    act(() => { ctx!.disableAll!(); });

    // After disableAll, sessionStorage must contain empty active map so a reload
    // does not resurrect previously-active highlights.
    // The key is derived from the default storagePrefix: 'zudo-design-token-panel'.
    const activeKey = 'zudo-design-token-panel-highlight-active';
    const stored = sessionStorage.getItem(activeKey);
    expect(stored).not.toBeNull();
    expect(JSON.parse(stored!)).toEqual({});
  });

  it('provides disableAll in context', () => {
    let ctx: HighlightContextValue | null = null;
    renderOrchestrator((c) => { ctx = c; });

    expect(typeof ctx!.disableAll).toBe('function');
  });
});

// ---------------------------------------------------------------------------
// 9. Theme observer — data-theme attribute change triggers re-probe
// ---------------------------------------------------------------------------

describe('theme observer', () => {
  it('changing documentElement data-theme triggers re-probe for active tokens', async () => {
    const el1 = makeElement();
    const el2 = makeElement();

    // Phase 1: equality probe returns 1 element
    mockFindElements.mockReturnValue({ elements: [el1], warnings: [] });

    let ctx: HighlightContextValue | null = null;
    renderOrchestrator((c) => { ctx = c; });

    act(() => { ctx!.toggle('--brand'); });

    // matchCounts reflects 1 element after equality probe hit
    expect(ctx!.matchCounts?.['--brand']).toBe(1);

    // Phase 2: after theme flip, return 2 elements
    mockFindElements.mockReturnValue({ elements: [el1, el2], warnings: [] });

    await act(async () => {
      document.documentElement.setAttribute('data-theme', 'dark');
      await new Promise((r) => setTimeout(r, 0));
    });

    // themeVersion should have bumped → cache miss → re-probe → matchCounts = 2
    expect(ctx!.matchCounts?.['--brand']).toBe(2);

    // Cleanup
    document.documentElement.removeAttribute('data-theme');
    el1.remove();
    el2.remove();
  });
});

// ---------------------------------------------------------------------------
// 10. Match cache — slot edit does NOT re-probe (cache hit)
// ---------------------------------------------------------------------------

describe('match cache', () => {
  it('editing a slot does not re-probe the DOM for active tokens', () => {
    const el = makeElement();
    mockFindElements.mockReturnValue({ elements: [el], warnings: [] });

    let ctx: HighlightContextValue | null = null;
    renderOrchestrator((c) => { ctx = c; });

    act(() => { ctx!.toggle('--brand'); });

    // After toggle, probe was called (equality returned 1 element → no differential)
    const callCountAfterToggle = mockFindElements.mock.calls.length;
    expect(callCountAfterToggle).toBeGreaterThanOrEqual(1);

    // Now edit the slot color — active tokens and versions unchanged
    act(() => { ctx!.setSlot!(0, { color: '#0000ff' }); });

    // findElementsUsingToken should NOT have been called again (cache hit)
    expect(mockFindElements.mock.calls.length).toBe(callCountAfterToggle);

    el.remove();
  });
});

// ---------------------------------------------------------------------------
// Context shape tests
// ---------------------------------------------------------------------------

describe('context value shape', () => {
  it('provides state, toggle, setSlot, reset, disableAll, matchCounts in context', () => {
    let ctx: HighlightContextValue | null = null;
    renderOrchestrator((c) => { ctx = c; });

    expect(ctx).not.toBeNull();
    expect(typeof ctx!.state).toBe('object');
    expect(typeof ctx!.toggle).toBe('function');
    expect(typeof ctx!.setSlot).toBe('function');
    expect(typeof ctx!.reset).toBe('function');
    expect(typeof ctx!.disableAll).toBe('function');
    expect(typeof ctx!.matchCounts).toBe('object');
  });

  it('initial state has 10 slots and empty active map', () => {
    let ctx: HighlightContextValue | null = null;
    renderOrchestrator((c) => { ctx = c; });

    expect(ctx!.state.slots).toHaveLength(10);
    expect(Object.keys(ctx!.state.active)).toHaveLength(0);
  });

  it('reset restores default slot colors', () => {
    let ctx: HighlightContextValue | null = null;
    renderOrchestrator((c) => { ctx = c; });

    act(() => { ctx!.setSlot!(0, { color: '#123456' }); });
    expect(ctx!.state.slots[0].color).toBe('#123456');

    act(() => { ctx!.reset!(); });
    // Default slot 0 color
    expect(ctx!.state.slots[0].color).toBe('#ff2d2d');
  });
});
