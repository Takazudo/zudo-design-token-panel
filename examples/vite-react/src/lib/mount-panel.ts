/**
 * Vite + React host adapter for `@takazudo/zudo-design-token-panel`.
 *
 * The Astro example ships a package-provided host adapter
 * (`@takazudo/zudo-design-token-panel/astro/host-adapter`) that runs from a
 * per-page `<script>` block in `DesignTokenPanelHost.astro`. Vite + React has
 * no equivalent host component — the panel is mounted as a Preact island
 * from a React `useEffect`. So the adapter logic is ported here.
 *
 * Responsibilities (mirror the Astro adapter):
 *
 *  1. The host application MUST have already called `configurePanel(...)` in
 *     `src/main.tsx` BEFORE this function runs. The active config is passed
 *     in as `cfg` rather than read via a `getPanelConfig()` accessor — the
 *     package's main entry doesn't re-export `getPanelConfig` to consumers
 *     (only `configurePanel` is public), so the host application is the
 *     single source of truth for the config object during adapter setup.
 *  2. Install the console API on `window[cfg.consoleNamespace]`
 *     (`showDesignPanel` / `hideDesignPanel` / `toggleDesignPanel`). The
 *     namespace is a configured field — different consumers can pick
 *     distinct values to prove the contract is host-agnostic.
 *  3. Gate the panel module's dynamic import on the same probes the Astro
 *     adapter uses: an existing `wasVisible()` flag or any persisted v2
 *     overrides. When neither is set, the panel module stays out of the
 *     initial bundle and only loads when the user calls a `window.<ns>.*`
 *     helper from the console.
 *  4. After the dynamic import resolves, call `reapplyPersistedOverrides()`
 *     so the panel applies persisted overrides ASAP (kills the FOUT on
 *     hard navigation when the user has tweaks saved).
 *
 * StrictMode safety
 * -----------------
 * React 18 StrictMode (enabled in `src/main.tsx`, the new-Vite default)
 * deliberately invokes mount effects twice in development to surface
 * cleanup-bug regressions. The `mountPanel` export is therefore called
 * twice on the first render in dev. We pin a per-`storagePrefix` flag on
 * `window.__zudoDesignTokenPanelAdapter` (same map shape the package's
 * Astro adapter uses) so the lazy-load probes only fire once. The console
 * API re-installation is idempotent — re-assigning the same closures is
 * semantically a no-op — so leaving it ungated is fine.
 *
 * Storage-key formatters
 * ----------------------
 * `storageKey_visible(prefix)` and `storageKey_stateV2(prefix)` are not
 * publicly exported by the package's main entry (they live in
 * `src/config/panel-config.ts`). The formatters are trivial 1-line string
 * concatenations, so we replicate them here. The canonical definitions in
 * the package source MUST match these exactly:
 *
 *   storageKey_visible(cfg) -> `${cfg.storagePrefix}:visible`   (literal `:`)
 *   storageKey_stateV2(cfg) -> `${cfg.storagePrefix}-state-v2`  (literal `-`)
 *
 * Note the asymmetry: the visible-key uses `:` while every other derived
 * key uses `-`. It is a historical artifact preserved for storage-key
 * continuity — see the comment on `storageKey_visible` in the package.
 */

import type { PanelConfig } from '@takazudo/zudo-design-token-panel';
import { panelConfig } from '../config/panel-config';

// Mirrors the panel-module's main entry shape we lazy-import below.
type DesignTokenPanelModule = typeof import('@takazudo/zudo-design-token-panel');

interface DesignTokenPanelAdapterState {
  /** Per-`storagePrefix` bind flag — re-runs of mountPanel are no-ops. */
  bound: boolean;
  /** Memoised module promise so steady-state toggle/show/hide share one load. */
  modulePromise: Promise<DesignTokenPanelModule> | null;
}

interface ConsoleApiSurface {
  showDesignPanel?: () => Promise<void>;
  hideDesignPanel?: () => Promise<void>;
  toggleDesignPanel?: () => Promise<void>;
  // Allow co-existence with other helpers a host may install on the same
  // namespace (e.g. `window.<ns>.someOtherDebugHelper()`).
  [extra: string]: unknown;
}

type AdapterStateMap = Record<string, DesignTokenPanelAdapterState>;

interface AdapterWindow extends Window {
  __zudoDesignTokenPanelAdapter?: AdapterStateMap;
  // Index access for the configured console namespace.
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

/**
 * Lazily import the panel module. First call runs the panel module's
 * top-level bootstrap (which binds its own toggle/window listeners and
 * re-applies persisted state). Subsequent calls return the same promise.
 *
 * After the import resolves, call `reapplyPersistedOverrides()` so the
 * panel applies persisted overrides ASAP (matches the eager-reapply path
 * the Astro adapter triggers via the package's main-entry side effects).
 */
async function loadPanelModule(state: DesignTokenPanelAdapterState) {
  if (state.modulePromise === null) {
    state.modulePromise = import('@takazudo/zudo-design-token-panel').then((mod) => {
      try {
        mod.reapplyPersistedOverrides();
      } catch (err) {
        // Defensive: never let a bad persist-state read kill the panel
        // surface. The panel will still mount with stylesheet defaults.
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

/**
 * Bind the host adapter for the active panel config. Safe to call multiple
 * times — the per-`storagePrefix` `bound` flag short-circuits repeat calls,
 * which is exactly what React 18 StrictMode requires (mount effects run
 * twice in dev). Returns nothing; the cleanup function from the calling
 * `useEffect` should also be a no-op.
 *
 * Reads the active config from the same module that `src/main.tsx` already
 * passed to `configurePanel(...)`, so the adapter and the panel module
 * agree on storagePrefix / consoleNamespace / etc. without re-deriving them
 * from a global accessor.
 */
export function mountPanel(): void {
  if (typeof window === 'undefined') return;

  const cfg = panelConfig;
  const win = window as unknown as AdapterWindow;
  const state = getAdapterState(win, cfg.storagePrefix);

  // Install console API every time — `bound` only gates the lazy-load
  // probes, since the console handlers are idempotent (re-assigning the
  // same closures is a no-op semantically).
  installConsoleApi(win, cfg.consoleNamespace, state);

  if (state.bound) return;
  state.bound = true;

  // Lazy-load gate — eagerly load the panel module when the user had it
  // open last session OR has persisted token overrides. Either signal
  // means the panel must boot before first paint to avoid an FOUT.
  const visibleKey = storageKey_visible(cfg);
  const stateV2Key = storageKey_stateV2(cfg);
  if (wasVisible(visibleKey) || hasPersistedOverrides(stateV2Key)) {
    void loadPanelModule(state);
  }
}
