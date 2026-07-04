/**
 * Design-token panel adapter.
 *
 * Thin bridge between the package's Astro host adapter
 * (`./astro/host-adapter.ts`) and the Preact panel component
 * (`./panel.tsx`). Responsibilities:
 *
 *  1. Expose the public API consumed by the host adapter —
 *     `showDesignTokenPanel`, `hideDesignTokenPanel`, `toggleDesignPanel`.
 *  2. Own the Preact mount lifecycle into the panel root element (id derived
 *     from `panelConfig.storagePrefix`; default: `#zudo-design-token-panel-root`).
 *  3. Cooperate with `panel.tsx`'s own toggle listeners: the adapter handles
 *     the *initial* toggle (to mount the shell lazily) and then lets
 *     `panel.tsx` own steady-state toggling via its internal window listener.
 *  4. Handle Astro view-transition lifecycle — unmount before swap and
 *     re-materialise the shell on `astro:page-load` when either the panel was
 *     previously visible or token overrides are persisted.
 *
 * Storage keys (all derived from `panelConfig` — see `config/panel-config.ts`):
 *
 *  - `${storagePrefix}:visible` (default: `zudo-design-token-panel:visible`)
 *    — adapter's visibility intent flag. Owned here (adapter-level concept);
 *    no collision with the panel itself, so it keeps its historical colon-as-
 *    separator form (every other derived key uses `-`).
 *  - v2 storage key (imported via `getStorageKeyV2()` from `./state/tweak-state`)
 *    — existence probe for persisted token overrides. The actual key value
 *    is owned by `tweak-state.ts` (which also writes it). Routing the probe
 *    through the same accessor guarantees probe-key ≡ write-key.
 *  - `${storagePrefix}-open` (default: `zudo-design-token-panel-open`) —
 *    primarily owned by `panel.tsx` (its `useEffect` mirrors `open` into the
 *    key on every change). The adapter is read-only at steady state, but it
 *    *seeds* the key once before a fresh mount so `panel.tsx`'s mount-effect
 *    picks the desired open state on first paint instead of relying on a
 *    racy post-render toggle event.
 */

import { render } from 'preact';
import DesignTokenTweakPanel from './panel';
// Side-effect import: kept so `vite build` keeps co-emitting
// `dist/zdtp.css` and the `./styles` / `./styles.css`
// package exports stay valid for backward compatibility. Vite library mode
// strips this import from the emitted `dist/index.js`, so it does NOT load
// the CSS at runtime — runtime styling comes from the `?inline` import below.
import './styles/panel.css';
// `?inline` import: the same stylesheet as a JS string. Unlike the side-effect
// import above, an `?inline` import is NOT stripped by Vite library mode — it
// survives as a string constant in `dist/index.js`. `ensurePanelStyles()`
// injects it as a <style> element when the panel first mounts, so the package
// is visually self-contained and consumers need no separate CSS import.
import panelCss from './styles/panel.css?inline';
import {
  applyFullState,
  getActivePrimaryCluster,
  getOpenKey,
  getStorageKeyV2,
  getStorageKeyV3,
  loadPersistedState,
} from './state/tweak-state';
import {
  __setPanelLifecycleHooks,
  DEFAULT_TOGGLE_EVENT,
  getAllPanelConfigs,
  getPanelConfig,
  getPanelConfigByPrefix,
  openStateChangedEventName,
  panelRootId,
  registerPostConfigureHook,
  storageKey_visible,
  toggleEventName,
  type PanelConfig,
} from './config/panel-config';
import { loadElementPathEnabled, saveElementPathEnabled } from './element-path/element-path-state';
import {
  shouldAutoload as _shouldAutoload,
  setAutoload,
  clearAutoload,
} from './state/autoload-state';

// ---------------------------------------------------------------------------
// Public DOM contract (kept in sync with astro/host-adapter.ts)
// ---------------------------------------------------------------------------

/**
 * Root element id that hosts the Preact panel tree. Derived from
 * `cfg.storagePrefix` — pass the instance's config so a non-default panel
 * mounts into ITS own `${storagePrefix}-root`, not the default instance's.
 */
function getPanelId(cfg: PanelConfig): string {
  return panelRootId(cfg);
}

/** Adapter's visibility-intent flag. Derived from `cfg.storagePrefix` (colon separator). */
function getStorageKey(cfg: PanelConfig): string {
  return storageKey_visible(cfg);
}

/** Deprecated — kept so legacy callers still flip the default panel. */
const TOGGLE_EVENT_ALIAS = 'toggle-color-tweak-panel';

/**
 * Dispatch the instance's internal open-state sync event so a mounted
 * `panel.tsx` re-reads `localStorage[OPEN_KEY]` and updates its `open` state.
 * SSR-safe. The event name is per-instance (`openStateChangedEventName(cfg)`,
 * defined in `config/panel-config.ts`) so a change to panel A's open state only
 * pokes panel A's listener, never panel B's — the two share `window` but must
 * stay fully independent (issue #354).
 *
 * The toggle handler writes `localStorage[OPEN_KEY]` to the new desired value
 * first and then dispatches this event; the panel's listener just re-reads the
 * key. Single source of truth lives in `localStorage[OPEN_KEY]`; the event is
 * a "go re-read" pulse — no toggle arithmetic in the listener, so a missed
 * pulse during Preact's effect-flush rAF gap self-heals on the next render.
 */
function notifyPanelOpenChanged(cfg: PanelConfig): void {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent(openStateChangedEventName(cfg)));
}

// ---------------------------------------------------------------------------
// Storage helpers (SSR-safe, tolerant of private mode / quota errors)
// ---------------------------------------------------------------------------

function setStoredVisibility(cfg: PanelConfig, isVisible: boolean): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(getStorageKey(cfg), isVisible ? '1' : '0');
  } catch {
    /* ignore */
  }
}

function wasVisible(cfg: PanelConfig): boolean {
  if (typeof window === 'undefined') return false;
  try {
    return window.localStorage.getItem(getStorageKey(cfg)) === '1';
  } catch {
    return false;
  }
}

