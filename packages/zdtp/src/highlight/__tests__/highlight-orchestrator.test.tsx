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

// ---------------------------------------------------------------------------
// Safety net: pin no-op RAF/cAF on globalThis so bare-global lookups never
// see `undefined` even if Preact's deferred setTimeout-scheduled cleanup fires
// after vi.restoreAllMocks() has removed the per-test mocks.
// ---------------------------------------------------------------------------
globalThis.requestAnimationFrame = (cb: (time: number) => void): number => {
  setTimeout(() => cb(0), 0);
  return 0;
};
globalThis.cancelAnimationFrame = (): void => { /* no-op safety net */ };

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render, h } from 'preact';
import { act } from 'preact/test-utils';
import { useContext } from 'preact/hooks';
import { HighlightOrchestrator, tierKindToProbeKind } from '../highlight-orchestrator';
import {
  HighlightContext,
  type HighlightContextValue,
} from '../highlight-toggle-button';
import {
  configurePanel,
  __resetPanelConfigForTests,
} from '../../config/panel-config';

// ---------------------------------------------------------------------------
// Mock findElementsUsingToken
// ---------------------------------------------------------------------------

const mockFindElements = vi.fn();

// Spread the real module so genuine exports (PANEL_EXCLUSION_SELECTOR and the
// HIGHLIGHT_PORTAL_MOUNT_ID / ELPATH_PORTAL_MOUNT_ID constants the orchestrator
// reads) keep their real values; only findElementsUsingToken is mocked for
// deterministic probe results.
vi.mock('../find-elements', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../find-elements')>()),
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
  // Note: cancelAnimationFrame is intentionally NOT mocked with vi.fn() here.
  // No test asserts on its call count, and mocking it with vi.fn() would clobber
  // the module-top globalThis safety-net pin, which is then left undefined after
  // vi.restoreAllMocks() — causing the flaky ReferenceError in jsdom.

  // Clear storage to prevent state bleeding between tests
  sessionStorage.clear();
  localStorage.clear();

  container = document.createElement('div');
  document.body.appendChild(container);

  // Default mock: no elements found for any token
  mockFindElements.mockReturnValue({ elements: [], warnings: [] });
});

afterEach(async () => {
  act(() => render(null, container));
  // Flush Preact's deferred setTimeout-scheduled cleanup before restoring mocks.
  // Without this, Preact may call cancelAnimationFrame after vi.restoreAllMocks()
  // has removed the per-test mock, causing a ReferenceError in jsdom.
  await new Promise((r) => setTimeout(r, 0));
  document.body.removeChild(container);
  vi.restoreAllMocks();
  // Re-arm the safety net after vi.restoreAllMocks() in case any per-test code
  // clobbered globalThis.cancelAnimationFrame with a spy.
  globalThis.cancelAnimationFrame = (): void => { /* no-op safety net */ };
  globalThis.requestAnimationFrame = (cb: (time: number) => void): number => {
    setTimeout(() => cb(0), 0);
    return 0;
  };
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

    const callCountAfterToggle = mockFindElements.mock.calls.length;
    expect(callCountAfterToggle).toBeGreaterThanOrEqual(1);

    // Now edit the slot color — active tokens and versions unchanged
    act(() => { ctx!.setSlot!(0, { color: '#0000ff' }); });

    // findElementsUsingToken should NOT have been called again (cache hit)
    expect(mockFindElements.mock.calls.length).toBe(callCountAfterToggle);

    el.remove();
  });

  // F26: cache entry with a disconnected element is evicted and re-probed
  it('evicts cache entry and re-probes when a cached element becomes disconnected', () => {
    const el1 = makeElement();
    const el2 = makeElement();

    // Initial probe returns el1
    mockFindElements.mockReturnValue({ elements: [el1], warnings: [] });

    let ctx: HighlightContextValue | null = null;
    renderOrchestrator((c) => { ctx = c; });

    act(() => { ctx!.toggle('--brand'); });
    expect(ctx!.matchCounts?.['--brand']).toBe(1);

    const callCountAfterToggle = mockFindElements.mock.calls.length;
    expect(callCountAfterToggle).toBeGreaterThanOrEqual(1);

    // Disconnect el1 — but do NOT bump stylesheetVersion or themeVersion.
    // The cache key is unchanged, so a naïve cache hit would return the stale entry.
    el1.remove();
    expect(el1.isConnected).toBe(false);

    // Change mock so re-probe returns el2 (only the connected element)
    mockFindElements.mockReturnValue({ elements: [el2], warnings: [] });

    // Trigger useMemo re-run by changing slot color (no version bump).
    act(() => { ctx!.setSlot!(0, { color: '#0000ff' }); });

    // The isConnected guard must have evicted the stale entry → re-probe happened.
    expect(mockFindElements.mock.calls.length).toBeGreaterThan(callCountAfterToggle);
    // Result should reflect the re-probe (el2, not the detached el1).
    expect(ctx!.matchCounts?.['--brand']).toBe(1);

    el2.remove();
  });
});

