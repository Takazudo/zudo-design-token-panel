/**
 * Panel-level runtime configuration.
 *
 * Centralises every project-specific identifier (storage-key prefix, console
 * namespace, modal class prefix, schema id, export filename) plus the
 * host-supplied token manifest and color cluster. A single `configurePanel`
 * call swaps the panel for any host.
 *
 * Plumbing approach
 * -----------------
 * Module-level registry (NOT Preact context), keyed by `storagePrefix`. Each
 * distinct prefix owns one panel *instance* — its config, its post-configure
 * hooks, its returned handle. Every read site is happy to pay a function call
 * to read the current config. Historically this was a single global singleton;
 * issue #353 (Z1) lifts it to a per-instance registry so multiple panels with
 * distinct `storagePrefix`es can coexist on one page.
 *
 * Backward-compatible default instance
 * ------------------------------------
 * The single-panel path is unchanged. `getPanelConfig()` (no argument) returns
 * the config of the most-recently-configured instance — the "default" / active
 * instance — or `DEFAULT_PANEL_CONFIG` when no host has called `configurePanel`
 * yet. A host that only ever calls `configurePanel` once observes the exact
 * same behaviour as the old singleton.
 *
 * Idempotency & re-configure rule (same-prefix)
 * ---------------------------------------------
 * `configurePanel(config)` returns an instance handle. For a GIVEN prefix it is
 * one-shot: calling it again with structurally-equal values is a no-op and
 * returns the SAME handle (a freshly-parsed inline JSON config can be byte-equal
 * to the previous call but referentially distinct, e.g. on Astro view-transition
 * reruns). Calling again with the same prefix but structurally-DIFFERENT values
 * REJECTS WITH AN ERROR (see `configurePanel` JSDoc) — config conflicts surface
 * immediately instead of silently corrupting one of the callers' assumptions.
 * Calling with a DISTINCT prefix registers a new, independent instance and does
 * NOT throw. This is the chosen rule for Z4/Z5; see `RECONFIGURE_RULE` below.
 *
 * Default fallback
 * ----------------
 * `getPanelConfig()` returns `DEFAULT_PANEL_CONFIG` when `configurePanel` has
 * never been called. The defaults ship intentionally minimal — a sentinel
 * that lets the package import / boot in environments where `configurePanel`
 * has not yet run, but with empty token manifests and a stub color cluster
 * so the UI surfaces "no tokens configured" rather than rendering against
 * arbitrary host-irrelevant data. Hosts MUST call `configurePanel(...)` to
 * see useful behaviour.
 */

import type { ColorScheme } from './color-schemes';
import type { TabConfig } from '../tokens/tier-model';
import { structuralEqual } from '../utils/structural-equal';

/**
 * Apply-routing map.
 *
 * Maps a CSS-var prefix family (without the leading `--`, without the trailing
 * `-`) to the repo-relative source-file path the apply pipeline edits when an
 * override matches that prefix. Hosts MUST supply their own map (or omit the
 * field — the apply button is then disabled).
 *
 * Why a map (not a function): the routing has to round-trip through Astro
 * frontmatter → island JSON, same as the rest of `PanelConfig`
 * (JSON-serializable constraint).
 */
export type ApplyRoutingMap = Record<string, string>;

/**
 * Apply sink interface — allows routing CSS-var writes somewhere other than
 * the host `:root` (e.g. a shadow root, an iframe document, or a spy in
 * tests).
 *
 * - `apply(pairs)` — upsert the given var name→value pairs.
 * - `clear(names)` — remove the given var names.
 *
 * Both methods receive only the vars that belong to THIS panel instance.
 * Sink errors are non-fatal: the apply pipeline swallows them with
 * `console.warn` and continues.
 */
export interface ApplySink {
  apply(pairs: ReadonlyArray<readonly [string, string]>): void;
  clear(names: readonly string[]): void;
}

/**
 * The portable PanelConfig shape.
 */