function hasPersistedOverrides(cfg: PanelConfig): boolean {
  if (typeof window === 'undefined') return false;
  try {
    // Check v3 key first; fall back to v2 for sessions that have not yet
    // migrated (migration runs on first loadPersistedState call, i.e. once
    // the panel mounts — before mount we may only see the v2 key).
    const ls = window.localStorage;
    return ls.getItem(getStorageKeyV3(cfg)) !== null || ls.getItem(getStorageKeyV2(cfg)) !== null;
  } catch {
    return false;
  }
}

/**
 * Read-only probe of the panel's own open state. We only read it so
 * `showDesignTokenPanel` / `hideDesignTokenPanel` can avoid firing a toggle
 * event when the panel is already in the requested state.
 *
 * `OPEN_KEY` is owned by `panel.tsx` for steady-state writes (its
 * `useEffect` mirrors `open` into the key on every change). The adapter
 * additionally seeds the key once before a fresh mount via
 * `seedOpenStateBeforeMount` — see the seed function's docstring for the
 * timing rationale.
 */
function isPanelCurrentlyOpen(cfg: PanelConfig): boolean {
  if (typeof window === 'undefined') return false;
  try {
    return window.localStorage.getItem(getOpenKey(cfg)) === '1';
  } catch {
    return false;
  }
}

/**
 * Pre-mount seed for `OPEN_KEY`.
 *
 * On a fresh mount the adapter wants to drive the panel into the user's last
 * known state. The historical strategy was to render first, then dispatch a
 * `toggle-design-token-panel` event from a `queueMicrotask`. That broke when
 * the visibility flag was set without `OPEN_KEY` being set (the canonical
 * repro: user types `localStorage.setItem(<visible-key>, '1')` and hard-
 * reloads, where `<visible-key>` derives from `panelConfig.storagePrefix` —
 * default `zudo-design-token-panel:visible`): `panel.tsx` registers its
 * toggle listener inside a `useEffect`, which Preact flushes on a
 * `requestAnimationFrame` (or its `setTimeout(35)` polyfill — see preact/hooks
 * `w`). A microtask drains long before that frame, so the dispatched event
 * lands in the void and the panel never opens. Symptoms:
 * `window.<consoleNamespace>.showDesignPanel()` had to be called manually
 * after every reload despite `wasVisible()` already being true.
 *
 * The fix is to seed `OPEN_KEY` synchronously before the Preact render. The
 * panel's `useEffect` then reads the correct value during its mount pass and
 * sets `open=true` directly, skipping the dispatch race entirely. Steady-state
 * toggles still use the event channel — by then the listener is attached and
 * the existing `panel.tsx`-owned write keeps `OPEN_KEY` and `open` in lockstep.
 *
 * Keep this in lockstep with `OPEN_KEY` reads in `panel.tsx` (the first
 * `useEffect` in `DesignTokenTweakPanel`).
 */
function seedOpenStateBeforeMount(cfg: PanelConfig, desiredOpen: boolean): void {
  if (typeof window === 'undefined') return;
  try {
    const openKey = getOpenKey(cfg);
    if (desiredOpen) window.localStorage.setItem(openKey, '1');
    else window.localStorage.removeItem(openKey);
  } catch {
    /* ignore */
  }
}

// ---------------------------------------------------------------------------
// Mount / unmount
// ---------------------------------------------------------------------------

function findRoot(cfg: PanelConfig): HTMLElement | null {
  if (typeof document === 'undefined') return null;
  return document.getElementById(getPanelId(cfg));
}

// Stable id for the injected <style> element so injection is idempotent
// across re-mounts (astro:page-load re-materialises the shell) and across
// multiple panel instances on one page (they share one storagePrefix-keyed
// stylesheet — the chrome CSS is identical regardless of config).
const PANEL_STYLE_ELEMENT_ID = 'zudo-design-token-panel-styles';

/**
 * Inject the panel's bundled stylesheet into `document.head` once.
 *
 * Called from `ensureMounted()` so the CSS loads exactly when the panel first
 * opens — never on pages where the panel is never opened. The package is thus
 * visually self-contained: consumers do not need to import `./styles`
 * themselves (that export remains valid but is now optional).
 */
function ensurePanelStyles(): void {
  if (typeof document === 'undefined') return;
  if (document.getElementById(PANEL_STYLE_ELEMENT_ID)) return;
  const style = document.createElement('style');
  style.id = PANEL_STYLE_ELEMENT_ID;
  style.textContent = panelCss;
  document.head.appendChild(style);
}

/**
 * Idempotently mount the Preact shell. Returns `true` only on a fresh mount.
 *
 * Callers that need the panel in a specific open state on a fresh mount must
 * call `seedOpenStateBeforeMount(...)` *before* this function — the panel's
 * mount-effect reads `OPEN_KEY` synchronously, so the seed has to be visible
 * by then.
 */
function ensureMounted(cfg: PanelConfig): boolean {
  if (typeof document === 'undefined') return false;
  // Bind this instance's toggle-event listener at its materialization point so
  // that, after the first programmatic interaction (handle.open/toggle, show/
  // hide), a host-dispatched `toggle-${storagePrefix}` window event keeps
  // flipping the SAME instance. Idempotent per prefix. The default instance is
  // additionally bound eagerly at module init.
  bindInstance(cfg);
  const panelId = getPanelId(cfg);
  if (document.getElementById(panelId)) return false;
  ensurePanelStyles();
  const root = document.createElement('div');
  root.id = panelId;
  document.body.appendChild(root);
  // Pass the instance's OWN config so the panel reads ITS own open/visible
  // keys, subscribes to ITS own per-instance sync event, and renders ITS own
  // tabs — two panels on one page stay fully independent (issue #354). `cfg`
  // is the registered per-instance config (via `configForInstance`).
  render(<DesignTokenTweakPanel instanceConfig={cfg} />, root);
  return true;
}

/**
 * Full Preact unmount + DOM-root removal for ONE instance. Drives the panel's
 * `useEffect` cleanups (so its window/document listeners detach) before
 * detaching the root, so a destroyed instance leaks nothing. No-op when the
 * instance is not mounted.
 */
function unmountInstance(cfg: PanelConfig): void {
  const root = findRoot(cfg);
  if (!root) return;
  render(null, root);
  root.remove();
}

