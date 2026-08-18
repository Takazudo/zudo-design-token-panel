/**
 * Owner-autoload — persisted feature state and feature contract.
 *
 * ## Flag semantics
 *
 * `${storagePrefix}:autoload` is the owner-mode flag. It means:
 *   "This browser visited the site as the site owner — autoload the
 *    design-token panel on every subsequent page visit."
 *
 * The stored value carries the flag's **provenance** — how the browser came to
 * be in owner mode:
 *
 * - `'1'` — **explicit**: the owner deliberately armed owner mode. Written only
 *   by `enableAutoload()` (via `setAutoload(cfg, true)`).
 * - `'auto'` — **auto-remembered**: something merely opened the panel once.
 *   Written by `rememberAutoload()` from the five auto-remember sites —
 *   `showInstance` / `toggleInstance` / the header-button + window-event
 *   handler in `index.tsx`, and `showDesignPanel` / the toggle handler in
 *   `astro/host-adapter.ts`.
 * - `'0'`, absent, or any other value — **not in owner mode**. Written by
 *   `setAutoload(cfg, false)`; `clearAutoload()` removes the key outright.
 *
 * The split exists so a **downstream host** can discriminate the two
 * populations — e.g. keep an `=== '1'` probe and stop eagerly fetching the
 * panel bundle for a visitor who clicked a panel button once months ago.
 *
 * **zdtp's own gates honour BOTH values.** `shouldAutoload()` is `true` for
 * `'1'` and `'auto'` alike, so an owner who reached owner mode by opening the
 * panel still gets the auto-reload this module documents. Making zdtp's own
 * gate ignore `'auto'` would be a silent behaviour regression for every
 * existing user — the discrimination lives in the *stored value*, not in
 * zdtp's behaviour.
 *
 * Auto-remember never **downgrades** an existing `'1'`: an owner who armed
 * explicitly and then opens the panel keeps the explicit provenance.
 *
 * ### Legacy values are forward-looking only
 *
 * Browsers that auto-remembered BEFORE the provenance value existed already
 * hold `'1'`, and no migration can recover a provenance that was never stored.
 * They therefore read as explicit owners forever. A downstream host must not
 * expect an `=== '1'` probe to immediately shed its whole legacy population —
 * the discrimination only applies to writes made from this version onward.
 *
 * ## General-visitor vs owner behavior
 *
 * - **General visitor** (flag absent, `'0'`, or any unrecognised value): the
 *   panel bundle is NOT eagerly fetched. Gate #1 (`shouldAutoload`) returns
 *   false, so no bundle request fires on page load. The panel remains entirely
 *   invisible.
 * - **Owner** (flag `'1'` or `'auto'`): Gate #1 fires, the host-adapter fetches
 *   the bundle eagerly, and Gate #2 (`reapplyFromStorage` in `index.tsx`)
 *   mounts the Preact shell CLOSED so the element-path inspector is available
 *   even while the panel UI is hidden.
 *
 * ## enableAutoload() / disableAutoload() contract (implemented by S2 #419)
 *
 * `enableAutoload()` (console API, wired by S2):
 *   1. Sets `:autoload = '1'` (explicit provenance).
 *   2. Sets `-elpath-enabled = '1'` once (arms the alt+click inspector).
 *   3. Loads the panel bundle (if not already loaded).
 *   4. Mounts the Preact shell CLOSED via `hideInstance`.
 *
 * `disableAutoload()` (console API, wired by S2):
 *   1. Clears `:autoload` (removes the key, whichever value it held).
 *   2. Clears `:visible`.
 *   3. Clears `-elpath-enabled`.
 *   4. Clears the open-state key (`getOpenKey(cfg)` from `state/tweak-state`).
 *   5. Unmounts the Preact shell.
 *
 * ## Auto-remember
 *
 * Any action that shows the panel (console `showDesignPanel()`, the header-
 * button open event, or the `showInstance` path in `index.tsx`) MUST also call
 * `rememberAutoload(cfg)`, which writes `:autoload = 'auto'`. Once the panel
 * has been opened the flag is set so subsequent page loads reload it
 * automatically. (Wired by S2 / S3.)
 *
 * ## Element-path coupling
 *
 * `enableAutoload()` arms the element-path inspector by writing
 * `-elpath-enabled = '1'` once. The user can still turn it off later via the
 * in-panel toggle. The inspector overlay requires the Preact shell to be
 * mounted (it runs inside `ElementPathOrchestrator`), so the CLOSED mount
 * keeps the overlay functional even when the panel UI itself is hidden.
 *
 * ## The two gates that must consider autoload
 *
 * Gate #1 — host-adapter eager-load gate: the host adapter (e.g.
 * `astro/host-adapter.ts`) decides whether to FETCH the panel bundle on page
 * load. It MUST call `shouldAutoload(cfg)` and skip the fetch when the result
 * is false. This keeps general-visitor page loads entirely free of the bundle
 * request.
 *
 * Gate #2 — `index.tsx reapplyFromStorage`: the existing `reapplyFromStorage`
 * function mounts the shell CLOSED when `hasPersistedOverrides(cfg)` or
 * `loadElementPathEnabled()` is true. It MUST also trigger on
 * `shouldAutoload(cfg)` so an owner-mode page load mounts the Preact shell
 * (and therefore the element-path inspector) even when no token overrides
 * are persisted yet.
 */

