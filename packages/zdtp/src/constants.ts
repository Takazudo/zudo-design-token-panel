/** Default storage-key prefix used by the single-panel configuration. */
export const DEFAULT_STORAGE_PREFIX = 'zudo-design-token-panel';

/** Historical public window-event name for the default panel instance. */
export const DEFAULT_TOGGLE_EVENT = 'toggle-design-token-panel';

/**
 * Resolve the window-event name that toggles a panel instance.
 *
 * The default prefix keeps the historical event name, even when a host
 * supplies a `toggleEvent`. Other prefixes honor an explicit event name and
 * otherwise derive one from the prefix.
 */
export function resolveToggleEventName(cfg: {
  storagePrefix?: string;
  toggleEvent?: string;
}): string {
  if (cfg.storagePrefix === undefined || cfg.storagePrefix === DEFAULT_STORAGE_PREFIX) {
    return DEFAULT_TOGGLE_EVENT;
  }
  return cfg.toggleEvent ?? `toggle-${cfg.storagePrefix}`;
}