// NOTE: `dispatchToggle()` was removed in favour of `notifyPanelOpenChanged()`.
// The public API used to bounce its intent through the same window event the
// header button uses, relying on `panel.tsx`'s in-component listener to flip
// the state. That coupled the API to the panel's effect-flush timing and was
// the structural source of the "click twice after close" regression. The
// public API now writes `localStorage[OPEN_KEY]` directly and dispatches the
// internal sync event so the panel just re-reads — no toggle arithmetic in
// the listener, no race with effect attach.

// ---------------------------------------------------------------------------
// Public API (consumed by astro/host-adapter.ts)
// ---------------------------------------------------------------------------

// Re-exports for non-Astro consumers documented in README §4. The Astro
// adapter calls configurePanel internally, but a Vite-only host needs to
// reach it from the package root per PORTABLE-CONTRACT.md §1.
export { configurePanel, setPanelColorPresets } from './config/panel-config';
export type { PanelConfig, PanelInstanceHandle, ApplySink } from './config/panel-config';

/**
 * Internal-test-only accessor that returns this panel-module bundle's view of
 * the active panel config singleton. Paired with the Astro host adapter's
 * `loadPanelModule()` runtime guard: the adapter
 * compares the reference returned here against its own `getPanelConfig()`
 * result. They MUST be the same object — Vite's multi-entry build code-
 * splits the shared `config/panel-config` module into one chunk so both
 * surfaces observe one and the same singleton. A reference mismatch indicates
 * a future packaging refactor split the singleton across two chunks; the
 * adapter `console.warn`s loudly so the regression is caught in dev.
 *
 * Prefixed `__` to make it clear this is internal/test surface, not a
 * documented public API.
 */
export function __panelConfigForTest(): PanelConfig {
  return getPanelConfig();
}
// Public-facing alias for the cluster shape carried on `PanelConfig.colorCluster`.
// The runtime type is `ColorClusterDataConfig` (defined in
// `./config/cluster-config.ts`); the same shape is documented under the
// historical `ColorClusterConfig` name. Surfacing the alias from the
// package root means a host can write
// `import type { ColorClusterConfig } from '@takazudo/zdtp'`
// instead of digging into an internal sub-path.
export type { ColorClusterConfig } from './state/tweak-state';
// Opt-in legacy zdtp-internal typography rename map. Hosts that depended on
// the historical built-in rename (text-caption → text-xs, …) can pass this
// constant via `PanelConfig.legacyIdRenameMap` to keep the old behaviour;
// the default `loadPersistedState` path now applies an empty rename map so
// hosts whose manifest ids are stable are not corrupted (issue #51).
export { ZDTP_LEGACY_TYPOGRAPHY_RENAME_MAP } from './state/tweak-state';
// Re-exported so hosts can type the entries of their optional
// `PanelConfig.colorPresets` map without reaching for an internal sub-path.
export type { ColorScheme, ColorRef } from './config/color-schemes';
// Re-export the `TokenManifest` shape so consumers can type their
// host-supplied `panelConfig.tokens` field.
export type { TokenManifest, TokenDef } from './tokens/manifest';
// Re-export the abstract tier-model types so consumers can build host-supplied
// TabConfig trees without reaching into the package internals.
export type {
  TierValueKind,
  PillSpec,
  TierItem,
  TierConfig,
  TabConfig,
  ColorClusterExtras,
} from './tokens/tier-model';
export {
  isLengthKind,
  isNumberKind,
  isSelectKind,
  isTextKind,
  isColorKind,
  isCursorKind,
  isContentKind,
  isMaskImageKind,
} from './tokens/tier-model';
// Re-export the unified `TweakState` envelope and the `emptyOverrides()`
// factory so external SerDe / persistence layers (e.g. zudo-doc's
// `design-token-serde.ts`) can construct and type a fully-populated
// `TweakState` without reaching into the package's internals or the
// test-only `./testing` sub-export. Type-only export of `TweakState`
// avoids isolatedModules surprises; `emptyOverrides` is a runtime value.
export type { TweakState } from './state/tweak-state';
export { emptyOverrides } from './state/tweak-state';

/**
 * Show ONE instance's panel. Internal per-instance core shared by the public
 * default-instance API (`showDesignTokenPanel`) and the per-instance handle's
 * `open()`. Every storage read/write and the sync-event dispatch are keyed by
 * `cfg.storagePrefix`, so distinct instances stay independent.
 */
function showInstance(cfg: PanelConfig): void {
  if (typeof window === 'undefined') return;
  const isFreshMount = !findRoot(cfg);
  // Write OPEN_KEY synchronously so both the fresh-mount path (panel reads on
  // mount) and the steady-state path (panel reads on sync event) see the
  // same authoritative value.
  seedOpenStateBeforeMount(cfg, true);
  ensureMounted(cfg);
  setStoredVisibility(cfg, true);
  // Auto-remember: any action that shows the panel arms the owner-autoload flag
  // so subsequent page loads reload it automatically (contract from autoload-state.ts).
  setAutoload(cfg, true);
  // Fresh mount: panel.tsx's mount-effect picks up OPEN_KEY="1" and renders
  // open — no listener race because the listener doesn't run yet anyway.
  if (isFreshMount) return;
  // Steady state: always notify the mounted panel to re-read OPEN_KEY.
  // `seedOpenStateBeforeMount(cfg, true)` already wrote OPEN_KEY='1' above, so a
  // post-seed `isPanelCurrentlyOpen()` probe would *always* read "open" — it
  // cannot distinguish "already open" from "just re-shown after a hide". The
  // notify must therefore be unconditional (mirrors `hideInstance`).
  // The sync event is idempotent: if the panel is genuinely already open the
  // panel's `setOpen(true)` is a no-op via Preact's setState identity check.
  notifyPanelOpenChanged(cfg);
}

/** Hide ONE instance's panel. See `showInstance` for the per-instance keying. */
function hideInstance(cfg: PanelConfig): void {
  if (typeof window === 'undefined') return;
  const isFreshMount = !findRoot(cfg);
  seedOpenStateBeforeMount(cfg, false);
  ensureMounted(cfg);
  setStoredVisibility(cfg, false);
  if (isFreshMount) return;
  // After the seed, isPanelCurrentlyOpen() returns false. We don't have the
  // pre-seed value here, so just always notify — the sync event is idempotent
  // (panel re-reads OPEN_KEY and calls setOpen(false); if already false, no
  // re-render thanks to Preact's identity check on setState).
  notifyPanelOpenChanged(cfg);
}

