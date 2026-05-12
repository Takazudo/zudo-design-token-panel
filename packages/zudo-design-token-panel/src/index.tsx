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
// Side-effect import: bundles panel chrome CSS + panel-private CSS variables
// so the package is visually self-contained for any consumer.
import './styles/panel.css';
import {
  applyFullState,
  getOpenKey,
  getStorageKeyV2,
  getStorageKeyV3,
  loadPersistedState,
} from './state/tweak-state';
import {
  getPanelConfig,
  panelRootId,
  storageKey_visible,
  type PanelConfig,
} from './config/panel-config';

// ---------------------------------------------------------------------------
// Public DOM contract (kept in sync with astro/host-adapter.ts)
// ---------------------------------------------------------------------------

/** Root element id that hosts the Preact panel tree. Derived from `panelConfig.storagePrefix`. */
function getPanelId(): string {
  return panelRootId(getPanelConfig());
}

/** Adapter's visibility-intent flag. Derived from `panelConfig.storagePrefix` (colon separator). */
function getStorageKey(): string {
  return storageKey_visible(getPanelConfig());
}

const TOGGLE_EVENT = 'toggle-design-token-panel';
/** Deprecated — kept so legacy callers still flip the panel. */
const TOGGLE_EVENT_ALIAS = 'toggle-color-tweak-panel';

/**
 * Internal sync event. The module-scope toggle handler writes
 * `localStorage[OPEN_KEY]` to the new desired value and then dispatches this
 * on `window`; the mounted panel's `useEffect`-installed listener re-reads
 * `OPEN_KEY` and calls `setOpen` accordingly. Single source of truth lives in
 * `localStorage[OPEN_KEY]`; the event is just a "go re-read" pulse.
 *
 * Internal name (double-underscore prefix) — not part of the public DOM
 * contract; hosts must continue to dispatch `toggle-design-token-panel`.
 *
 * Why this exists: the old design had `panel.tsx`'s own window listener
 * toggle internal `open` state via `setOpen((prev) => !prev)`. That made the
 * in-component listener authoritative for the toggle, but its registration is
 * deferred until Preact's `useEffect` flushes (one rAF after mount). A click
 * that lands during that window — or any subtle pre-hydration / SPA-nav race
 * that drops the in-component listener — is silently lost; the user has to
 * click twice. The internal sync event lets the module-scope handler own the
 * authoritative write and notify the panel separately, so the panel's job is
 * the trivial one (re-read storage), not toggle arithmetic.
 */
const OPEN_STATE_CHANGED_EVENT = '__zdtp:open-state-changed';

/**
 * Dispatch the internal sync event so a mounted `panel.tsx` re-reads
 * `localStorage[OPEN_KEY]` and updates its `open` state. SSR-safe.
 *
 * Internal — exported for tests only.
 */
function notifyPanelOpenChanged(): void {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent(OPEN_STATE_CHANGED_EVENT));
}

export const __OPEN_STATE_CHANGED_EVENT_FOR_TEST = OPEN_STATE_CHANGED_EVENT;

// ---------------------------------------------------------------------------
// Storage helpers (SSR-safe, tolerant of private mode / quota errors)
// ---------------------------------------------------------------------------

function setStoredVisibility(isVisible: boolean): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(getStorageKey(), isVisible ? '1' : '0');
  } catch {
    /* ignore */
  }
}

function wasVisible(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    return window.localStorage.getItem(getStorageKey()) === '1';
  } catch {
    return false;
  }
}

