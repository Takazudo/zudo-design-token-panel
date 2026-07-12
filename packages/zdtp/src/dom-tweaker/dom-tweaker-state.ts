/**
 * DOM Tweaker — persisted feature state.
 *
 * The eager shell owns one persisted bit: whether DOM Tweaker is enabled for
 * this panel instance. The storage key is derived from PanelConfig at call
 * time (never at module init), so a late `configurePanel({ storagePrefix })`
 * is respected by no-arg callers.
 */

import { getPanelConfig, type PanelConfig } from '../config/panel-config';

// ---------------------------------------------------------------------------
// Storage key
// ---------------------------------------------------------------------------

export function storageKey_domTweakerEnabled(cfg: PanelConfig = getPanelConfig()): string {
  return `${cfg.storagePrefix}-domtweaker-enabled`;
}

// ---------------------------------------------------------------------------
// Load / save
// ---------------------------------------------------------------------------

/**
 * Load the persisted enabled flag from localStorage. Defaults to `false` on
 * missing storage, denied storage access, or any value other than the literal
 * string `'1'`.
 */
export function loadDomTweakerEnabled(cfg: PanelConfig = getPanelConfig()): boolean {
  try {
    return localStorage.getItem(storageKey_domTweakerEnabled(cfg)) === '1';
  } catch {
    return false;
  }
}

/** Persist the enabled flag to localStorage. Degrades silently when unavailable. */
export function saveDomTweakerEnabled(
  enabled: boolean,
  cfg: PanelConfig = getPanelConfig(),
): void {
  try {
    localStorage.setItem(storageKey_domTweakerEnabled(cfg), enabled ? '1' : '0');
  } catch {
    /* storage unavailable — degrade silently */
  }
}