/** Toggle ONE instance's panel. See `showInstance` for the per-instance keying. */
function toggleInstance(cfg: PanelConfig): void {
  if (typeof window === 'undefined') return;
  const isFreshMount = !findRoot(cfg);
  // When the panel root is absent (fresh mount, or SPA-nav zombie state where
  // `unmountForSwap` removed the root but left `OPEN_KEY='1'` behind), the
  // user's intent on this toggle is unambiguously "open" — deriving direction
  // from a possibly-stale `OPEN_KEY` would mount the panel CLOSED and require
  // a second click. Mirrors handleExternalToggleEvent's fresh-mount guard.
  // Snapshot intent *before* the seed flips `OPEN_KEY`.
  const willBeOpen = isFreshMount ? true : !isPanelCurrentlyOpen(cfg);
  seedOpenStateBeforeMount(cfg, willBeOpen);
  ensureMounted(cfg);
  setStoredVisibility(cfg, willBeOpen);
  // Auto-remember: opening via toggle arms autoload so the panel reloads on
  // the next page visit (contract from autoload-state.ts).
  if (willBeOpen) setAutoload(cfg, true);
  // Fresh mount: seed already drove the mount-effect to the desired state.
  if (isFreshMount) return;
  notifyPanelOpenChanged(cfg);
}

export function showDesignTokenPanel(): void {
  showInstance(getPanelConfig());
}

export function hideDesignTokenPanel(): void {
  hideInstance(getPanelConfig());
}

export function toggleDesignPanel(): void {
  toggleInstance(getPanelConfig());
}

/**
 * Arm the owner-autoload flag for a panel instance (defaults to the active
 * default instance).
 *
 * For non-Astro hosts (e.g. the doc site bootstrapped via `@takazudo/zudo-doc`)
 * that cannot use the Astro console adapter (S2); the adapter also delegates its
 * per-namespace `enableAutoload` here with the captured `cfg` so it targets the
 * right instance on multi-instance pages. Mirrors the S2 contract from
 * `autoload-state.ts §enableAutoload()`:
 *   1. Sets `:autoload = '1'`.
 *   2. Sets `-elpath-enabled = '1'` to arm the alt+click inspector.
 *   3. Mounts the Preact shell CLOSED (element-path inspector activates without
 *      opening the panel UI).
 */
export function enableAutoload(cfg: PanelConfig = getPanelConfig()): void {
  setAutoload(cfg, true);
  saveElementPathEnabled(true, cfg);
  hideInstance(cfg);
}

/**
 * Disarm the owner-autoload flag for a panel instance (defaults to the active
 * default instance) and fully tear down the owner-mode state.
 *
 * The Astro host adapter delegates its per-namespace `disableAutoload` here with
 * the captured `cfg`, so the live Alt+click inspector is unmounted immediately
 * (not merely closed) and the right instance is targeted on multi-instance
 * pages. Mirrors the S2 contract from `autoload-state.ts §disableAutoload()`:
 *   1. Clears `:autoload`.
 *   2. Clears `:visible` (sets to `'0'`).
 *   3. Clears `-elpath-enabled` (sets to `'0'`).
 *   4. Removes the open-state key so the next mount starts closed.
 *   5. Unmounts the Preact shell (drives effect cleanups, removes root).
 */
export function disableAutoload(cfg: PanelConfig = getPanelConfig()): void {
  clearAutoload(cfg);
  setStoredVisibility(cfg, false);
  saveElementPathEnabled(false, cfg);
  seedOpenStateBeforeMount(cfg, false);
  unmountInstance(cfg);
}

/**
 * Return `true` iff the default panel instance has the owner-autoload flag set.
 * Thin wrapper over `shouldAutoload(cfg)` from `./state/autoload-state` that
 * reads the default instance's config so non-Astro hosts do not need to import
 * from the internal sub-path.
 */
export function shouldAutoload(): boolean {
  return _shouldAutoload(getPanelConfig());
}

/** Test-only: invoke `reapplyFromStorage` with the current active config. */
export function __reapplyFromStorageForTests(): void {
  reapplyFromStorage();
}

/**
 * Apply persisted token overrides directly to `:root` BEFORE any Preact
 * render. Called at adapter module init (and again on every `astro:page-load`)
 * so the bundle's arrival is enough to kill the FOUT on hard navigation; the
 * Preact shell still mounts separately when visibility intent requires it via
 * `reapplyFromStorage()`.
 *
 * No-op when nothing is persisted. Swallows errors — missing storage or
 * corrupt state should never block the UI thread (stylesheet defaults paint
 * instead, same as before this helper existed).
 */
export function reapplyPersistedOverrides(): void {
  if (typeof window === 'undefined') return;
  // Loop ALL registered instances: a hidden instance's persisted overrides are
  // only ever applied here — the panel's own apply effect is gated on `open`,
  // so a default-only reapply silently drops every other instance's CSS vars
  // (and sink writes) after a lifecycle page load. Bootstrap fallback mirrors
  // unmountForSwap/reapplyFromStorage.
  const cfgs = getAllPanelConfigs();
  const targets = cfgs.length > 0 ? cfgs : [getPanelConfig()];
  for (const cfg of targets) {
    try {
      const persisted = loadPersistedState(
        undefined,
        undefined,
        getActivePrimaryCluster(cfg),
        cfg,
      );
      if (persisted) applyFullState(persisted, cfg);
    } catch {
      /* ignore — stylesheet defaults paint instead */
    }
  }
}

// ---------------------------------------------------------------------------
// Astro lifecycle wiring
// ---------------------------------------------------------------------------

/**
 * Full Preact unmount before Astro's `ClientRouter` swaps `<body>`.
 *
 * Without this, the body swap orphans the Preact tree — its `useEffect`
 * cleanups never fire, so each navigation leaks `window`/`document`
 * listeners and leaves a tree whose `setState` calls no longer touch any
 * live DOM. `render(null, root)` drives a proper unmount (cleanups run),
 * then the root itself is detached so `astro:page-load` can start clean.
 *
 * Visibility intent must survive the unmount: snapshot `wasVisible()`
 * beforehand and restore it afterward so the post-swap remount decision
 * reflects the user's last state, not an artefact of the unmount path.
 */