export interface PanelConfig {
  /** Base for every derived storage key. */
  storagePrefix: string;
  /** Console API namespace — installed as `window[consoleNamespace].showDesignPanel` etc. by the host adapter. */
  consoleNamespace: string;
  /** BEM-style prefix used by every modal in the panel (export / import / apply). */
  modalClassPrefix: string;
  /** `$schema` value emitted into export JSON and required on import. */
  schemaId: string;
  /** Default filename base — exports save as `${exportFilenameBase}.json`. */
  exportFilenameBase: string;
  /**
   * Optional host-supplied color-scheme presets.
   *
   * Surfaces additional named `ColorScheme` entries in the Color tab's
   * "Scheme..." dropdown, in addition to the bundled
   * `colorCluster.colorSchemes` registry. The two are merged at render
   * time; on key collision the cluster's bundled scheme wins.
   */
  colorPresets?: Record<string, ColorScheme>;
  /**
   * Optional dev-API endpoint URL used by the Apply modal. When the host
   * wires the panel into a project that ships the design-tokens-apply route,
   * supply the URL here; the Apply button POSTs its diff payload to it. When
   * undefined / omitted, the Apply button stays disabled with a tooltip.
   */
  applyEndpoint?: string;
  /**
   * Optional CSS-var prefix → source-file routing map. Drives
   * `routeTokensToFiles` / the dev-API handler. Omit to disable apply
   * entirely (the Apply button is gated on `applyEndpoint` AND a non-empty
   * routing map).
   */
  applyRouting?: ApplyRoutingMap;
  /**
   * Host-supplied tab configuration for the data-driven tab strip.
   *
   * `panel.tsx` renders the tab strip from this array.
   *
   *  - Reserved ids (`color`, `font`, `spacing`, `size`) dispatch to their
   *    dedicated tab components.
   *  - Any other id dispatches to `GenericTab`, which renders the tab's
   *    `tiers` using kind-appropriate editors.
   *
   * Hosts MUST supply this field. The color tab (id 'color') reads its
   * palette and semantic data from the tier model via `colorExtras` +
   * `TierItem[]` on the TabConfig. A secondary color tab can be supplied
   * under the reserved id 'color-secondary'.
   */
  tabs: readonly TabConfig[];
  /**
   * Optional apply sink. When present, CSS-var writes and clears for this
   * panel instance are routed through the sink instead of
   * `document.documentElement`. This allows embedding the panel in a shadow
   * DOM, an iframe, or a test spy without touching `:root`.
   *
   * Sink errors are non-fatal — the panel swallows them with `console.warn`.
   * When absent the default path writes to `document.documentElement`
   * (unchanged behavior).
   *
   * NOTE: this field carries a function reference and is therefore NOT
   * JSON-serializable. It cannot be passed through Astro's inline JSON
   * config. Supply it via a post-configure call or a custom adapter.
   */
  applySink?: ApplySink;
  /**
   * Optional id rename map applied during `loadPersistedState` migration.
   * Keys are old ids found in persisted state; values are either:
   *
   *  - A `string` — new canonical id; the value moves to that key.
   *  - `null` — drop the id entirely. Use this for legacy ids that have no
   *    replacement in the current manifest (otherwise stray overrides
   *    persist indefinitely as dead localStorage data: the apply pipeline
   *    silently ignores ids missing from the active manifest, but every
   *    save round-trips the dead key back to disk).
   *
   * Defaults to an empty map (no renaming, no drops) so hosts whose
   * manifest ids are already stable (e.g. `zudo-doc`, whose canonical
   * typography ids are the same names that an earlier zdtp-internal port
   * step treated as "old" labels) are not corrupted: an override on a
   * stable id was being remapped to a non-existent id and silently
   * dropped.
   *
   * zdtp's own astro wiring opts in by passing the legacy zdtp-internal map
   * (`ZDTP_LEGACY_TYPOGRAPHY_RENAME_MAP`, exported from the package root)
   * via this field, preserving the historical rename + drop behaviour for
   * callers that depend on it.
   */
  legacyIdRenameMap?: Record<string, string | null>;
}

/**
 * Handle returned by `configurePanel`. Identifies one configured panel
 * instance and exposes its imperative lifecycle controls.
 *
 * Identity & keying
 * -----------------
 * `instanceId` equals the instance's `storagePrefix` — the registry key. Two
 * `configurePanel` calls with the same prefix+config return the SAME handle
 * object (referential identity is stable across idempotent re-calls); distinct
 * prefixes return distinct handles.
 *
 * Method bodies — seams for later sub-tasks
 * -----------------------------------------
 * This sub-task (Z1) owns the instance MODEL only. `open` / `close` / `toggle`
 * carry the correct method shape but defer their actual mount/visibility wiring
 * to Z2 (events/lifecycle/mount). Today they drive the SAME global show/hide
 * surface the console API uses for the default (single-panel) instance, so the
 * default path keeps working end-to-end; Z2 replaces the bodies with
 * per-instance event dispatch keyed by `instanceId`. `destroy()` deregisters
 * the instance from the registry (model-level cleanup); Z2 extends it to also
 * unmount the instance's Preact tree and remove its DOM root.
 *
 * @see RECONFIGURE_RULE for the same-prefix-different-config behaviour.
 */
export interface PanelInstanceHandle {
  /** Stable instance id — equal to the instance's `storagePrefix` (the registry key). */
  readonly instanceId: string;
  /** Show this instance's panel. Z2 wires per-instance mount/visibility; today drives the shared show surface. */
  open(): void;
  /** Hide this instance's panel. Z2 wires per-instance mount/visibility; today drives the shared hide surface. */
  close(): void;
  /** Toggle this instance's panel open/closed. Z2 wires per-instance mount/visibility. */
  toggle(): void;
  /**
   * Deregister this instance. Removes it from the registry so its prefix can be
   * re-configured with a fresh config (and so it stops being the default
   * instance `getPanelConfig()` resolves to). Z2 extends this to also unmount
   * the instance's Preact tree and remove its DOM root.
   */
  destroy(): void;
}

/**
 * Default config — minimal stub values. Hosts MUST call `configurePanel(...)`
 * with real values to see useful behaviour.
 */
export const DEFAULT_PANEL_CONFIG: PanelConfig = {
  storagePrefix: 'zudo-design-token-panel',
  consoleNamespace: 'zudo',
  modalClassPrefix: 'zudo-design-token-panel-modal',
  schemaId: 'zudo-design-tokens/v1',
  exportFilenameBase: 'zudo-design-tokens',
  // Empty tab list — hosts MUST configure real tabs via configurePanel().
  tabs: [],
  colorPresets: {},
  // No bundled apply endpoint / routing — hosts wire their own.
  applyEndpoint: undefined,
  applyRouting: undefined,
};

