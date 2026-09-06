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

/**
 * The five fixed eager-load signals, keyed by suffix relative to storagePrefix.
 * Only acceptedValues activate a flag; presence alone is insufficient.
 * requiredConfig means that property must be !== undefined in the panel config.
 * This excludes preference keys and is NOT the whole gate: also inspect
 * EAGER_LOAD_GATE_STATE_FAMILY, whose keys require a content check.
 */
export const EAGER_LOAD_GATE_KEY_SUFFIXES = {
  ':visible': { acceptedValues: ['1'], requiredConfig: null },
  '-open': { acceptedValues: ['1'], requiredConfig: null },
  ':autoload': { acceptedValues: ['1', 'auto'], requiredConfig: null },
  '-elpath-enabled': { acceptedValues: ['1'], requiredConfig: null },
  '-domtweaker-enabled': { acceptedValues: ['1'], requiredConfig: 'domTweaker' },
} as const;

/**
 * The single registry of state-key suffixes the current loader can read.
 *
 * EVERY storage-format version bump must update this registry in the same
 * change that teaches the loader to read that version. The synchronous eager
 * gate intentionally probes only these bounded, readable versions; speculative
 * future versions would promise recovery that the loader cannot perform.
 */
export const READABLE_STATE_KEY_SUFFIXES = {
  v1: '-state',
  v2: '-state-v2',
  v3: '-state-v3',
  v4: '-state-v4',
} as const;

/**
 * The sixth eager-load signal: exact readable state keys, with a content
 * check. Missing keys and raw empty strings are blank;
 * JSON null and empty objects/arrays do not activate. Non-empty collections and
 * all other parsed primitives (even false, 0, or JSON "") activate. Malformed
 * JSON fails open so the panel can migrate or reject the stored payload.
 *
 * matchesKey compares complete strings constructed from the literal prefix, so
 * regex metacharacters are safe and sibling-instance keys are excluded.
 * These are storage signal descriptions, not a storage reader or panel bootstrap.
 */
export const EAGER_LOAD_GATE_STATE_FAMILY = {
  keySuffixes: READABLE_STATE_KEY_SUFFIXES,
  matchesKey(storagePrefix: string, key: string): boolean {
    return Object.values(READABLE_STATE_KEY_SUFFIXES).some(
      (suffix) => key === storagePrefix + suffix,
    );
  },
  valueRules: {
    blank: false,
    jsonNull: false,
    object: 'non-empty',
    array: 'non-empty',
    primitive: true,
    malformedJson: true,
  },
} as const;