function hasPersistedOverrides(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    // Check v3 key first; fall back to v2 for sessions that have not yet
    // migrated (migration runs on first loadPersistedState call, i.e. once
    // the panel mounts — before mount we may only see the v2 key).
    const ls = window.localStorage;
    return ls.getItem(getStorageKeyV3()) !== null || ls.getItem(getStorageKeyV2()) !== null;
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
function isPanelCurrentlyOpen(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    return window.localStorage.getItem(getOpenKey()) === '1';
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
function seedOpenStateBeforeMount(desiredOpen: boolean): void {
  if (typeof window === 'undefined') return;
  try {
    const openKey = getOpenKey();
    if (desiredOpen) window.localStorage.setItem(openKey, '1');
    else window.localStorage.removeItem(openKey);
  } catch {
    /* ignore */
  }
}

// ---------------------------------------------------------------------------
// Mount / unmount
// ---------------------------------------------------------------------------

function findRoot(): HTMLElement | null {
  if (typeof document === 'undefined') return null;
  return document.getElementById(getPanelId());
}

/**
 * Idempotently mount the Preact shell. Returns `true` only on a fresh mount.
 *
 * Callers that need the panel in a specific open state on a fresh mount must
 * call `seedOpenStateBeforeMount(...)` *before* this function — the panel's
 * mount-effect reads `OPEN_KEY` synchronously, so the seed has to be visible
 * by then.
 */
function ensureMounted(): boolean {
  if (typeof document === 'undefined') return false;
  const panelId = getPanelId();
  if (document.getElementById(panelId)) return false;
  const root = document.createElement('div');
  root.id = panelId;
  document.body.appendChild(root);
  render(<DesignTokenTweakPanel />, root);
  return true;
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
export type { PanelConfig } from './config/panel-config';

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
// `import type { ColorClusterConfig } from '@takazudo/zudo-design-token-panel'`
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
export { isLengthKind, isNumberKind, isSelectKind, isTextKind, isColorKind } from './tokens/tier-model';
// Re-export the unified `TweakState` envelope and the `emptyOverrides()`
// factory so external SerDe / persistence layers (e.g. zudo-doc's
// `design-token-serde.ts`) can construct and type a fully-populated
// `TweakState` without reaching into the package's internals or the
// test-only `./testing` sub-export. Type-only export of `TweakState`
// avoids isolatedModules surprises; `emptyOverrides` is a runtime value.
export type { TweakState } from './state/tweak-state';
export { emptyOverrides } from './state/tweak-state';

export function showDesignTokenPanel(): void {
  if (typeof window === 'undefined') return;
  const isFreshMount = !findRoot();
  // Write OPEN_KEY synchronously so both the fresh-mount path (panel reads on
  // mount) and the steady-state path (panel reads on sync event) see the
  // same authoritative value.
  seedOpenStateBeforeMount(true);
  ensureMounted();
  setStoredVisibility(true);
  // Fresh mount: panel.tsx's mount-effect picks up OPEN_KEY="1" and renders
  // open — no listener race because the listener doesn't run yet anyway.
  if (isFreshMount) return;
  // Steady state: notify the mounted panel to re-read OPEN_KEY.
  if (isPanelCurrentlyOpen() === false) {
    // OPEN_KEY just changed; sync the panel.
    notifyPanelOpenChanged();
  }
  // (If OPEN_KEY was already "1", panel is already open; nothing to do.)
  // Note: we read `isPanelCurrentlyOpen` *after* the seed, so this only skips
  // the notify when the panel state is already in sync — which is harmless
  // either way because the sync event is idempotent.
}

export function hideDesignTokenPanel(): void {
  if (typeof window === 'undefined') return;
  const isFreshMount = !findRoot();
  seedOpenStateBeforeMount(false);
  ensureMounted();
  setStoredVisibility(false);
  if (isFreshMount) return;
  // After the seed, isPanelCurrentlyOpen() returns false. We don't have the
  // pre-seed value here, so just always notify — the sync event is idempotent
  // (panel re-reads OPEN_KEY and calls setOpen(false); if already false, no
  // re-render thanks to Preact's identity check on setState).
  notifyPanelOpenChanged();
}

export function toggleDesignPanel(): void {
  if (typeof window === 'undefined') return;
  // Snapshot intent *before* the seed flips `OPEN_KEY`.
  const willBeOpen = !isPanelCurrentlyOpen();
  const isFreshMount = !findRoot();
  seedOpenStateBeforeMount(willBeOpen);
  ensureMounted();
  setStoredVisibility(willBeOpen);
  // Fresh mount: seed already drove the mount-effect to the desired state.
  if (isFreshMount) return;
  notifyPanelOpenChanged();
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
  try {
    const persisted = loadPersistedState();
    if (persisted) applyFullState(persisted);
  } catch {
    /* ignore — stylesheet defaults paint instead */
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
  const root = findRoot();
  if (!root) return;
  const shouldRestore = wasVisible();
  render(null, root);
  root.remove();
  if (shouldRestore) setStoredVisibility(true);
}

/**
 * Re-materialise the shell on a page load when either (a) the user had the
 * panel visible before navigation, or (b) overrides are persisted and need
 * reapplying even while the panel stays hidden.
 *
 * Overrides are applied to `:root` first (cheap, no Preact render) so the
 * post-swap paint uses the persisted values immediately instead of waiting
 * for the shell's mount-effect to fire. This kills the FOUT on soft-nav the
 * same way the adapter's module-init path kills it on hard-nav.
 */
function reapplyFromStorage(): void {
  reapplyPersistedOverrides();
  if (wasVisible()) {
    showDesignTokenPanel();
  } else if (hasPersistedOverrides()) {
    hideDesignTokenPanel();
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
function handleExternalToggleEvent(): void {
  const isFreshMount = !findRoot();
  // When the panel root is absent (fresh mount, or SPA-nav zombie state where
  // `unmountForSwap` removed the root but left `OPEN_KEY='1'` behind), the
  // user's intent on this toggle event is unambiguously "open" — deriving
  // direction from a possibly-stale `OPEN_KEY` would mount the panel CLOSED
  // and require a second click. See zudolab/zudo-doc#1633 / #1640 / #1631.
  const willBeOpen = isFreshMount ? true : !isPanelCurrentlyOpen();
  seedOpenStateBeforeMount(willBeOpen);
  ensureMounted();
  // Fresh mount: the seed has already driven the mount-effect to the desired
  // state; no in-component listener exists to notify yet. The sync event
  // would harmlessly land in the void.
  if (isFreshMount) return;
  notifyPanelOpenChanged();
}

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

if (typeof window !== 'undefined') {
  const state = getAdapterState();
  if (!state.bound) {
    state.bound = true;

    window.addEventListener(TOGGLE_EVENT, handleExternalToggleEvent);
    window.addEventListener(TOGGLE_EVENT_ALIAS, handleExternalToggleEvent);

    // Initial bindings: astro fallback. `setLifecycleAdapter(...)` rewrites
    // this set later if a host installs an adapter.
    bindAstroFallback(state);

    // Apply persisted overrides to `:root` BEFORE any Preact render — kills
    // the hard-navigation FOUT. `reapplyFromStorage()` below then mounts the
    // shell only when the user had it open or has a persisted state to
    // display (and internally reapplies overrides again, which is a cheap
    // idempotent op — setting the same inline CSS vars twice paints once).
    reapplyPersistedOverrides();
    // Initial hard-load parity with the soft-nav path in `reapplyFromStorage`.
    reapplyFromStorage();
  }
}