// ---------------------------------------------------------------------------
// Instance registry (keyed by storagePrefix)
// ---------------------------------------------------------------------------

/**
 * Same-prefix-different-config rule (CHOSEN: reject-with-error).
 *
 * When `configurePanel` is called a second time with a prefix that is ALREADY
 * registered but a structurally-DIFFERENT config, we throw. The alternative
 * (deterministic-update) was rejected because:
 *
 *  - PORTABLE-CONTRACT §1 pins `configurePanel` as one-shot per page lifecycle
 *    ("MUST NOT silently overwrite a previously-configured cluster mid-session").
 *  - The existing single-panel tests assert the throw, and the throw is what
 *    surfaces a genuine config-conflict bug (two callers fighting over one
 *    prefix) instead of letting the last writer silently win.
 *
 * Multi-instance does NOT need same-prefix mutation: a host that wants a second
 * panel uses a DISTINCT `storagePrefix`, which registers an independent
 * instance with no throw. Z4/Z5 must follow this rule — to re-configure a
 * prefix, call `handle.destroy()` first, then `configurePanel` again.
 *
 * Exported (machine-discoverable) so Z4/Z5 can branch on the chosen rule
 * without re-deriving it from the throw behaviour.
 */
export const RECONFIGURE_RULE = 'reject-with-error' as const;

/**
 * One registered panel instance. Owns its config, its pending color presets
 * (parked before configure), its post-configure hooks, and its handle.
 */
interface PanelInstanceRecord {
  config: PanelConfig;
  pendingColorPresets: Record<string, ColorScheme> | null;
  /**
   * Post-configure hooks — callbacks registered by src/index.tsx that must run
   * AFTER configurePanel supplies the host's storagePrefix. This exists to fix
   * the H2 bug (#111): module-init in index.tsx would call reapplyPersistedOverrides
   * and reapplyFromStorage with DEFAULT config before the host supplied its prefix,
   * causing a default-prefix panel to mount and clobber host-prefix storage keys.
   * Deferring reapply until configurePanel fires avoids the race entirely.
   */
  postConfigureHooks: (() => void)[];
  /** Stable handle for this instance — identity preserved across idempotent re-calls. */
  handle: PanelInstanceHandle;
}

/**
 * The symbol key used to store the instance registry on globalThis.
 *
 * WHY globalThis instead of module-scope `let` bindings:
 * Vite's multi-entry build (e.g. Astro) can produce TWO separate module
 * instances of panel-config.ts — one in the host-adapter chunk, one in the
 * panel module chunk. Module-scope variables are per-instance, so
 * configurePanel() on instance A is invisible to getPanelConfig() on instance
 * B. Storing state on a Symbol.for() registry key makes all instances share
 * one registry regardless of chunk fragmentation. See epic #108 for context.
 *
 * Symbol value is unchanged from the pre-#353 singleton so external tests that
 * read `Symbol.for('@takazudo/zdtp:singleton')` directly keep working — and so
 * the two code-split module instances continue to share one slot.
 */
const REGISTRY_SYMBOL = Symbol.for('@takazudo/zdtp:singleton');

interface InstanceRegistry {
  /** All configured instances, keyed by `storagePrefix`. */
  instances: Map<string, PanelInstanceRecord>;
  /**
   * Prefix of the "default" / active instance — the one `getPanelConfig()`
   * (no-arg) resolves to. Set to the most-recently-configured prefix so the
   * single-panel path is unchanged. `null` when no instance is configured.
   */
  defaultPrefix: string | null;
  /**
   * Color presets parked via `setPanelColorPresets` before ANY instance was
   * configured. Merged into the first instance to be configured. Kept at the
   * registry level (not per-instance) because the pre-configure caller has no
   * prefix to key on yet — it mirrors the historical global holding slot.
   */
  pendingColorPresets: Record<string, ColorScheme> | null;
  /**
   * Post-configure hooks registered via `registerPostConfigureHook` BEFORE any
   * instance was configured. Drained into the first instance to be configured.
   *
   * MUST live on the shared registry (not module scope): in Vite/Astro
   * multi-entry builds, `index.tsx` registers POST_CONFIGURE_REAPPLY_HOOK from
   * one `panel-config` module instance while the host adapter calls
   * `configurePanel` through another. The two instances share this registry via
   * the globalThis symbol, so the configuring side sees the hook the
   * registering side parked. A module-scoped array would be per-chunk — the
   * configuring chunk would drain an empty list and the #111 reapply hook would
   * never fire on first load.
   */
  pendingPostConfigureHooks: (() => void)[];
}

function getRegistry(): InstanceRegistry {
  const g = globalThis as unknown as Record<symbol, InstanceRegistry | undefined>;
  let registry = g[REGISTRY_SYMBOL];
  if (!registry) {
    registry = {
      instances: new Map(),
      defaultPrefix: null,
      pendingColorPresets: null,
      pendingPostConfigureHooks: [],
    };
    g[REGISTRY_SYMBOL] = registry;
  }
  return registry;
}