import type { PanelConfig } from '../config/panel-config';
import { storageKey_autoload } from '../config/panel-config';

/** Stored `:autoload` value meaning "the owner armed owner mode deliberately". */
export const AUTOLOAD_EXPLICIT = '1';

/** Stored `:autoload` value meaning "owner mode was inferred from a panel open". */
export const AUTOLOAD_AUTO_REMEMBERED = 'auto';

/**
 * Return `true` iff this browser has the owner-autoload flag set, regardless of
 * how it got there.
 *
 * SSR-safe (returns `false` when `window` is not available) and quota-
 * tolerant (returns `false` on any storage error). Reads exactly
 * `${cfg.storagePrefix}:autoload` and matches `'1'` (explicit) or `'auto'`
 * (auto-remembered); any other stored value — including `'0'` and an absent
 * key — is `false`.
 */
export function shouldAutoload(cfg: PanelConfig): boolean {
  if (typeof window === 'undefined') return false;
  try {
    const stored = window.localStorage.getItem(storageKey_autoload(cfg));
    return stored === AUTOLOAD_EXPLICIT || stored === AUTOLOAD_AUTO_REMEMBERED;
  } catch {
    return false;
  }
}

/**
 * Write the owner-autoload flag with EXPLICIT provenance. Pass `true` to arm
 * autoload (`'1'`), `false` to disarm (`'0'`). SSR-safe and quota-tolerant —
 * errors are swallowed silently so this never throws in restricted storage
 * contexts.
 *
 * Reserved for the deliberate `enableAutoload()` path; auto-remember call sites
 * use `rememberAutoload` so the two populations stay distinguishable in storage.
 *
 * Prefer `clearAutoload` when you want to fully remove the key (e.g. on
 * `disableAutoload`) rather than leave a `'0'` sentinel.
 */
export function setAutoload(cfg: PanelConfig, on: boolean): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(storageKey_autoload(cfg), on ? AUTOLOAD_EXPLICIT : '0');
  } catch {
    /* ignore — storage unavailable or quota exceeded */
  }
}

/**
 * Arm the owner-autoload flag with AUTO-REMEMBERED provenance (`'auto'`).
 *
 * Called from every auto-remember site — any action that merely opens the panel.
 * An existing explicit `'1'` is left untouched: an owner who armed owner mode
 * deliberately must not demote themselves by opening the panel.
 *
 * SSR-safe and quota-tolerant.
 */
export function rememberAutoload(cfg: PanelConfig): void {
  if (typeof window === 'undefined') return;
  try {
    const key = storageKey_autoload(cfg);
    if (window.localStorage.getItem(key) === AUTOLOAD_EXPLICIT) return;
    window.localStorage.setItem(key, AUTOLOAD_AUTO_REMEMBERED);
  } catch {
    /* ignore — storage unavailable or quota exceeded */
  }
}

/**
 * Remove the owner-autoload flag from storage entirely, whichever provenance
 * value it held.
 *
 * Called by `disableAutoload()` (S2) as part of the full owner-mode teardown.
 * SSR-safe and quota-tolerant.
 */
export function clearAutoload(cfg: PanelConfig): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.removeItem(storageKey_autoload(cfg));
  } catch {
    /* ignore */
  }
}