function unmountForSwap(): void {
  // Loop ALL registered instances so non-default panels are also properly
  // unmounted via render(null) — this drives their useEffect cleanups, which
  // removes their per-instance window/document listeners (open-state sync,
  // color-scheme-changed, resize, keydown ESC). Without this, Astro's body
  // swap orphans non-default roots and each soft navigation leaks another set
  // of listeners for every non-default panel.
  //
  // Fall back to [getPanelConfig()] when no instance is configured yet — the
  // pre-configure bootstrap path where the module imported but configurePanel
  // has not fired (the default instance is bound eagerly at module init).
  const cfgs = getAllPanelConfigs();
  const targets = cfgs.length > 0 ? cfgs : [getPanelConfig()];
  for (const cfg of targets) {
    const root = findRoot(cfg);
    if (!root) continue;
    const shouldRestore = wasVisible(cfg);
    render(null, root);
    root.remove();
    if (shouldRestore) setStoredVisibility(cfg, true);
  }
}

/**
 * Re-materialise the shell on a page load when either (a) the user had the
 * panel visible before navigation, (b) overrides are persisted and need
 * reapplying even while the panel stays hidden, or (c) the Element Path Copy
 * inspector is enabled — its Alt+click "copy selector" gesture must work even
 * when the panel is closed, and the inspector overlay only runs while the
 * Preact shell (and its ElementPathOrchestrator) is mounted. Cases (b) and (c)
 * mount the shell CLOSED via `hideInstance`.
 *
 * Overrides are applied to `:root` first (cheap, no Preact render) so the
 * post-swap paint uses the persisted values immediately instead of waiting
 * for the shell's mount-effect to fire. This kills the FOUT on soft-nav the
 * same way the adapter's module-init path kills it on hard-nav.
 */
function reapplyFromStorage(): void {
  // Apply persisted token overrides to :root for every registered instance
  // first (kills the FOUT on soft-nav before any Preact render).
  reapplyPersistedOverrides();
  // Loop ALL registered instances so non-default panels are also re-materialised
  // after an Astro body swap. Without this, only the default instance mounts /
  // shows; every other instance silently vanishes after soft navigation and
  // requires the user to re-toggle it manually.
  //
  // Fall back to [getPanelConfig()] when no instance is configured yet — the
  // pre-configure bootstrap path (mirrors the fallback in unmountForSwap).
  const cfgs = getAllPanelConfigs();
  const targets = cfgs.length > 0 ? cfgs : [getPanelConfig()];
  for (const cfg of targets) {
    if (wasVisible(cfg)) {
      showInstance(cfg);
    } else if (hasPersistedOverrides(cfg) || loadElementPathEnabled(cfg) || _shouldAutoload(cfg)) {
      // Gate #2 — per autoload-state.ts contract: owner-mode page loads mount
      // the Preact shell CLOSED so the element-path inspector is available even
      // while the panel UI is hidden.
      hideInstance(cfg);
    }
  }
}

/**
 * Authoritative handler for the public `toggle-design-token-panel` /
 * `toggle-color-tweak-panel` window events.
 *
 * Owns the full toggle pipeline:
 *
 *   1. Compute the new open state by flipping `localStorage[OPEN_KEY]`.
 *   2. Ensure the Preact shell is mounted (idempotent — no-op when already
 *      mounted, performs the mount + initial render otherwise).
 *   3. Dispatch the internal `__zdtp:open-state-changed` sync event so a
 *      mounted `panel.tsx` re-reads `OPEN_KEY` and updates `open`.
 *
 * Why this matters (the "click twice after close" regression):
 *
 *   The previous design had this handler short-circuit when the panel root
 *   div already existed, leaving steady-state toggling entirely to the
 *   in-component `useEffect`-installed listener inside `panel.tsx`. That
 *   created two implicit requirements that the runtime could not guarantee
 *   together:
 *
 *     - The in-component listener must be attached. Preact flushes
 *       `useEffect` on `requestAnimationFrame`, so for one paint frame
 *       after mount the component has no listener — a click in that
 *       window only reaches the module-scope handler, which short-
 *       circuited. The click was silently dropped.
 *     - The in-component listener must not be subsequently detached.
 *       In hosts that wrap the panel in deferred Islands / shims /
 *       bridges, the wrapper layer can re-evaluate or re-mount the bridge
 *       in ways that leave the in-component listener half-installed.
 *
 *   By making the module-scope handler write `OPEN_KEY` itself and notify
 *   the panel via a separate internal event, both requirements collapse
 *   into one: `localStorage[OPEN_KEY]` is the only place that holds open
 *   state, and the panel listens for a "go re-read" pulse rather than
 *   computing the toggle from its own React state. The panel's listener
 *   can still miss the pulse during the rAF gap, but the persisted state
 *   is already correct — so the very next render reads the right value
 *   from the mount-effect path (line 170 in `panel.tsx`).
 */
function handleExternalToggleEvent(cfg: PanelConfig): void {
  const isFreshMount = !findRoot(cfg);
  // When the panel root is absent (fresh mount, or SPA-nav zombie state where
  // `unmountForSwap` removed the root but left `OPEN_KEY='1'` behind), the
  // user's intent on this toggle event is unambiguously "open" — deriving
  // direction from a possibly-stale `OPEN_KEY` would mount the panel CLOSED
  // and require a second click. See zudolab/zudo-doc#1633 / #1640 / #1631.
  const willBeOpen = isFreshMount ? true : !isPanelCurrentlyOpen(cfg);
  seedOpenStateBeforeMount(cfg, willBeOpen);
  ensureMounted(cfg);
  // Auto-remember: the header button / window event opens the panel → arm
  // autoload so the panel reloads automatically on the next page visit
  // (contract from autoload-state.ts).
  if (willBeOpen) setAutoload(cfg, true);
  // Fresh mount: the seed has already driven the mount-effect to the desired
  // state; no in-component listener exists to notify yet. The sync event
  // would harmlessly land in the void.
  if (isFreshMount) return;
  notifyPanelOpenChanged(cfg);
}