/**
 * Build the handle for a freshly-registered instance. The handle closes over
 * the prefix only (the registry record is looked up lazily on each call) so it
 * stays valid as the record mutates and so `destroy()` can deregister cleanly.
 *
 * The open/close/toggle bodies are deliberately thin seams for Z2 — see the
 * `PanelInstanceHandle` JSDoc. They route through the lazily-imported public
 * show/hide surface so the DEFAULT (single-panel) instance works end-to-end
 * today; Z2 replaces them with per-instance dispatch keyed by `instanceId`.
 */
function makeHandle(prefix: string): PanelInstanceHandle {
  return {
    instanceId: prefix,
    open() {
      panelLifecycleHooks.open?.(prefix);
    },
    close() {
      panelLifecycleHooks.close?.(prefix);
    },
    toggle() {
      panelLifecycleHooks.toggle?.(prefix);
    },
    destroy() {
      // Model-level cleanup: drop the instance from the registry. Z2 extends
      // this via `panelLifecycleHooks.destroy` to also unmount the Preact tree
      // and remove the DOM root.
      panelLifecycleHooks.destroy?.(prefix);
      const registry = getRegistry();
      registry.instances.delete(prefix);
      if (registry.defaultPrefix === prefix) {
        // Fall back the default pointer to whatever instance remains (last
        // configured), or null when none are left.
        const remaining = [...registry.instances.keys()];
        registry.defaultPrefix = remaining.length > 0 ? remaining[remaining.length - 1] : null;
      }
    },
  };
}

/**
 * Z2 lifecycle seam. Z2 (events/lifecycle/mount) installs handlers here so the
 * instance handle's open/close/toggle/destroy route to real per-instance
 * mount + visibility behaviour. Z1 leaves it empty: the handle methods are
 * no-ops until Z2 wires them, which is fine because the default single-panel
 * path is driven by the existing console API / window events, not by handles.
 *
 * Exported (with the `__` internal prefix) so the lifecycle module (Z2) can
 * register without reaching into private module scope.
 */
export interface PanelLifecycleHooks {
  open?: (instanceId: string) => void;
  close?: (instanceId: string) => void;
  toggle?: (instanceId: string) => void;
  destroy?: (instanceId: string) => void;
}

const panelLifecycleHooks: PanelLifecycleHooks = {};

/**
 * Z2 seam: install per-instance lifecycle handlers used by every instance
 * handle's open/close/toggle/destroy. Last call wins (Z2 owns its own
 * idempotency). No-op-friendly: unset handlers leave the corresponding handle
 * method a no-op.
 */
export function __setPanelLifecycleHooks(hooks: PanelLifecycleHooks): void {
  panelLifecycleHooks.open = hooks.open;
  panelLifecycleHooks.close = hooks.close;
  panelLifecycleHooks.toggle = hooks.toggle;
  panelLifecycleHooks.destroy = hooks.destroy;
}

/**
 * Configure a panel instance. Call once per `storagePrefix` per page lifecycle,
 * before that instance's adapter is imported / mounted. Returns the instance
 * handle (`{ instanceId, open, close, toggle, destroy }`).
 *
 * Keying & multi-instance: the instance is keyed by `config.storagePrefix`.
 * Distinct prefixes register independent instances (no throw); each derives its
 * own storage keys, root id, modal classes, etc.
 *
 * Same-prefix idempotency: calling again with the same prefix and structurally-
 * equal values is a no-op and returns the SAME handle. The re-init guard MUST
 * use structural deep-equality, NOT referential identity — the Astro
 * host-adapter parses the inline JSON config on every script run (including
 * post view-transition reruns), producing a freshly-parsed object that is
 * byte-for-byte identical to the previous call but referentially distinct.
 *
 * Same-prefix-different-config: REJECTS WITH AN ERROR (chosen rule — see
 * `RECONFIGURE_RULE`). To re-configure a prefix, `destroy()` the existing
 * handle first, then call `configurePanel` again.
 *
 * The most-recently-configured instance becomes the "default" instance that the
 * no-arg `getPanelConfig()` resolves to, preserving the single-panel path.
 */
export function configurePanel(config: PanelConfig): PanelInstanceHandle {
  const registry = getRegistry();
  const prefix = config.storagePrefix;
  const existing = registry.instances.get(prefix);
  if (existing) {
    if (structuralEqual(existing.config, config)) {
      // Idempotent re-call for this prefix — keep the installed config and the
      // stable handle, just re-point the default to this prefix (Astro
      // view-transition reruns re-assert "this is the active instance").
      registry.defaultPrefix = prefix;
      return existing.handle;
    }
    // RECONFIGURE_RULE = 'reject-with-error': same prefix, different config.
    throw new Error(
      '[design-token-panel] configurePanel() was already called with different values ' +
        `for storagePrefix "${prefix}". Configuration is one-shot per prefix per page ` +
        'lifecycle. To re-configure this prefix, call handle.destroy() first, then ' +
        'configurePanel() again. (Use a distinct storagePrefix for a second panel instance.)',
    );
  }

  // Fresh instance for this prefix. Merge any registry-level pending presets
  // (parked before ANY instance was configured) into this first instance.
  const presets = registry.pendingColorPresets;
  const installedConfig: PanelConfig = presets ? { ...config, colorPresets: presets } : { ...config };
  registry.pendingColorPresets = null;
  // Drain any hooks parked before this (the first-configured) instance existed.
  // Only the FIRST instance to be configured adopts the parked pre-configure
  // hooks — they target "the default single-panel instance" and there is no
  // ambiguity until a second instance appears.
  const isFirstInstance = registry.instances.size === 0;
  const adoptedHooks = isFirstInstance ? [...registry.pendingPostConfigureHooks] : [];
  if (isFirstInstance) registry.pendingPostConfigureHooks.length = 0;
  const record: PanelInstanceRecord = {
    config: installedConfig,
    pendingColorPresets: null,
    postConfigureHooks: adoptedHooks,
    handle: makeHandle(prefix),
  };
  registry.instances.set(prefix, record);
  registry.defaultPrefix = prefix;
  // Fire post-configure hooks for THIS instance. These run AFTER the host's
  // config is installed, ensuring reapply paths (reapplyPersistedOverrides /
  // reapplyFromStorage) use the correct storagePrefix — not the DEFAULT
  // sentinel. See issue #111 H2 fix.
  for (const hook of record.postConfigureHooks) {
    hook();
  }
  return record.handle;
}

