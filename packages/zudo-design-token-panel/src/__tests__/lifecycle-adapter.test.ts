// @vitest-environment jsdom

/**
 * Tests for the framework-agnostic lifecycle adapter introduced for #50.
 *
 * Background: the panel module historically hard-coded
 * `astro:before-swap` / `astro:page-load` document listeners. That was
 * fine for Astro consumers, dead code everywhere else (zfb, vite, custom
 * SSGs). The adapter exposes `setLifecycleAdapter(...)` so non-Astro hosts
 * can route the same internal handlers through their own client-side
 * navigation lifecycle, while keeping the astro fallback for backwards
 * compatibility.
 *
 * The contracts under test:
 *
 *   1. With NO adapter (astro fallback active): dispatching
 *      `astro:before-swap` / `astro:page-load` on `document` runs the
 *      internal handlers (visible side effect: when the visibility flag is
 *      `'1'`, the panel root mounts).
 *
 *   2. With an adapter registered: the astro fallback is ACTIVELY UNBOUND.
 *      The same astro events become inert — only the adapter's installer
 *      callbacks route to the internal handlers.
 *
 *   3. Re-registration cleans up the previous adapter's cleanup fns
 *      before binding the new one (no listener leaks).
 *
 *   4. `setLifecycleAdapter(null)` re-installs the astro fallback,
 *      making the document listeners live again.
 *
 * Approach: rather than spy on the (private) internal handlers, we observe
 * a public side effect that we know fires from `reapplyFromStorage`:
 * when the panel's visibility flag is `'1'`, a page-load triggers a
 * Preact mount and the panel root element appears in the DOM. We toggle
 * visibility between phases and assert mount / no-mount behaviour. This
 * keeps the test coupled to user-observable behaviour, not private symbols.
 *
 * Module-state caveat: the panel module installs document listeners at
 * import time. If we used `vi.resetModules()` to get a fresh bootstrap per
 * test, prior modules' listeners would linger on the document object
 * (jsdom shares `document` across tests in a file) and a single dispatch
 * would trigger every old `reapplyFromStorage` we've ever registered,
 * defeating the unbind assertion. Instead we import the module ONCE for
 * the whole file and reset state between tests via
 * `setLifecycleAdapter(null)` (which drains current cleanup fns and
 * re-binds the astro fallback) plus storage / DOM resets.
 */

import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  __resetPanelConfigForTests,
  getPanelConfig,
  panelRootId,
  storageKey_visible,
} from '../config/panel-config';
import { setLifecycleAdapter, type LifecycleAdapter } from '../index';

/** Cleanup-fn callable signature returned by an adapter installer. */
type CleanupFn = () => void;
/** Adapter installer signature: receives the panel's internal handler, returns a cleanup fn. */
type Installer = (callback: () => void) => CleanupFn;
/** A vi.fn() typed as an `Installer` so it satisfies the strict `LifecycleAdapter` callback signature. */
type InstallerMock = ReturnType<typeof vi.fn<Installer>>;

const STORAGE_KEY_VISIBLE = storageKey_visible(getPanelConfig());
const PANEL_ROOT_ID = panelRootId(getPanelConfig());

/**
 * Wait for Preact's effect flush. Same recipe as
 * `auto-mount-on-visibility.test.tsx` — see that file for the rAF /
 * setTimeout timing rationale.
 */
async function waitForEffectFlush(): Promise<void> {
  await new Promise<void>((resolve) =>
    requestAnimationFrame(() => requestAnimationFrame(() => resolve())),
  );
  await new Promise<void>((resolve) => setTimeout(resolve, 50));
}

/**
 * Trigger a synthetic astro page-load. Used as the probe for "is the astro
 * fallback currently bound?" — when bound, this fires `reapplyFromStorage`,
 * which mounts the panel iff `STORAGE_KEY_VISIBLE === '1'`.
 */
function dispatchAstroPageLoad(): void {
  document.dispatchEvent(new CustomEvent('astro:page-load'));
}

interface AdapterMock {
  /** Typed as `LifecycleAdapter` so it passes `setLifecycleAdapter`'s strict signature. */
  adapter: LifecycleAdapter;
  /** Same installer fns kept under their concrete `InstallerMock` type so tests can assert call counts. */
  onBeforeSwap: InstallerMock;
  onPageLoad: InstallerMock;
  beforeSwapCleanup: ReturnType<typeof vi.fn<CleanupFn>>;
  pageLoadCleanup: ReturnType<typeof vi.fn<CleanupFn>>;
  /** Most recent installer callback captured per hook. */
  capturedBeforeSwap: () => void;
  capturedPageLoad: () => void;
}