// ---------------------------------------------------------------------------
// Per-instance event/lifecycle bindings (#354)
//
// Each configured panel instance owns ITS OWN window-event wiring: a toggle-
// event listener (keyed by `toggleEventName(cfg)`) and — for the default
// instance only — the deprecated `toggle-color-tweak-panel` alias. Two panels
// with distinct `storagePrefix`es therefore bind and tear down fully
// independently; `destroy()` on one removes only that one's listeners + root.
//
// This is a SEPARATE concern from the framework-agnostic lifecycle adapter
// below (`setLifecycleAdapter`): that adapter is a single, document-level
// page-swap channel for the default (single-panel) astro flow, whereas these
// bindings are per-instance window-event channels. Keeping them in distinct
// registries lets two panels coexist without either one's bind/teardown
// touching the other's listeners or the shared astro adapter.
// ---------------------------------------------------------------------------

/** One instance's active window-event bindings. */
interface InstanceBindingRecord {
  /** Listener removers — drained on `unbindInstance`. */
  cleanups: Array<() => void>;
}

/**
 * A toggle Event annotated with the set of instance prefixes already driven in
 * THIS dispatch. The DOM delivers one shared Event object to every listener of
 * a given name, so listeners that resolve to the same instance can coordinate
 * through it (see `bindInstance`'s dedupe).
 */
type DedupableToggleEvent = Event & { __zdtpToggledPrefixes?: Set<string> };

type InstanceBindingsWindow = Window & {
  __zudoDesignTokenPanelInstanceBindings?: Map<string, InstanceBindingRecord>;
};

function getInstanceBindings(): Map<string, InstanceBindingRecord> {
  const w = window as InstanceBindingsWindow;
  if (w.__zudoDesignTokenPanelInstanceBindings) return w.__zudoDesignTokenPanelInstanceBindings;
  const map = new Map<string, InstanceBindingRecord>();
  w.__zudoDesignTokenPanelInstanceBindings = map;
  return map;
}

/**
 * Resolve the config a toggle-event handler should drive, re-read at DISPATCH
 * time rather than captured at bind time.
 *
 * Fixes #370. The default instance's listener is bound eagerly at module init
 * with `DEFAULT_PANEL_CONFIG` (empty `tabs`), BEFORE the host calls
 * `configurePanel()`. The post-configure `bindInstance` re-call no-ops for an
 * already-bound prefix, so a handler that closed over the bind-time config would
 * mount an empty-bodied panel forever. Re-reading by prefix picks up the real
 * config the host registered after import. Two facets, both producing the
 * "toolbar mounts, body empty" symptom:
 *
 *  1. Default-`storagePrefix` host: `getPanelConfigByPrefix(prefix)` returns the
 *     host's now-registered config (real tabs) instead of the stale empty one.
 *  2. Custom-`storagePrefix`-only host dispatching the historical reserved
 *     `toggle-design-token-panel`: no default-prefix instance is registered, so
 *     the by-prefix lookup misses. For the reserved default event we then fall
 *     back to the active (most-recently-configured) instance so the host's real
 *     panel opens instead of the empty default. A genuine multi-instance page
 *     that DOES register a default-prefix instance keeps the reserved event on
 *     that instance (the by-prefix lookup hits first).
 *
 * When nothing is configured yet (`getPanelConfigByPrefix` misses and the active
 * config is still the default), this returns `fallback` (= the bind-time config,
 * i.e. `DEFAULT_PANEL_CONFIG`), preserving the pre-configure bootstrap path.
 */
function resolveLiveInstanceConfig(
  prefix: string,
  isDefaultEvent: boolean,
  fallback: PanelConfig,
): PanelConfig {
  const registered = getPanelConfigByPrefix(prefix);
  if (registered) return registered;
  if (isDefaultEvent) {
    const active = getPanelConfig();
    if (active.storagePrefix !== prefix) return active;
  }
  return fallback;
}

/**
 * Idempotently bind ONE instance's toggle-event listener(s). Keyed by
 * `cfg.storagePrefix` — a second call for an already-bound prefix is a no-op,
 * so re-running the post-configure hook (Astro view-transition reruns) never
 * stacks duplicate listeners.
 *
 * The handler re-resolves the live instance config by prefix at DISPATCH time
 * (see `resolveLiveInstanceConfig`) so it always operates on the right storage
 * keys / root / sync event / tabs — even though the default instance is bound
 * eagerly at module init, before the host's `configurePanel()` supplies the real
 * config (#370).
 */
function bindInstance(cfg: PanelConfig): void {
  if (typeof window === 'undefined') return;
  const bindings = getInstanceBindings();
  if (bindings.has(cfg.storagePrefix)) return;

  const prefix = cfg.storagePrefix;
  const toggleEvent = toggleEventName(cfg);
  const isDefaultEvent = toggleEvent === DEFAULT_TOGGLE_EVENT;
  const handler = (event: Event): void => {
    const target = resolveLiveInstanceConfig(prefix, isDefaultEvent, cfg);
    // A single dispatch can reach multiple listeners on the same event name —
    // the eagerly-bound default listener AND a custom instance that opted into
    // the reserved name via `config.toggleEvent`. With the dispatch-time
    // fallback both can resolve to the SAME instance, which would toggle it
    // twice (open, then immediately close) in one dispatch (#370). Dedupe by the
    // resolved instance id, carried on the shared Event object.
    const ev = event as DedupableToggleEvent;
    const seen = ev.__zdtpToggledPrefixes ?? new Set<string>();
    if (seen.has(target.storagePrefix)) return;
    seen.add(target.storagePrefix);
    ev.__zdtpToggledPrefixes = seen;
    handleExternalToggleEvent(target);
  };
  window.addEventListener(toggleEvent, handler);
  const cleanups: Array<() => void> = [() => window.removeEventListener(toggleEvent, handler)];

  // The deprecated alias only ever flipped the default single-panel instance;
  // binding it for every instance would let one panel's legacy event leak into
  // another. Scope it to the default instance only.
  if (isDefaultEvent) {
    window.addEventListener(TOGGLE_EVENT_ALIAS, handler);
    cleanups.push(() => window.removeEventListener(TOGGLE_EVENT_ALIAS, handler));
  }

  bindings.set(prefix, { cleanups });
}