/**
 * Resolve the registry record for the default (active) instance, or `null` when
 * no instance has been configured yet.
 */
function getDefaultRecord(): PanelInstanceRecord | null {
  const registry = getRegistry();
  if (registry.defaultPrefix === null) return null;
  return registry.instances.get(registry.defaultPrefix) ?? null;
}

/**
 * Register a callback to run once configurePanel has been called with the
 * host's config. Used by src/index.tsx to defer reapplyPersistedOverrides and
 * reapplyFromStorage until AFTER the host has supplied the correct storagePrefix.
 *
 * Scope: this targets the DEFAULT (single-panel) instance — the historical
 * single-panel contract. When no instance is configured yet, the hook is parked
 * on a registry-level pending list and attached to the first instance to be
 * configured. When the default instance already exists, the hook fires
 * immediately so late registrants don't miss the trigger.
 *
 * H2 fix for issue #111: module-init in index.tsx previously ran reapply
 * synchronously — before configurePanel — using DEFAULT_PANEL_CONFIG's prefix,
 * causing a default-prefix panel to mount and clobber host-prefix storage keys
 * on the first toggle when contaminated localStorage was present.
 *
 * Idempotent: if the same hook reference is registered twice, the second call
 * is a no-op.
 */
export function registerPostConfigureHook(hook: () => void): void {
  const record = getDefaultRecord();
  if (record === null) {
    // No instance configured yet — park the hook on the SHARED registry so the
    // next configurePanel (possibly from a different code-split module instance
    // in a Vite/Astro multi-entry build) attaches and runs it. Mirrors the
    // historical globalThis-slot pre-configure behaviour.
    const registry = getRegistry();
    if (registry.pendingPostConfigureHooks.includes(hook)) return;
    registry.pendingPostConfigureHooks.push(hook);
    return;
  }
  if (record.postConfigureHooks.includes(hook)) return; // idempotent on reference
  record.postConfigureHooks.push(hook);
  // The default instance already exists → run immediately so ordering between
  // index.tsx module-init and configurePanel is non-load-bearing.
  hook();
}

/**
 * Read the active panel config. Returns the config of the default (most-
 * recently-configured) instance, else `DEFAULT_PANEL_CONFIG` when no host has
 * called `configurePanel`.
 */
export function getPanelConfig(): PanelConfig {
  return getDefaultRecord()?.config ?? DEFAULT_PANEL_CONFIG;
}

/**
 * Test-only: clear the entire instance registry so unit tests can exercise
 * different configs in isolation. Resets the default pointer, every registered
 * instance, parked presets, and parked pre-configure hooks.
 */
export function __resetPanelConfigForTests(): void {
  const registry = getRegistry();
  registry.instances.clear();
  registry.defaultPrefix = null;
  registry.pendingColorPresets = null;
  registry.pendingPostConfigureHooks.length = 0;
}

// Re-export cluster resolution helpers so callers can import from panel-config
// without reaching into cluster-config directly.
export {
  resolvePrimaryColorCluster,
  resolveSecondaryColorClusterFromTabs,
} from './cluster-config';
import {
  resolvePrimaryColorCluster,
  resolveSecondaryColorClusterFromTabs,
} from './cluster-config';
import type { ColorClusterDataConfig } from './cluster-config';

/**
 * Resolve the active primary color cluster from the panel config's tabs array.
 *
 * Returns `undefined` when no color tab is configured or it has no
 * `colorExtras` (e.g. the default empty config).
 *
 * @deprecated Prefer `resolvePrimaryColorCluster(cfg.tabs)` directly.
 */
export function resolveActiveColorCluster(
  cfg: PanelConfig = getPanelConfig(),
): ColorClusterDataConfig | undefined {
  return resolvePrimaryColorCluster(cfg.tabs);
}

/**
 * Resolve the active secondary color cluster from the panel config's tabs.
 *
 * Returns `null` when no 'color-secondary' tab is configured. Callers MUST
 * treat this as "do not render / apply / clear secondary cluster".
 */
export function resolveSecondaryColorCluster(
  cfg: PanelConfig = getPanelConfig(),
): ColorClusterDataConfig | null {
  return resolveSecondaryColorClusterFromTabs(cfg.tabs);
}

// ---------------------------------------------------------------------------
// Derivation helpers
// ---------------------------------------------------------------------------
//
// Each helper takes a `PanelConfig` (typically `getPanelConfig()`) so call
// sites read the *current* config at use time. Module-load-time capture would
// freeze the value before `configurePanel` runs, defeating the singleton.

