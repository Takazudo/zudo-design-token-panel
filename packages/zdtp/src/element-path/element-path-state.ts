/**
 * Element Path Copy — persisted feature state.
 *
 * The feature has a single persisted bit: whether inspect mode is enabled.
 * When enabled, holding Alt and hovering highlights the element under the
 * cursor (DevTools-style box + label); clicking copies an annotated path block
 * to the clipboard.
 *
 * Persistence mirrors the highlight subsystem: the key is derived from
 * `panelConfig.storagePrefix` at call-time (never at module init) so a host's
 * `configurePanel({ storagePrefix })` is respected.
 */

import { getPanelConfig } from '../config/panel-config';
import type { PanelConfig } from '../config/panel-config';

// ---------------------------------------------------------------------------
// Storage key
// ---------------------------------------------------------------------------

// `cfg` defaults to the active default instance so the historical no-arg callers
// (the mounted orchestrator / toggle button, which always operate on the active
// instance) keep working unchanged. Per-instance callers — e.g. the Astro host
// adapter's namespaced `enableAutoload` / `disableAutoload`, which capture one
// specific instance's config — MUST pass `cfg` so element-path state is written
// to the targeted instance, not whichever instance is the active default
// (multi-instance correctness).
function storageKey_elementPathEnabled(cfg: PanelConfig = getPanelConfig()): string {
  return `${cfg.storagePrefix}-elpath-enabled`;
}

// ---------------------------------------------------------------------------
// Load / save
// ---------------------------------------------------------------------------

/**
 * Load the persisted enabled flag from localStorage. Defaults to `false`
 * (inspect mode off) on any parse/access failure or when absent.
 */
export function loadElementPathEnabled(cfg: PanelConfig = getPanelConfig()): boolean {
  try {
    return localStorage.getItem(storageKey_elementPathEnabled(cfg)) === '1';
  } catch {
    return false;
  }
}

/** Persist the enabled flag to localStorage. Degrades silently when storage is unavailable. */
export function saveElementPathEnabled(
  enabled: boolean,
  cfg: PanelConfig = getPanelConfig(),
): void {
  try {
    localStorage.setItem(storageKey_elementPathEnabled(cfg), enabled ? '1' : '0');
  } catch {
    /* storage unavailable — degrade silently */
  }
}