/** Remove ONE instance's toggle-event listener(s). No-op when not bound. */
function unbindInstance(instanceId: string): void {
  if (typeof window === 'undefined') return;
  const bindings = getInstanceBindings();
  const record = bindings.get(instanceId);
  if (!record) return;
  for (const fn of record.cleanups) {
    try {
      fn();
    } catch {
      /* a listener-removal that throws should not abort the teardown */
    }
  }
  bindings.delete(instanceId);
}

/**
 * Test-only: drain EVERY instance's window-event listeners and clear the
 * bindings map. Unlike `delete window.__zudoDesignTokenPanelInstanceBindings`,
 * this actively removes the real `addEventListener` registrations — dropping
 * the map alone would orphan live listeners that then leak across tests (a
 * stale listener from a previous test re-mounts a panel on the next dispatch).
 *
 * Exported with the `__` internal prefix; not part of the public API.
 */
export function __resetInstanceBindingsForTests(): void {
  if (typeof window === 'undefined') return;
  const bindings = getInstanceBindings();
  for (const instanceId of [...bindings.keys()]) {
    unbindInstance(instanceId);
  }
}

// ---------------------------------------------------------------------------
// Z2 lifecycle-hook wiring: back the instance handle's open/close/toggle/
// destroy (from `configurePanel(...)`) with real per-instance behaviour. The
// handle methods receive an `instanceId` (=== storagePrefix); we look the
// instance's config up via `configForInstance` so every storage/event read is
// correctly keyed.
// ---------------------------------------------------------------------------

/**
 * Resolve the `PanelConfig` for a handle method / lifecycle hook given its
 * `instanceId`. Prefer the instance's OWN registered config so a non-default
 * panel uses its real tabs / schema / apply settings / custom `toggleEvent`,
 * not the active default instance's — distinct instances stay independent even
 * while another prefix is the active default.
 *
 * Fallback (synthesize from the active config, overriding only `storagePrefix`)
 * covers the default-instance-before-configure window: the eager module-init
 * bind runs with `DEFAULT_PANEL_CONFIG` before any `configurePanel`, so the
 * instance is not yet registered. Every derivation that fallback feeds is a
 * pure function of `storagePrefix`, so it is correct for that bootstrap case.
 */
function configForInstance(instanceId: string): PanelConfig {
  const registered = getPanelConfigByPrefix(instanceId);
  if (registered) return registered;
  const active = getPanelConfig();
  if (active.storagePrefix === instanceId) return active;
  return { ...active, storagePrefix: instanceId };
}

__setPanelLifecycleHooks({
  // Fires once per `configurePanel` (every instance, incl. the 2nd+). Bind the
  // instance's toggle-event channel now so a host-dispatched
  // `toggle-${storagePrefix}` window event works immediately, before any
  // handle method or mount.
  configured: (instanceId) => bindInstance(configForInstance(instanceId)),
  open: (instanceId) => showInstance(configForInstance(instanceId)),
  close: (instanceId) => hideInstance(configForInstance(instanceId)),
  toggle: (instanceId) => toggleInstance(configForInstance(instanceId)),
  destroy: (instanceId) => {
    // Remove ONLY this instance's listeners + root, and unmount its Preact
    // tree (so its effect cleanups fire). The registry-level deregistration is
    // handled by Z1's `handle.destroy()` AFTER this hook runs.
    const cfg = configForInstance(instanceId);
    unbindInstance(instanceId);
    unmountInstance(cfg);
  },
});

// ---------------------------------------------------------------------------
// Framework-agnostic lifecycle adapter (#50)
//
// Historically the module hard-coded `astro:before-swap` / `astro:page-load`
// document listeners — fine for Astro hosts, dead code everywhere else
// (zfb, vite, custom SSGs). To support soft-nav for non-Astro hosts without
// breaking existing Astro consumers, the lifecycle hooks now route through
// an internal "active bindings" registry:
//
//  - At import-time we install the astro fallback and capture its cleanup
//    fns (the registry's initial entries).
//  - `setLifecycleAdapter(adapter)` calls every captured cleanup fn (which
//    actively unbinds the astro listeners or any previously-registered
//    adapter), then re-binds the same internal handlers through the
//    adapter's `onBeforeSwap` / `onPageLoad`, capturing their returned
//    cleanup fns for the next swap.
//  - `setLifecycleAdapter(null)` clears the current adapter and re-installs
//    the astro fallback — useful for tests and re-init scenarios.
//
// The registered handlers are the existing `unmountForSwap` /
// `reapplyFromStorage` functions — the adapter only changes WHO calls them.
// ---------------------------------------------------------------------------

/**
 * Framework-agnostic lifecycle hook adapter. A host that owns its own
 * client-side navigation lifecycle (zfb, custom router, etc.) implements
 * this and calls `setLifecycleAdapter(...)` so persisted overrides re-apply
 * after every soft navigation without depending on Astro events.
 *
 * Each callback installer must return a cleanup function that unbinds the
 * listener — `setLifecycleAdapter` calls these on re-registration and on
 * `setLifecycleAdapter(null)`.
 */
export interface LifecycleAdapter {
  /** Install a handler that fires before a client-side navigation swaps the document. */
  onBeforeSwap?: (callback: () => void) => () => void;
  /** Install a handler that fires after a client-side navigation has loaded the new page. */
  onPageLoad?: (callback: () => void) => () => void;
}

interface AdapterLifecycleState {
  bound: boolean;
  /** Cleanup fns for whatever set of bindings is currently active (astro fallback or a registered adapter). */
  cleanups: Array<() => void>;
  /** The adapter currently in effect, or `null` when the astro fallback is active. */
  adapter: LifecycleAdapter | null;
}

/**
 * Lifecycle slot for the panel module. We use a DISTINCT window key from
 * `__zudoDesignTokenPanelAdapter` (owned by `astro/host-adapter.ts` as a
 * per-`storagePrefix` map of `DesignTokenPanelAdapterState`). The two
 * surfaces would otherwise declare incompatible shapes against the same
 * key; separating the slots keeps each file's TypeScript types honest.
 */
type AdapterWindow = Window & {
  __zudoDesignTokenPanelLifecycle?: AdapterLifecycleState;
};

function getAdapterState(): AdapterLifecycleState {
  const w = window as AdapterWindow;
  if (w.__zudoDesignTokenPanelLifecycle) return w.__zudoDesignTokenPanelLifecycle;
  const state: AdapterLifecycleState = { bound: false, cleanups: [], adapter: null };
  w.__zudoDesignTokenPanelLifecycle = state;
  return state;
}

