/**
 * Owner-autoload — persisted feature state and feature contract.
 *
 * ## Flag semantics
 *
 * `${storagePrefix}:autoload` (written as `'1'` when armed, `'0'` or absent
 * when not) is the owner-mode flag. It means:
 *   "This browser visited the site as the site owner — autoload the
 *    design-token panel on every subsequent page visit."
 *
 * ## General-visitor vs owner behavior
 *
 * - **General visitor** (flag absent or `!== '1'`): the panel bundle is NOT
 *   eagerly fetched. Gate #1 (`shouldAutoload`) returns false, so no bundle
 *   request fires on page load. The panel remains entirely invisible.
 * - **Owner** (flag === `'1'`): Gate #1 fires, the host-adapter fetches the
 *   bundle eagerly, and Gate #2 (`reapplyFromStorage` in `index.tsx`) mounts
 *   the Preact shell CLOSED so the element-path inspector is available even
 *   while the panel UI is hidden.
 *
 * ## enableAutoload() / disableAutoload() contract (implemented by S2 #419)
 *
 * `enableAutoload()` (console API, wired by S2):
 *   1. Sets `:autoload = '1'`.
 *   2. Sets `-elpath-enabled = '1'` once (arms the alt+click inspector).
 *   3. Loads the panel bundle (if not already loaded).
 *   4. Mounts the Preact shell CLOSED via `hideInstance`.
 *
 * `disableAutoload()` (console API, wired by S2):
 *   1. Clears `:autoload`.
 *   2. Clears `:visible`.
 *   3. Clears `-elpath-enabled`.
 *   4. Clears the open-state key (`getOpenKey(cfg)` from `state/tweak-state`).
 *   5. Unmounts the Preact shell.
 *
 * ## Auto-remember
 *
 * Any action that shows the panel (console `showDesignPanel()`, the header-
 * button open event, or the `showInstance` path in `index.tsx`) MUST also
 * write `:autoload = '1'`. Once an owner opens the panel the flag is set so
 * subsequent page loads reload it automatically. (Wired by S2 / S3.)
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

/**
 * Return `true` iff this browser has the owner-autoload flag set.
 *
 * SSR-safe (returns `false` when `window` is not available) and quota-
 * tolerant (returns `false` on any storage error). Reads exactly
 * `${cfg.storagePrefix}:autoload` and matches against the literal string
 * `'1'`; any other stored value (including `'0'` or an absent key) is `false`.
 */
export function shouldAutoload(cfg: PanelConfig): boolean {
  if (typeof window === 'undefined') return false;
  try {
    return window.localStorage.getItem(storageKey_autoload(cfg)) === '1';
  } catch {
    return false;
  }
}

/**
 * Write the owner-autoload flag. Pass `true` to arm autoload (`'1'`), `false`
 * to disarm (`'0'`). SSR-safe and quota-tolerant — errors are swallowed
 * silently so this never throws in restricted storage contexts.
 *
 * Prefer `clearAutoload` when you want to fully remove the key (e.g. on
 * `disableAutoload`) rather than leave a `'0'` sentinel.
 */
export function setAutoload(cfg: PanelConfig, on: boolean): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(storageKey_autoload(cfg), on ? '1' : '0');
  } catch {
    /* ignore — storage unavailable or quota exceeded */
  }
}

/**
 * Remove the owner-autoload flag from storage entirely.
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