/** Storage key for the v2 unified envelope (color + spacing + typography + size + position + secondary cluster). */
export function storageKey_stateV2(cfg: PanelConfig): string {
  return `${cfg.storagePrefix}-state-v2`;
}

/**
 * Storage key for the v3 unified envelope. Adds `tabs: Record<tabId, TabOverrides>` alongside
 * the existing color/spacing/typography/size slices so generic host-coined tabs can persist
 * their overrides without schema changes. v2 → v3 migration runs on first load and writes
 * this key, then deletes the v2 key.
 */
export function storageKey_stateV3(cfg: PanelConfig): string {
  return `${cfg.storagePrefix}-state-v3`;
}

/** Legacy v1 key (Color-only flat state). Migrated into v2 on first load, then deleted. */
export function storageKey_stateV1(cfg: PanelConfig): string {
  return `${cfg.storagePrefix}-state`;
}

/** Mirror of the panel's `open` boolean (synchronous mount-time read). */
export function storageKey_open(cfg: PanelConfig): string {
  return `${cfg.storagePrefix}-open`;
}

/** Drag position `{ top, left }` so the panel reappears where the user left it. */
export function storageKey_position(cfg: PanelConfig): string {
  return `${cfg.storagePrefix}-position`;
}

/** User-resized panel size `{ width, height }` (pixels). Lives alongside position. */
export function storageKey_size(cfg: PanelConfig): string {
  return `${cfg.storagePrefix}-size`;
}

/** Tab-grid density preference (one of `0` / `1` / `2`). Lives alongside size/position. */
export function storageKey_density(cfg: PanelConfig): string {
  return `${cfg.storagePrefix}-density`;
}

/**
 * Adapter-level visibility-intent flag.
 *
 * NOTE: This key uses a literal `:` separator (NOT `-`). Every other derived
 * key uses `-`. The colon is a historical artifact preserved for storage-key
 * continuity.
 */
export function storageKey_visible(cfg: PanelConfig): string {
  return `${cfg.storagePrefix}:visible`;
}

/** DOM id of the root element the Preact panel tree mounts into. */
export function panelRootId(cfg: PanelConfig): string {
  return `${cfg.storagePrefix}-root`;
}

/**
 * BEM-style modal class. Pass an empty `suffix` for the base block, or
 * `'--export'` / `'__title'` etc. for elements / modifiers.
 */
export function modalClass(cfg: PanelConfig, suffix: string): string {
  return `${cfg.modalClassPrefix}${suffix}`;
}

/** Default download filename for export. */
export function exportFilename(cfg: PanelConfig): string {
  return `${cfg.exportFilenameBase}.json`;
}

/**
 * Runtime validation at the host-adapter trust boundary. The Astro inline
 * `<script type="application/json">` payload is untrusted-by-the-types:
 * TypeScript believes the field is `PanelConfig`, but any developer typo /
 * serialization regression / future Astro lifecycle change can produce a
 * malformed parse. Catching that at the entry point surfaces a single clear
 * error instead of cryptic downstream failures.
 *
 * Throws with a message naming the offending field. Returns nothing — caller
 * narrows the value via TS's control-flow analysis post-call.
 */
export function assertValidPanelConfig(value: unknown): asserts value is PanelConfig {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error('[design-token-panel] PanelConfig must be a non-null object');
  }
  const cfg = value as Record<string, unknown>;
  for (const key of [
    'storagePrefix',
    'consoleNamespace',
    'modalClassPrefix',
    'schemaId',
    'exportFilenameBase',
  ] as const) {
    if (typeof cfg[key] !== 'string' || (cfg[key] as string).length === 0) {
      throw new Error(
        `[design-token-panel] PanelConfig.${key} must be a non-empty string (got ${typeof cfg[
          key
        ]})`,
      );
    }
  }
  // tabs is required — validate it unconditionally.
  assertValidTabs(cfg.tabs);

  // Optional fields — only validate when present.
  if (cfg.applyEndpoint !== undefined && typeof cfg.applyEndpoint !== 'string') {
    throw new Error(
      `[design-token-panel] PanelConfig.applyEndpoint must be a string when set (got ${typeof cfg.applyEndpoint})`,
    );
  }
  if (cfg.applyRouting !== undefined) {
    if (
      cfg.applyRouting === null ||
      typeof cfg.applyRouting !== 'object' ||
      Array.isArray(cfg.applyRouting)
    ) {
      throw new Error('[design-token-panel] PanelConfig.applyRouting must be a plain object');
    }
    for (const [k, v] of Object.entries(cfg.applyRouting as Record<string, unknown>)) {
      if (typeof v !== 'string') {
        throw new Error(
          `[design-token-panel] PanelConfig.applyRouting[${JSON.stringify(k)}] must be a string`,
        );
      }
    }
  }
  if (cfg.legacyIdRenameMap !== undefined) {
    if (
      cfg.legacyIdRenameMap === null ||
      typeof cfg.legacyIdRenameMap !== 'object' ||
      Array.isArray(cfg.legacyIdRenameMap)
    ) {
      throw new Error('[design-token-panel] PanelConfig.legacyIdRenameMap must be a plain object');
    }
    for (const [k, v] of Object.entries(cfg.legacyIdRenameMap as Record<string, unknown>)) {
      if (v !== null && typeof v !== 'string') {
        throw new Error(
          `[design-token-panel] PanelConfig.legacyIdRenameMap[${JSON.stringify(k)}] must be a string or null (got ${typeof v})`,
        );
      }
    }
  }
}

