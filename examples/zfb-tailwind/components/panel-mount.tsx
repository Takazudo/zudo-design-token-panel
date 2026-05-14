"use client";

/**
 * PanelMount — the `"use client"` island that bootstraps the design-token
 * panel adapter inside the zfb hydration pipeline.
 *
 * zfb renders pages as server components by default. This file marks the
 * boundary between server-rendered HTML and the Preact island that runs in
 * the browser. Wrapping this component in `<Island when="visible">` in
 * `pages/index.tsx` defers hydration until the element scrolls into view,
 * keeping the panel adapter out of the initial critical-path JS chunk.
 *
 * Panel adapter bootstrap
 * -----------------------
 * The responsibilities mirror the Vite + React example's `src/lib/mount-panel.ts`:
 *
 *   1. `configurePanel(panelConfig)` — supplies the host's config object to
 *      the panel package's singleton BEFORE any other panel API runs. Called
 *      once per storagePrefix, gated by the `bound` flag on
 *      `window.__zudoDesignTokenPanelAdapter`.
 *   2. Console API on `window[cfg.consoleNamespace]` — exposes
 *      `showDesignPanel` / `hideDesignPanel` / `toggleDesignPanel`.
 *   3. Lazy-load gate — eagerly load the panel module when the user had it
 *      open last session (`wasVisible()`) OR has persisted token overrides
 *      (`hasPersistedOverrides()`). Either signal means the panel must boot
 *      before first paint to avoid an FOUT.
 *   4. `reapplyPersistedOverrides()` — called immediately after
 *      `configurePanel` so persisted overrides land before the first paint.
 *
 * Storage-key formatters
 * ----------------------
 * `storageKey_visible` and `storageKey_stateV2` are replicated here
 * (rather than imported from the package) because they live in an internal
 * module not on the public surface. The formatters are trivial 1-line string
 * concatenations. The canonical definitions in the package source MUST match:
 *
 *   storageKey_visible(cfg) -> `${cfg.storagePrefix}:visible`   (literal `:`)
 *   storageKey_stateV2(cfg) -> `${cfg.storagePrefix}-state-v2`  (literal `-`)
 *
 * Note the asymmetry: the visible-key uses `:` while every other derived key
 * uses `-`. It is a historical artifact preserved for storage-key continuity —
 * see the comment on `storageKey_visible` in the package.
 *
 * Returns `null` — the panel adapter appends its own DOM root outside the
 * Preact tree; this component owns no DOM of its own.
 */

import { useEffect } from 'preact/hooks';
import type { PanelConfig } from '@takazudo/zudo-design-token-panel/astro';
import { panelConfig } from '../config/panel-config';

// Mirrors the panel module's main entry shape we lazy-import below.
type DesignTokenPanelModule = typeof import('@takazudo/zudo-design-token-panel');

interface DesignTokenPanelAdapterState {
  /** Per-`storagePrefix` bind flag — re-runs are no-ops. */
  bound: boolean;
  /** Memoised module promise so steady-state toggle/show/hide share one load. */
  modulePromise: Promise<DesignTokenPanelModule> | null;
}

interface ConsoleApiSurface {
  showDesignPanel?: () => Promise<void>;
  hideDesignPanel?: () => Promise<void>;
  toggleDesignPanel?: () => Promise<void>;
  [extra: string]: unknown;
}

type AdapterStateMap = Record<string, DesignTokenPanelAdapterState>;

interface AdapterWindow extends Window {
  __zudoDesignTokenPanelAdapter?: AdapterStateMap;
  [namespace: string]: unknown;
}

function storageKey_visible(cfg: PanelConfig): string {
  // Mirrors packages/zudo-design-token-panel/src/config/panel-config.ts —
  // the literal `:` separator (NOT `-`) is intentional and historical.
  return `${cfg.storagePrefix}:visible`;
}

function storageKey_stateV2(cfg: PanelConfig): string {
  return `${cfg.storagePrefix}-state-v2`;
}