/** Active cleanup fns are tracked on the lifecycle state so re-bind paths can drain them in one call. */
function runCleanups(state: AdapterLifecycleState): void {
  const fns = state.cleanups;
  state.cleanups = [];
  for (const fn of fns) {
    try {
      fn();
    } catch {
      /* a listener-removal that throws should not abort the rebind */
    }
  }
}

/**
 * Install the astro fallback document listeners and record their removers
 * on the lifecycle state's cleanup list. SSR-guarded — outside a browser
 * the listeners are a no-op and the cleanup list stays empty.
 */
function bindAstroFallback(state: AdapterLifecycleState): void {
  if (typeof document === 'undefined') return;
  document.addEventListener('astro:before-swap', unmountForSwap);
  document.addEventListener('astro:page-load', reapplyFromStorage);
  state.cleanups.push(
    () => document.removeEventListener('astro:before-swap', unmountForSwap),
    () => document.removeEventListener('astro:page-load', reapplyFromStorage),
  );
}

/**
 * Install the same internal handlers through a host-supplied lifecycle
 * adapter. Each adapter installer returns a cleanup fn we capture so the
 * next `setLifecycleAdapter` call can drain it.
 *
 * If the adapter omits a hook, the corresponding astro fallback listener is
 * retained for that channel — otherwise a host registering only one of
 * `{onBeforeSwap, onPageLoad}` would silently leak the other channel
 * (no `unmountForSwap` → orphaned Preact tree on body-swapping routers, or
 * no `reapplyFromStorage` → persisted overrides not re-applied after nav).
 * The internal handlers are idempotent, so a host that emits both astro
 * events AND its own custom event observes at most a no-op double-call.
 *
 * A `console.warn` fires for partial adapters so authors notice the
 * fallback was retained — silent acceptance was the original design and
 * caused a real leak in zfb-style hosts that only have a before-swap event.
 */
function bindAdapter(state: AdapterLifecycleState, adapter: LifecycleAdapter): void {
  if (typeof document === 'undefined') return;
  if (adapter.onBeforeSwap) {
    state.cleanups.push(adapter.onBeforeSwap(unmountForSwap));
  } else {
    document.addEventListener('astro:before-swap', unmountForSwap);
    state.cleanups.push(() =>
      document.removeEventListener('astro:before-swap', unmountForSwap),
    );
  }
  if (adapter.onPageLoad) {
    state.cleanups.push(adapter.onPageLoad(reapplyFromStorage));
  } else {
    document.addEventListener('astro:page-load', reapplyFromStorage);
    state.cleanups.push(() =>
      document.removeEventListener('astro:page-load', reapplyFromStorage),
    );
  }
  if (!adapter.onBeforeSwap || !adapter.onPageLoad) {
    const missing = [
      !adapter.onBeforeSwap ? 'onBeforeSwap' : null,
      !adapter.onPageLoad ? 'onPageLoad' : null,
    ]
      .filter(Boolean)
      .join(', ');
    console.warn(
      `[design-token-panel] LifecycleAdapter is missing ${missing}. ` +
        'Astro fallback listener retained for the missing channel(s) so the ' +
        'panel does not leak the Preact tree or skip override re-apply on ' +
        'soft-nav. Provide the hook explicitly to silence this warning.',
    );
  }
}

/**
 * Register a framework-agnostic lifecycle adapter (or pass `null` to
 * restore the astro fallback). Safe to call before or after the module's
 * import-time bootstrap — late registration drains the astro fallback's
 * cleanup fns first, so the original document listeners are actively
 * unbound and never double-fire alongside the adapter.
 *
 * No-op outside a browser context (SSR-safe).
 */
export function setLifecycleAdapter(adapter: LifecycleAdapter | null): void {
  if (typeof window === 'undefined') return;
  const state = getAdapterState();
  runCleanups(state);
  state.adapter = adapter;
  if (adapter) {
    bindAdapter(state, adapter);
  } else {
    bindAstroFallback(state);
  }
}

/**
 * H2 fix (#111): reapply must run AFTER configurePanel supplies the host's
 * storagePrefix. Previously these calls ran at module-init time with DEFAULT
 * config. With contaminated localStorage (`zudo-design-token-panel:visible=1`),
 * reapplyFromStorage would mount a default-prefix panel BEFORE configurePanel
 * ran, then its useEffect would removeItem(getOpenKey()) — now pointing at the
 * host's prefix — clobbering the first toggle. Registering as a post-configure
 * hook ensures reapply always uses the host-supplied config.
 *
 * Defined as a stable module-level constant so registerPostConfigureHook's
 * idempotency-by-reference works correctly across calls (e.g. Astro view
 * transitions that re-run the module-init block via setLifecycleAdapter).
 */
const POST_CONFIGURE_REAPPLY_HOOK = (): void => {
  reapplyPersistedOverrides();
  reapplyFromStorage();
};

if (typeof window !== 'undefined') {
  const state = getAdapterState();
  // Bind the DEFAULT instance's toggle listener eagerly so the historical
  // single-panel path (hosts that dispatch `toggle-design-token-panel` before
  // — or without — calling configurePanel) keeps working out of the box.
  // Configured instances are bound at configure time via the `configured`
  // lifecycle hook above.
  bindInstance(getPanelConfig());

  if (!state.bound) {
    state.bound = true;

    // Initial bindings: astro fallback. `setLifecycleAdapter(...)` rewrites
    // this set later if a host installs an adapter. This is a single,
    // document-level page-swap channel (NOT per-instance) — see the
    // per-instance bindings section above for the toggle-event channels.
    bindAstroFallback(state);

    // H2 fix (#111): register reapply as a post-configure hook instead of
    // calling it eagerly here. The eager call ran with DEFAULT_PANEL_CONFIG's
    // storagePrefix (the host hadn't called configurePanel yet), which caused
    // a default-prefix panel to mount and remove the host-prefix open key on
    // first toggle. See notes/zfb-first-toggle-diagnosis.md H2 section.
    registerPostConfigureHook(POST_CONFIGURE_REAPPLY_HOOK);
  }
}