/**
 * Validate the host-supplied `tabs` array. Called by `assertValidPanelConfig`
 * when the field is present. Throws with a message naming the offending
 * tab/tier/item id.
 */
function assertValidTabs(tabs: unknown): void {
  if (!Array.isArray(tabs)) {
    throw new Error('[design-token-panel] PanelConfig.tabs must be an array');
  }

  // Rule: every tab.id is unique within the array
  const tabIds = new Set<string>();
  for (const tab of tabs) {
    if (tab === null || typeof tab !== 'object' || Array.isArray(tab)) {
      throw new Error('[design-token-panel] PanelConfig.tabs: each tab must be a non-null object');
    }
    const t = tab as Record<string, unknown>;
    if (typeof t.id !== 'string' || t.id.length === 0) {
      throw new Error('[design-token-panel] PanelConfig.tabs: each tab must have a non-empty string id');
    }
    if (tabIds.has(t.id)) {
      throw new Error(
        `[design-token-panel] PanelConfig.tabs: duplicate tab id "${t.id}"`,
      );
    }
    tabIds.add(t.id);
    assertValidTab(t.id, t);
  }
}

/**
 * Validate a single tab entry within `PanelConfig.tabs`.
 * Checks tier-id uniqueness, item-id uniqueness across all tiers, cssVar
 * format, referencesTier existence (the referenced tier id must exist), and
 * cross-tier kind compatibility (Option 2-a narrowed guard — see below).
 */