function getAdapterStateMap(win: AdapterWindow): AdapterStateMap {
  if (!win.__zudoDesignTokenPanelAdapter) {
    win.__zudoDesignTokenPanelAdapter = {};
  }
  return win.__zudoDesignTokenPanelAdapter;
}

function getAdapterState(win: AdapterWindow, key: string): DesignTokenPanelAdapterState {
  const map = getAdapterStateMap(win);
  let state = map[key];
  if (!state) {
    state = { bound: false, modulePromise: null };
    map[key] = state;
  }
  return state;
}

function wasVisible(visibleKey: string): boolean {
  try {
    return window.localStorage.getItem(visibleKey) === '1';
  } catch {
    return false;
  }
}

function hasPersistedOverrides(stateV2Key: string): boolean {
  try {
    return window.localStorage.getItem(stateV2Key) !== null;
  } catch {
    return false;
  }
}

async function loadPanelModule(state: DesignTokenPanelAdapterState) {
  if (state.modulePromise === null) {
    state.modulePromise = import('@takazudo/zudo-design-token-panel').then((mod) => {
      // Configure FIRST — every other panel API reads getPanelConfig() and
      // must observe the host's intended values, not the package sentinel.
      mod.configurePanel(panelConfig);

      // Wire the panel into zfb-runtime's SPA navigation lifecycle.
      // onBeforeSwap: zfb:before-swap fires just before DOM swap — panel uses
      //   this to tear down / re-mount as needed across soft navigations.
      // onPageLoad: zfb:after-swap fires after DOM swap, mirrors astro:page-load
      //   and astro:after-swap — panel re-reads tokens from the new page DOM.
      // Each registration returns an unsubscribe function; panel calls it on
      // teardown. addEventListener is idempotent for the same function ref,
      // but the adapter pattern calls these with new closures each time, so
      // the returned removeEventListener call is the correct cleanup path.
      mod.setLifecycleAdapter({
        onBeforeSwap: (cb) => {
          document.addEventListener('zfb:before-swap', cb);
          return () => document.removeEventListener('zfb:before-swap', cb);
        },
        onPageLoad: (cb) => {
          document.addEventListener('zfb:after-swap', cb);
          return () => document.removeEventListener('zfb:after-swap', cb);
        },
      });

      try {
        mod.reapplyPersistedOverrides();
      } catch (err) {
        // Defensive: never let a bad persist-state read kill the panel surface.
        console.warn(
          '[design-token-panel] reapplyPersistedOverrides() threw: ' + (err as Error).message,
        );
      }
      return mod;
    });
  }
  return state.modulePromise;
}

function installConsoleApi(
  win: AdapterWindow,
  namespace: string,
  state: DesignTokenPanelAdapterState,
): void {
  const existing = (win[namespace] as ConsoleApiSurface | undefined) ?? {};
  existing.showDesignPanel = async () => {
    const panel = await loadPanelModule(state);
    panel.showDesignTokenPanel();
  };
  existing.hideDesignPanel = async () => {
    const panel = await loadPanelModule(state);
    panel.hideDesignTokenPanel();
  };
  existing.toggleDesignPanel = async () => {
    const panel = await loadPanelModule(state);
    panel.toggleDesignPanel();
  };
  win[namespace] = existing;
}

function mountPanel(): void {
  if (typeof window === 'undefined') return;

  const cfg = panelConfig;
  const win = window as unknown as AdapterWindow;
  const state = getAdapterState(win, cfg.storagePrefix);

  // Install console API every time — `bound` only gates the lazy-load
  // probes, since the console handlers are idempotent.
  installConsoleApi(win, cfg.consoleNamespace, state);

  if (state.bound) return;
  state.bound = true;

  const visibleKey = storageKey_visible(cfg);
  const stateV2Key = storageKey_stateV2(cfg);
  if (wasVisible(visibleKey) || hasPersistedOverrides(stateV2Key)) {
    void loadPanelModule(state);
  }
}

export default function PanelMount() {
  useEffect(() => {
    mountPanel();
    // No cleanup: the panel adapter installs window-level state that lives
    // for the page lifetime. A teardown on unmount would be wrong.
  }, []);
  return null;
}
