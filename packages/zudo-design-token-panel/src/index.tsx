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
    return window.localStorage.getItem(getStorageKeyV2()) !== null;
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

function dispatchToggle(): void {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent(TOGGLE_EVENT));
}

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
// Re-exported so hosts can type the entries of their optional
// `PanelConfig.colorPresets` map without reaching for an internal sub-path.
export type { ColorScheme, ColorRef } from './config/color-schemes';
// Re-export the `TokenManifest` shape so consumers can type their
// host-supplied `panelConfig.tokens` field.
export type { TokenManifest, TokenDef } from './tokens/manifest';

export function showDesignTokenPanel(): void {
  if (typeof window === 'undefined') return;
  // Seed OPEN_KEY *before* a fresh mount. See `seedOpenStateBeforeMount` doc
  // comment for why we cannot rely on a post-render dispatch.
  const isFreshMount = !findRoot();
  if (isFreshMount) seedOpenStateBeforeMount(true);
  ensureMounted();
  setStoredVisibility(true);
  // Fresh-mount path: the seed has already driven `open=true` through
  // `panel.tsx`'s mount-effect. Avoid the event dispatch entirely — the
  // listener is not attached yet (Preact's `useEffect` flushes on rAF, well
  // after our microtask), so it would land in the void.
  if (isFreshMount) return;
  // Steady-state path: panel is already mounted; flipping requires its
  // listener, which is attached by now, so a synchronous dispatch is safe.
  if (isPanelCurrentlyOpen()) return;
  dispatchToggle();
}

export function hideDesignTokenPanel(): void {
  if (typeof window === 'undefined') return;
  const isFreshMount = !findRoot();
  if (isFreshMount) seedOpenStateBeforeMount(false);
  ensureMounted();
  setStoredVisibility(false);
  if (isFreshMount) return;
  if (!isPanelCurrentlyOpen()) return;
  dispatchToggle();
}

export function toggleDesignPanel(): void {
  if (typeof window === 'undefined') return;
  // Snapshot intent *before* the toggle flips `OPEN_KEY`.
  const willBeOpen = !isPanelCurrentlyOpen();
  const isFreshMount = !findRoot();
  if (isFreshMount) seedOpenStateBeforeMount(willBeOpen);
  ensureMounted();
  setStoredVisibility(willBeOpen);
  // On a fresh mount, the seed already drove `panel.tsx`'s mount-effect to
  // the desired state — no event dispatch needed (and dispatching here would
  // race the not-yet-attached listener).
  if (isFreshMount) return;
  dispatchToggle();
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
 * Initial-mount trigger: while the shell is not yet mounted, the very first
 * `toggle-design-token-panel` (or alias) dispatched from elsewhere — e.g. a
 * header button click — lands here. The user's intent is to flip the panel,
 * so we seed `OPEN_KEY` to the *opposite* of its current value before the
 * Preact render. The mount-effect in `panel.tsx` then reads that seed and
 * sets `open` synchronously, matching what an event-listener-driven flip
 * would have done — without the timing race that made post-render dispatch
 * unreliable.
 *
 * Once the shell is mounted, this handler short-circuits and `panel.tsx`
 * owns every subsequent toggle. The before-swap unmount resets that state
 * so the seed-then-mount path kicks in again on the next hard-from-nothing
 * toggle.
 */
function onMaybeMount(): void {
  if (findRoot()) return; // already mounted — panel.tsx owns this event
  const willBeOpen = !isPanelCurrentlyOpen();
  seedOpenStateBeforeMount(willBeOpen);
  ensureMounted();
}

interface AdapterLifecycleState {
  bound: boolean;
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
  const state: AdapterLifecycleState = { bound: false };
  w.__zudoDesignTokenPanelLifecycle = state;
  return state;
}

if (typeof window !== 'undefined') {
  const state = getAdapterState();
  if (!state.bound) {
    state.bound = true;

    window.addEventListener(TOGGLE_EVENT, onMaybeMount);
    window.addEventListener(TOGGLE_EVENT_ALIAS, onMaybeMount);

    if (typeof document !== 'undefined') {
      document.addEventListener('astro:before-swap', unmountForSwap);
      document.addEventListener('astro:page-load', reapplyFromStorage);
    }

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
