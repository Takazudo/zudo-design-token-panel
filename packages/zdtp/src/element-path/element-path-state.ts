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

// ---------------------------------------------------------------------------
// Storage key
// ---------------------------------------------------------------------------

function storageKey_elementPathEnabled(): string {
  return `${getPanelConfig().storagePrefix}-elpath-enabled`;
}

// ---------------------------------------------------------------------------
// Load / save
// ---------------------------------------------------------------------------

/**
 * Load the persisted enabled flag from localStorage. Defaults to `false`
 * (inspect mode off) on any parse/access failure or when absent.
 */
export function loadElementPathEnabled(): boolean {
  try {
    return localStorage.getItem(storageKey_elementPathEnabled()) === '1';
  } catch {
    return false;
  }
}

/** Persist the enabled flag to localStorage. Degrades silently when storage is unavailable. */
export function saveElementPathEnabled(enabled: boolean): void {
  try {
    localStorage.setItem(storageKey_elementPathEnabled(), enabled ? '1' : '0');
  } catch {
    /* storage unavailable — degrade silently */
  }
}