function assertValidTab(tabId: string, tab: Record<string, unknown>): void {
  if (!Array.isArray(tab.tiers)) {
    throw new Error(
      `[design-token-panel] PanelConfig.tabs["${tabId}"].tiers must be an array`,
    );
  }

  // Rule: every tier.id is unique within a tab
  const tierIds = new Set<string>();
  // Representative kind per tier — populated during the items loop and used
  // by the referencesTier kind-compat check (Option 2-a, issue #282).
  const tierKinds = new Map<string, string>();

  for (const tier of tab.tiers) {
    if (tier === null || typeof tier !== 'object' || Array.isArray(tier)) {
      throw new Error(
        `[design-token-panel] PanelConfig.tabs["${tabId}"].tiers: each tier must be a non-null object`,
      );
    }
    const ti = tier as Record<string, unknown>;
    if (typeof ti.id !== 'string' || ti.id.length === 0) {
      throw new Error(
        `[design-token-panel] PanelConfig.tabs["${tabId}"].tiers: each tier must have a non-empty string id`,
      );
    }
    if (tierIds.has(ti.id)) {
      throw new Error(
        `[design-token-panel] PanelConfig.tabs["${tabId}"]: duplicate tier id "${ti.id}"`,
      );
    }
    tierIds.add(ti.id);

    if (!Array.isArray(ti.items)) {
      throw new Error(
        `[design-token-panel] PanelConfig.tabs["${tabId}"].tiers["${ti.id}"].items must be an array`,
      );
    }

    // Validate intra-tier kind consistency. All items in a tier must share the
    // same kind — mixed kinds in one tier are invalid because the editor
    // dispatch in `tabs/generic-tab.tsx` and friends keys off a single kind
    // per tier section. The representative kind is also stored in tierKinds
    // for the inter-tier cross-kind check in the referencesTier block below.
    let tierKind: string | undefined = undefined;
    for (const rawItem of ti.items as unknown[]) {
      if (rawItem === null || typeof rawItem !== 'object' || Array.isArray(rawItem)) continue;
      const rawItemObj = rawItem as Record<string, unknown>;
      const typeObj = rawItemObj.type;
      if (typeObj === null || typeof typeObj !== 'object' || Array.isArray(typeObj)) continue;
      const kind = (typeObj as Record<string, unknown>).kind;
      if (typeof kind !== 'string') continue;
      if (tierKind === undefined) {
        tierKind = kind;
      } else if (tierKind !== kind) {
        throw new Error(
          `[design-token-panel] PanelConfig.tabs["${tabId}"].tiers["${ti.id}"]: mixed item kinds — found "${tierKind}" and "${kind}" in the same tier (all items must share the same kind)`,
        );
      }
    }
    if (tierKind !== undefined) {
      tierKinds.set(ti.id as string, tierKind);
    }
  }

  // Rule: every item.id is unique within a tab (across all tiers)
  // Rule: every item.cssVar starts with "--" and is non-empty
  const itemIds = new Set<string>();
  for (const tier of tab.tiers) {
    const ti = tier as Record<string, unknown>;
    const tierId = ti.id as string;
    for (const item of ti.items as unknown[]) {
      if (item === null || typeof item !== 'object' || Array.isArray(item)) {
        throw new Error(
          `[design-token-panel] PanelConfig.tabs["${tabId}"].tiers["${tierId}"].items: each item must be a non-null object`,
        );
      }
      const it = item as Record<string, unknown>;
      if (typeof it.id !== 'string' || it.id.length === 0) {
        throw new Error(
          `[design-token-panel] PanelConfig.tabs["${tabId}"].tiers["${tierId}"].items: each item must have a non-empty string id`,
        );
      }
      if (itemIds.has(it.id)) {
        throw new Error(
          `[design-token-panel] PanelConfig.tabs["${tabId}"]: duplicate item id "${it.id}" (item ids must be unique across all tiers within a tab)`,
        );
      }
      itemIds.add(it.id);

      // Rule: cssVar starts with "--" and is non-empty
      if (typeof it.cssVar !== 'string' || !it.cssVar.startsWith('--')) {
        throw new Error(
          `[design-token-panel] PanelConfig.tabs["${tabId}"].tiers["${tierId}"].items["${it.id}"].cssVar must start with "--" (got ${JSON.stringify(it.cssVar)})`,
        );
      }
      if (it.cssVar.length <= 2) {
        throw new Error(
          `[design-token-panel] PanelConfig.tabs["${tabId}"].tiers["${tierId}"].items["${it.id}"].cssVar must be non-empty after "--"`,
        );
      }
    }
  }

  // Rule: referencesTier integrity — the named tier must exist in the same tab.
  //
  // Cross-kind guard (Option 2-a, issue #282 — re-added narrower version):
  // When a tier has `referencesTier: X`, look up the representative kind of
  // both the referencing tier and tier X. Allow if:
  //   1. The referencing tier's kind is 'text' — the Font-tab convention
  //      (demos encode ref-tier items as `kind: 'text'` because the stored
  //      value is a string identifier; the runtime resolver does pure id lookup
  //      and the UI routes all ref-tier items to TierRefSelector regardless of
  //      kind, so 'text' is accurate and harmless regardless of the referenced
  //      tier's kind). See issue #245.
  //   2. Both kinds are equal — the canonical same-kind pattern (e.g. color →
  //      color in the Color tab).
  // Reject otherwise with an explicit error naming both kinds. This catches
  // accidental cross-kind ref wiring (e.g. a color semantic tier referencing a
  // length raw tier) which would emit `var(--length-token)` into a `color:`
  // declaration — invalid CSS that fails silently at runtime.
  // If either kind is unknown (empty tier items, missing `type.kind`) the
  // check is skipped to stay permissive — the intra-tier rule above already
  // catches structural encoding bugs.
  for (const tier of tab.tiers) {
    const ti = tier as Record<string, unknown>;
    const tierId = ti.id as string;
    if (ti.referencesTier !== undefined) {
      if (typeof ti.referencesTier !== 'string') {
        throw new Error(
          `[design-token-panel] PanelConfig.tabs["${tabId}"].tiers["${tierId}"].referencesTier must be a string`,
        );
      }
      const refId = ti.referencesTier;
      // Rule: the named tier exists in the same tab
      if (!tierIds.has(refId)) {
        throw new Error(
          `[design-token-panel] PanelConfig.tabs["${tabId}"].tiers["${tierId}"].referencesTier: tier "${refId}" does not exist in this tab`,
        );
      }
      // Option 2-a cross-kind guard: reject non-text, non-equal-kind refs.
      const referencingKind = tierKinds.get(tierId);
      const referencedKind = tierKinds.get(refId);
      if (
        referencingKind !== undefined &&
        referencedKind !== undefined &&
        referencingKind !== 'text' &&
        referencingKind !== referencedKind
      ) {
        throw new Error(
          `[design-token-panel] PanelConfig.tabs["${tabId}"].tiers["${tierId}"].referencesTier: referencing tier has kind "${referencingKind}" but referenced tier "${refId}" has kind "${referencedKind}" (cross-kind reference is only allowed when the referencing tier has kind "text")`,
        );
      }
    }
  }
}

/**
 * Resolve the active `applyRouting` map. Returns an empty object when the host
 * has not configured one — callers MUST treat empty as "apply disabled".
 */
export function resolveApplyRouting(cfg: PanelConfig = getPanelConfig()): ApplyRoutingMap {
  return cfg.applyRouting ?? {};
}

/**
 * Lazily attach a host-supplied color-preset map AFTER `configurePanel(...)`.
 *
 * Why a second entry point exists: `colorPresets` can be the largest
 * JSON-serializable field on `PanelConfig`. Including it in the inline SSR
 * config blob (the `<script type="application/json">` payload the host-adapter
 * parses on every page) means every page render ships the entire preset
 * library, even though it's only consulted when the user opens the panel's
 * "Scheme..." dropdown. Calling `setPanelColorPresets()` from a deferred
 * dynamic-import in the host wrapper keeps the preset data out of the initial
 * HTML payload — lazy-loaded only when the panel actually mounts.
 *
 * Idempotent: setting the same map twice is a no-op. Setting a different
 * non-empty map overwrites the previous one (no throw, unlike
 * `configurePanel`) — the dropdown source-of-truth is whichever bundle
 * landed last.
 *
 * Scope: targets the DEFAULT (active) instance — the historical single-panel
 * contract. When no instance is configured yet, the presets are parked at the
 * registry level and merged into the first instance to be configured.
 */
export function setPanelColorPresets(presets: Record<string, ColorScheme>): void {
  const record = getDefaultRecord();
  if (record === null) {
    getRegistry().pendingColorPresets = presets;
    return;
  }
  record.config = { ...record.config, colorPresets: presets };
}