// ---------------------------------------------------------------------------
// F26: stylesheet version bump clears the match cache
// ---------------------------------------------------------------------------

describe('cache clear on stylesheet version bump (F26)', () => {
  it('stylesheet injection clears the cache so old entries are not returned', async () => {
    const el1 = makeElement();
    const el2 = makeElement();

    mockFindElements.mockReturnValue({ elements: [el1], warnings: [] });

    let ctx: HighlightContextValue | null = null;
    renderOrchestrator((c) => { ctx = c; });

    act(() => { ctx!.toggle('--brand'); });
    expect(ctx!.matchCounts?.['--brand']).toBe(1);

    // After style injection, probe should use the new mock (fresh probe, not old cache entry).
    mockFindElements.mockReturnValue({ elements: [el1, el2], warnings: [] });

    const style = document.createElement('style');
    style.setAttribute('data-test', 'true');
    style.textContent = ':root { --brand: blue; }';

    await act(async () => {
      document.head.appendChild(style);
      await new Promise((r) => setTimeout(r, 0));
    });

    // Cache was cleared + version bumped → cache miss → re-probe with new mock
    expect(ctx!.matchCounts?.['--brand']).toBe(2);

    el1.remove();
    el2.remove();
  });

  it('astro:after-swap clears cache and bumps version so re-probe uses fresh results', async () => {
    const el1 = makeElement();
    const el2 = makeElement();

    mockFindElements.mockReturnValue({ elements: [el1], warnings: [] });

    let ctx: HighlightContextValue | null = null;
    renderOrchestrator((c) => { ctx = c; });

    act(() => { ctx!.toggle('--brand'); });
    expect(ctx!.matchCounts?.['--brand']).toBe(1);

    // After swap, probe should use the new mock (cache cleared + version bumped).
    mockFindElements.mockReturnValue({ elements: [el1, el2], warnings: [] });

    await act(async () => {
      window.dispatchEvent(new Event('astro:after-swap'));
      await new Promise((r) => setTimeout(r, 0));
    });

    expect(ctx!.matchCounts?.['--brand']).toBe(2);

    el1.remove();
    el2.remove();
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

// ---------------------------------------------------------------------------
// 11. Differential-only probe (F31 fix — skip equality pass for eligible kinds)
// ---------------------------------------------------------------------------

describe('differential-only probe (F31)', () => {
  it('calls findElementsUsingToken exactly once in differential mode for auto-detect tokens', () => {
    // cssVar not in tier config → tierKind = undefined → differential eligible
    const el = makeElement();
    mockFindElements.mockReturnValue({ elements: [el], warnings: [] });

    let ctx: HighlightContextValue | null = null;
    renderOrchestrator((c) => { ctx = c; });

    mockFindElements.mockClear();
    act(() => { ctx!.toggle('--f31-test'); });

    // F31 acceptance: exactly one findElementsUsingToken call (differential only),
    // not two calls (equality + differential).
    expect(mockFindElements).toHaveBeenCalledTimes(1);
    const call = mockFindElements.mock.calls[0];
    expect((call[1] as { mode?: string } | undefined)?.mode).toBe('differential');

    el.remove();
  });

  it('uses differential results only for auto-detect tokens (no union needed)', () => {
    // cssVar not in tier config → tierKind = undefined → differential eligible
    const elA = makeElement();
    const elB = makeElement();

    // differential returns both elements
    mockFindElements.mockImplementation((_cssVar: string, options?: { mode?: string }) => {
      if (options?.mode === 'differential') {
        return { elements: [elA, elB], warnings: [] };
      }
      return { elements: [], warnings: [] };
    });

    let ctx: HighlightContextValue | null = null;
    renderOrchestrator((c) => { ctx = c; });

    act(() => { ctx!.toggle('--probe-test'); });
    act(() => { flushRaf(); });

    // matchCounts reflects the differential result
    expect(ctx!.matchCounts?.['--probe-test']).toBe(2);

    const mount = document.getElementById('tokenpanel-highlight-mount');
    expect(mount).not.toBeNull();
    const overlays = mount!.querySelectorAll('.tokenpanel-highlight-overlay');
    expect(overlays.length).toBe(2);

    elA.remove();
    elB.remove();
  });

  it('warnings from the differential probe are logged without duplication', () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const warning = 'Cross-origin stylesheet skipped: https://cdn.example.com/styles.css';

    mockFindElements.mockReturnValue({ elements: [], warnings: [warning] });

    let ctx: HighlightContextValue | null = null;
    renderOrchestrator((c) => { ctx = c; });

    act(() => { ctx!.toggle('--warn-test'); });

    const warnCalls = warnSpy.mock.calls.filter((args) =>
      args.some((a) => typeof a === 'string' && a.includes(warning)),
    );
    expect(warnCalls).toHaveLength(1);

    warnSpy.mockRestore();
  });

  it('skips differential probe for text-kind tokens (string-only skip)', () => {
    // Reset first to handle process-global singleton in case a prior test file configured it.
    __resetPanelConfigForTests();
    // Configure a text-kind token so the orchestrator sees text kind in cssVarKindIndex.
    configurePanel({
      storagePrefix: 'zudo-design-token-panel',
      consoleNamespace: 'zudo',
      modalClassPrefix: 'zudo-design-token-panel-modal',
      schemaId: 'zudo-design-tokens/v1',
      exportFilenameBase: 'zudo-design-tokens',
      tabs: [{
        id: 'generic',
        label: 'Generic',
        tiers: [{
          id: 'fonts',
          label: 'Fonts',
          items: [{
            id: 'font-token',
            cssVar: '--font-family-text',
            label: 'Font Family',
            default: 'sans-serif',
            type: { kind: 'text' },
          }],
        }],
      }],
    });

    try {
      mockFindElements.mockReturnValue({ elements: [], warnings: [] });

      let ctx: HighlightContextValue | null = null;
      renderOrchestrator((c) => { ctx = c; });

      mockFindElements.mockClear();
      act(() => { ctx!.toggle('--font-family-text'); });

      // For a text-kind token, only equality is called (differential skipped).
      expect(mockFindElements).toHaveBeenCalledTimes(1);
      const call = mockFindElements.mock.calls[0];
      // The single call should NOT have mode: 'differential'
      expect((call[1] as { mode?: string } | undefined)?.mode).not.toBe('differential');
    } finally {
      __resetPanelConfigForTests();
    }
  });
});

// ---------------------------------------------------------------------------
// tierKindToProbeKind — new cursor/content/mask-image kinds pass through
// ---------------------------------------------------------------------------
//
// These three new kinds must honor the explicit manifest hint at probe time —
// auto-detect cannot route url()-valued cursor / mask-image tokens correctly
// (the url() branch in find-elements.ts falls back to 'text' with a warning).
// Passing the hint through ensures the dedicated probe config in TOKEN_TYPES
// for each kind is used.

describe('tierKindToProbeKind — new kinds pass the explicit hint through', () => {
  it('returns "cursor" for { kind: "cursor" }', () => {
    expect(tierKindToProbeKind({ kind: 'cursor' })).toBe('cursor');
  });

  it('returns "content" for { kind: "content" }', () => {
    expect(tierKindToProbeKind({ kind: 'content' })).toBe('content');
  });

  it('returns "mask-image" for { kind: "mask-image" }', () => {
    expect(tierKindToProbeKind({ kind: 'mask-image' })).toBe('mask-image');
  });
});