function createAdapterMock(): AdapterMock {
  const beforeSwapCleanup = vi.fn<CleanupFn>();
  const pageLoadCleanup = vi.fn<CleanupFn>();
  const onBeforeSwap = vi.fn<Installer>();
  const onPageLoad = vi.fn<Installer>();
  const ref: AdapterMock = {
    adapter: { onBeforeSwap, onPageLoad },
    onBeforeSwap,
    onPageLoad,
    beforeSwapCleanup,
    pageLoadCleanup,
    capturedBeforeSwap: () => {},
    capturedPageLoad: () => {},
  };
  onBeforeSwap.mockImplementation((cb: () => void) => {
    ref.capturedBeforeSwap = cb;
    return beforeSwapCleanup;
  });
  onPageLoad.mockImplementation((cb: () => void) => {
    ref.capturedPageLoad = cb;
    return pageLoadCleanup;
  });
  return ref;
}

describe('design-token-panel lifecycle adapter (#50)', () => {
  beforeAll(() => {
    // Module-init bootstrap may have mounted the panel during import (the
    // visibility flag could carry over from another test file in the same
    // process). Drain the DOM once before the per-test setup takes over.
    document.body.innerHTML = '';
  });

  beforeEach(() => {
    // Restore the astro fallback bindings to a known clean state. This
    // drains whatever cleanup fns the previous test left active and
    // re-installs the astro fallback fresh — the document ends up with
    // exactly one pair of `astro:before-swap` / `astro:page-load` listeners.
    setLifecycleAdapter(null);
    __resetPanelConfigForTests();
    localStorage.clear();
    document.body.innerHTML = '';
  });

  afterEach(() => {
    // Make sure no test leaves a custom adapter installed (which would
    // unbind the astro fallback for whatever runs next).
    setLifecycleAdapter(null);
    document.body.innerHTML = '';
    localStorage.clear();
  });

  it('astro fallback is active when no adapter is registered', async () => {
    localStorage.setItem(STORAGE_KEY_VISIBLE, '1');
    expect(document.getElementById(PANEL_ROOT_ID)).toBeNull();

    dispatchAstroPageLoad();
    await waitForEffectFlush();

    expect(document.getElementById(PANEL_ROOT_ID)).not.toBeNull();
  });

  it('registering an adapter unbinds the astro fallback', async () => {
    localStorage.setItem(STORAGE_KEY_VISIBLE, '1');

    const mock = createAdapterMock();
    setLifecycleAdapter(mock.adapter);

    expect(mock.onBeforeSwap).toHaveBeenCalledTimes(1);
    expect(mock.onPageLoad).toHaveBeenCalledTimes(1);

    // Astro fallback removed: dispatching the document event must NOT mount.
    dispatchAstroPageLoad();
    await waitForEffectFlush();
    expect(document.getElementById(PANEL_ROOT_ID)).toBeNull();

    // Calling the adapter's captured page-load handler DOES mount —
    // the same internal handler was rebound through the adapter.
    mock.capturedPageLoad();
    await waitForEffectFlush();
    expect(document.getElementById(PANEL_ROOT_ID)).not.toBeNull();
  });

  it('re-registration cleans up the previous adapter before binding the new one', async () => {
    localStorage.setItem(STORAGE_KEY_VISIBLE, '1');

    const adapterA = createAdapterMock();
    const adapterB = createAdapterMock();

    setLifecycleAdapter(adapterA.adapter);
    expect(adapterA.beforeSwapCleanup).not.toHaveBeenCalled();
    expect(adapterA.pageLoadCleanup).not.toHaveBeenCalled();

    setLifecycleAdapter(adapterB.adapter);

    // A's cleanups fired exactly once during the swap.
    expect(adapterA.beforeSwapCleanup).toHaveBeenCalledTimes(1);
    expect(adapterA.pageLoadCleanup).toHaveBeenCalledTimes(1);

    // B's installers ran once each.
    expect(adapterB.onBeforeSwap).toHaveBeenCalledTimes(1);
    expect(adapterB.onPageLoad).toHaveBeenCalledTimes(1);

    // Only B routes to the live handler; firing through B mounts the panel.
    adapterB.capturedPageLoad();
    await waitForEffectFlush();
    expect(document.getElementById(PANEL_ROOT_ID)).not.toBeNull();
  });

  it('setLifecycleAdapter(null) restores the astro fallback', async () => {
    localStorage.setItem(STORAGE_KEY_VISIBLE, '1');

    const mock = createAdapterMock();
    setLifecycleAdapter(mock.adapter);

    // Sanity: astro is inert while the adapter owns the channel.
    dispatchAstroPageLoad();
    await waitForEffectFlush();
    expect(document.getElementById(PANEL_ROOT_ID)).toBeNull();

    setLifecycleAdapter(null);

    expect(mock.beforeSwapCleanup).toHaveBeenCalledTimes(1);
    expect(mock.pageLoadCleanup).toHaveBeenCalledTimes(1);

    // Astro fallback is back: dispatching the document event mounts again.
    dispatchAstroPageLoad();
    await waitForEffectFlush();
    expect(document.getElementById(PANEL_ROOT_ID)).not.toBeNull();
  });
});
