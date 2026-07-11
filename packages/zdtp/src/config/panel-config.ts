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
  /**
   * Schema label surfaced in the Import modal's hint/placeholder/error text
   * and the Export modal's copy. NOT enforced: `serialize()`/`deserialize()`
   * always use the fixed `SCHEMA_V1`/`SCHEMA_V2`/`SCHEMA_V3` constants
   * regardless of this value (#498).
   */
  schemaId: string;
  /** Default filename base — exports save as `${exportFilenameBase}.json`. */
  exportFilenameBase: string;
  /**
   * Optional window-event name that toggles THIS instance's panel.
   *
   * The default (single-panel) instance keeps the historical public event
   * `toggle-design-token-panel` (plus its `toggle-color-tweak-panel` alias) and
   * ignores this field — see `toggleEventName()`. A configured instance with a
   * NON-default `storagePrefix` listens on this name; when omitted it defaults
   * to `toggle-${storagePrefix}` so two panels on one page get independent
   * toggle channels with no cross-talk.
   */
  toggleEvent?: string;
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
  /**
   * The config AS SUPPLIED by the host, before any runtime merges (e.g.
   * before `setPanelColorPresets` merges presets into `config`). Used
   * exclusively for the idempotency guard in `configurePanel` so that
   * a view-transition re-call with the original inline config still passes
   * even after `setPanelColorPresets` mutated `config`. Never modified
   * after construction.
   */
  suppliedConfig: PanelConfig;
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
  /**
   * Z2 per-instance lifecycle hooks (configured / open / close / toggle /
   * destroy). MUST live on the shared registry for the same reason as
   * `pendingPostConfigureHooks`: in Vite/Astro multi-entry builds `index.tsx`
   * installs the hooks from one `panel-config` module instance while
   * `configurePanel` fires the `configured` hook from another. A module-scoped
   * object would be per-chunk — the configuring chunk would see unset hooks and
   * second+ instances would never bind their per-instance toggle events.
   */
  lifecycleHooks: PanelLifecycleHooks;
  /**
   * #501 — set of instance `storagePrefix`es whose panel wrote the standard
   * `color-scheme` inline property to its apply target (`document.documentElement`
   * or its sink's root). Presence = "this panel instance owns the current inline
   * `color-scheme` and may clear it"; absence = "host-owned or never written —
   * leave it alone".
   *
   * MUST live on this shared globalThis-keyed registry, NOT:
   *  - a `PanelInstanceRecord` field — `destroy()` deletes the record, but the
   *    inline `color-scheme` survives destroy (`unmountInstance` never clears
   *    it), so ownership knowledge must outlive the record across
   *    `destroy()` → `configurePanel()` → remount.
   *  - a module-scope `Map` in `tweak-state.ts` — Vite multi-entry builds can
   *    duplicate that module (see the `REGISTRY_SYMBOL` note above / epic #108);
   *    each copy would track ownership independently and the apply-writing
   *    copy's flag would be invisible to the clear-reading copy.
   *
   * Keyed per-instance (#357): instance A's per-mode-literal write must not
   * authorize instance B's clear, and vice versa.
   */
  colorSchemeOwners: Set<string>;
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
      lifecycleHooks: {},
      colorSchemeOwners: new Set(),
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
      getRegistry().lifecycleHooks.open?.(prefix);
    },
    close() {
      getRegistry().lifecycleHooks.close?.(prefix);
    },
    toggle() {
      getRegistry().lifecycleHooks.toggle?.(prefix);
    },
    destroy() {
      // Model-level cleanup: drop the instance from the registry. Z2 extends
      // this via the `destroy` lifecycle hook to also unmount the Preact tree
      // and remove the DOM root.
      getRegistry().lifecycleHooks.destroy?.(prefix);
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
  /**
   * Fired ONCE per newly-registered instance, immediately after
   * `configurePanel` installs it (and AFTER the instance's post-configure
   * hooks run). Z2 uses this to bind the instance's per-instance toggle-event
   * listener at configure time — unlike `registerPostConfigureHook` (which
   * adopts parked hooks for the FIRST instance only), this fires for EVERY
   * `configurePanel` call, including the 2nd+ instance, so a non-default
   * panel's `toggle-${storagePrefix}` channel is live the moment it is
   * configured.
   */
  configured?: (instanceId: string) => void;
  open?: (instanceId: string) => void;
  close?: (instanceId: string) => void;
  toggle?: (instanceId: string) => void;
  destroy?: (instanceId: string) => void;
}

/**
 * Z2 seam: install per-instance lifecycle handlers used by every instance
 * handle's open/close/toggle/destroy plus the per-configure `configured` hook.
 * Last call wins (Z2 owns its own idempotency). No-op-friendly: unset handlers
 * leave the corresponding hook a no-op.
 *
 * Stored on the SHARED globalThis registry (not module scope) so the install
 * side (`index.tsx`) and the fire side (`configurePanel`) observe the same
 * hooks even when a Vite/Astro multi-entry build code-splits `panel-config`
 * into two module instances — mirrors `pendingPostConfigureHooks`.
 */
export function __setPanelLifecycleHooks(hooks: PanelLifecycleHooks): void {
  getRegistry().lifecycleHooks = {
    configured: hooks.configured,
    open: hooks.open,
    close: hooks.close,
    toggle: hooks.toggle,
    destroy: hooks.destroy,
  };
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
    // Compare the AS-SUPPLIED config (pre-runtime-merge) against the incoming
    // config, excluding `applySink` from both sides. This fixes two problems:
    //   1. `setPanelColorPresets` merges colorPresets into `record.config` after
    //      configure, so a view-transition re-call with the original inline config
    //      (no colorPresets) would never equal the mutated stored config — causing a
    //      spurious throw. Using `suppliedConfig` (frozen at configure time)
    //      keeps the guard stable regardless of later preset mutations.
    //   2. `applySink` is function-typed and fails structuralEqual when the host
    //      supplies a fresh closure on each re-call. Stripping it from both sides
    //      lets function-typed sinks pass the idempotency check by content
    //      (the function itself is not compared).
    const withoutSink = (c: PanelConfig) => ({ ...c, applySink: undefined });
    if (structuralEqual(withoutSink(existing.suppliedConfig), withoutSink(config))) {
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
    // Snapshot the as-supplied config before any runtime merges. Used by the
    // idempotency guard so view-transition re-calls with the original inline
    // config keep passing even after setPanelColorPresets mutates `config`.
    suppliedConfig: { ...config },
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
  // Fire the Z2 per-configure hook for THIS (every) instance, so the lifecycle
  // module can bind the instance's toggle-event channel at configure time —
  // including the 2nd+ instance that the post-configure-hook adoption skips.
  registry.lifecycleHooks.configured?.(prefix);
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
 * Return the configs of ALL registered panel instances, in registration order.
 * Returns an empty array when no instance has been configured yet.
 *
 * Used by the Astro lifecycle handlers (unmountForSwap / reapplyFromStorage)
 * to loop every mounted instance rather than only the default one. Without
 * this, non-default panels have their DOM roots removed by Astro's body swap
 * WITHOUT `render(null, root)` being called, so their useEffect cleanups never
 * fire and window/document listeners accumulate per soft navigation.
 */
export function getAllPanelConfigs(): PanelConfig[] {
  return [...getRegistry().instances.values()].map((r) => r.config);
}

/**
 * Resolve the registered config for a SPECIFIC instance by its `storagePrefix`
 * (=== `instanceId`), or `null` when no such instance is registered.
 *
 * Z2 uses this so a non-default panel mounts/operates against ITS OWN config
 * (tabs, schema, apply settings, custom `toggleEvent`) instead of the active
 * default instance's config — distinct instances stay fully independent even
 * while another prefix is the active default.
 */
export function getPanelConfigByPrefix(prefix: string): PanelConfig | null {
  return getRegistry().instances.get(prefix)?.config ?? null;
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
  colorSchemeOwnerSet().clear();
}

// ---------------------------------------------------------------------------
// #501 — color-scheme ownership (registry-level metadata)
// ---------------------------------------------------------------------------
//
// The panel writes the standard `color-scheme` inline property to its apply
// target only when a per-mode `light-dark()` literal is present. It must only
// ever CLEAR a `color-scheme` it itself wrote — never a host-owned
// `<html style="color-scheme">` (issue #501). These three helpers are the
// storage plumbing the apply/clear paths in `tweak-state.ts` use to record and
// query that ownership, keyed by instance `storagePrefix`.

/**
 * Lazily-initialised accessor for the ownership set. The lazy guard upgrades a
 * registry created by an older module copy (pre-#501, no `colorSchemeOwners`
 * field) in place rather than dereferencing `undefined` — important under the
 * Vite multi-entry duplication the `REGISTRY_SYMBOL` note describes.
 */
function colorSchemeOwnerSet(): Set<string> {
  const registry = getRegistry() as InstanceRegistry & { colorSchemeOwners?: Set<string> };
  if (!registry.colorSchemeOwners) registry.colorSchemeOwners = new Set();
  return registry.colorSchemeOwners;
}

/**
 * #501 — record that the panel instance keyed by `prefix` wrote `color-scheme`
 * to its apply target. Called from the apply path (`applyColorState`) wherever
 * a per-mode literal forces `color-scheme: light dark`.
 */
export function markColorSchemeWritten(prefix: string): void {
  colorSchemeOwnerSet().add(prefix);
}

/**
 * #501 — drop the color-scheme ownership claim for `prefix`. Called from the
 * clear paths after a panel-written `color-scheme` is removed (or found to have
 * been overwritten by the host — the stale-ownership case).
 */
export function clearColorSchemeOwnership(prefix: string): void {
  colorSchemeOwnerSet().delete(prefix);
}

/**
 * #501 — true when the panel instance keyed by `prefix` is the recorded writer
 * of the current inline `color-scheme`. Gates the clear paths so the panel
 * never removes a `color-scheme` it did not write.
 */
export function ownsColorScheme(prefix: string): boolean {
  return colorSchemeOwnerSet().has(prefix);
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

/**
 * Storage key for the v4 unified envelope. Upgrades the "global tweak model" to
 * per-scheme color persistence (#500/#509): the `color` and `secondary` slices
 * become identity-keyed sub-objects (one slot per resolved scheme/mode), so a
 * per-scheme color tweak survives a scheme toggle round-trip instead of being
 * clobbered by the next unrelated edit. Non-color slices stay global. Kept a
 * SINGLE storage key (not one key per scheme) because the Astro bootstrap must
 * existence-check persistence before cluster config loads — a per-scheme key
 * would hit a chicken-and-egg there. v1/v2/v3 migrate into this key on first
 * load; v4 takes precedence on every subsequent load.
 */
export function storageKey_stateV4(cfg: PanelConfig): string {
  return `${cfg.storagePrefix}-state-v4`;
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

/**
 * Adapter-level owner-autoload intent flag, paired with `:visible`.
 *
 * Marks this browser as the site-owner device so the host-adapter eagerly
 * loads the bundle on every subsequent visit. Uses the same `:` separator as
 * `:visible` (distinct from the `-` separator on all other derived keys).
 */
export function storageKey_autoload(cfg: PanelConfig): string {
  return `${cfg.storagePrefix}:autoload`;
}

/** DOM id of the root element the Preact panel tree mounts into. */
export function panelRootId(cfg: PanelConfig): string {
  return `${cfg.storagePrefix}-root`;
}

/**
 * The public `storagePrefix` of the default (single-panel) instance. An
 * instance whose prefix equals this keeps the historical public toggle-event
 * name; every other prefix gets a per-instance channel. Kept in lockstep with
 * `DEFAULT_PANEL_CONFIG.storagePrefix`.
 */
const DEFAULT_STORAGE_PREFIX = DEFAULT_PANEL_CONFIG.storagePrefix;

/**
 * Historical public toggle-event name. Hosts have shipped `window.dispatchEvent(
 * new CustomEvent('toggle-design-token-panel'))` since the single-panel era, so
 * the default instance MUST keep emitting/listening on this name regardless of
 * its derived `toggle-${storagePrefix}` form.
 */
export const DEFAULT_TOGGLE_EVENT = 'toggle-design-token-panel';

/**
 * Window-event name that toggles this instance's panel.
 *
 *  - Default instance (prefix === `DEFAULT_STORAGE_PREFIX`): the historical
 *    `toggle-design-token-panel`. The `index.tsx` listener additionally binds
 *    the deprecated `toggle-color-tweak-panel` alias for this instance only.
 *  - Configured instance (any other prefix): `cfg.toggleEvent` when supplied,
 *    else `toggle-${storagePrefix}` — a per-instance channel so two panels do
 *    not cross-talk.
 */
export function toggleEventName(cfg: PanelConfig): string {
  if (cfg.storagePrefix === DEFAULT_STORAGE_PREFIX) return DEFAULT_TOGGLE_EVENT;
  return cfg.toggleEvent ?? `toggle-${cfg.storagePrefix}`;
}

/** Base name of the internal per-instance open-state sync event (see below). */
const OPEN_STATE_CHANGED_EVENT_BASE = '__zdtp:open-state-changed';

/**
 * Per-instance internal sync event name. `index.tsx` dispatches this on
 * `window` after writing `localStorage[OPEN_KEY]`; the mounted `panel.tsx`
 * listens for it and re-reads `OPEN_KEY`. Keyed by `storagePrefix` so a change
 * to panel A's open state only pokes panel A's listener — two panels on one
 * page stay fully independent (issue #354).
 *
 * Internal (double-underscore prefix) — NOT part of the public DOM contract;
 * hosts must dispatch the public toggle event, never this one.
 */
export function openStateChangedEventName(cfg: PanelConfig): string {
  return `${OPEN_STATE_CHANGED_EVENT_BASE}:${cfg.storagePrefix}`;
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

// ---------------------------------------------------------------------------
// Fixed-name global open API (issue #523)
// ---------------------------------------------------------------------------
//
// `window.zdtp = { show, hide, toggle }` — an ADDITIVE alias on top of the
// existing `window[consoleNamespace].*` console API (which stays fully
// intact; see PORTABLE-CONTRACT.md §10). `consoleNamespace` is a REQUIRED
// host-chosen config field, so historically every consumer had to know its
// own namespace before it could open the panel from the console. This fixed
// name needs no config lookup: `zdtp.show()` works as soon as either the
// package-root module has loaded (non-Astro hosts) or the Astro
// host-adapter script has run (before the panel bundle itself loads).
//
// Two independent call sites install this alias — `src/index.tsx` (package
// root, for hosts that import the panel directly) and
// `src/astro/host-adapter.ts` (for Astro hosts, installed eagerly alongside
// `installConsoleApi`, wrapping the same lazy `loadPanelModule` + handle
// pattern the console API uses). Both route through this single installer so
// the "never clobber a host-defined `window.zdtp`, never double-install"
// guard logic lives in one place.

/** Shape of the fixed-name global alias installed at `window.zdtp`. */
export interface ZdtpGlobalApi {
  show: () => void | Promise<void>;
  hide: () => void | Promise<void>;
  toggle: () => void | Promise<void>;
}

/**
 * Marks a `window.zdtp` object as one this package installed, so a later
 * install call (from the other call site, or a re-run of the same one — e.g.
 * an Astro view-transition re-executing the adapter `<script>`) can tell
 * "our own idempotent re-install" apart from "a host defined `window.zdtp`
 * for its own purposes". A symbol key is invisible to `Object.keys` /
 * `JSON.stringify`, so it never leaks into a developer's
 * `console.log(window.zdtp)`.
 *
 * `Symbol.for` (not a bare `Symbol()`) for the same reason `REGISTRY_SYMBOL`
 * above uses the global symbol registry: a Vite/Astro multi-entry build can
 * duplicate this module into more than one chunk, and both `index.tsx` and
 * `host-adapter.ts` must recognise each other's install regardless of which
 * chunk they resolved through.
 */
const ZDTP_GLOBAL_ALIAS_MARKER = Symbol.for('@takazudo/zdtp:global-alias-marker');

/**
 * Install `window.zdtp = { show, hide, toggle }`, the fixed-name console
 * sugar for the common single-panel case (issue #523).
 *
 * Guard rules:
 *  - A pre-existing `window.zdtp` WITHOUT this package's marker is assumed to
 *    be host-defined — never overwritten. Logs a `console.warn` so the host
 *    can see why `zdtp.show()` did not appear.
 *  - A pre-existing `window.zdtp` WITH the marker means this package already
 *    installed the alias (from the other call site, or an earlier run of this
 *    same one). First install wins — the call is a silent no-op. In the Astro
 *    flow this manifests as "the adapter wins": its bootstrap script always
 *    runs (and installs the alias) before the panel module's lazy dynamic
 *    import can resolve and reach the package-root install site.
 *
 * `show` / `hide` / `toggle` target the default/most-recently-configured
 * instance, exactly like the package-root `showDesignTokenPanel()` /
 * `hideDesignTokenPanel()` / `toggleDesignPanel()` exports this alias wraps —
 * for a multi-instance page, use `configurePanel(cfg).open()` etc. instead.
 */
export function installZdtpGlobalAlias(api: ZdtpGlobalApi): void {
  if (typeof window === 'undefined') return;
  const win = window as unknown as Record<string, unknown>;
  const existing = win.zdtp;
  if (existing !== undefined) {
    const alreadyOurs = (existing as Record<symbol, unknown>)[ZDTP_GLOBAL_ALIAS_MARKER] === true;
    if (alreadyOurs) return;
    console.warn(
      '[design-token-panel] window.zdtp already exists and was not installed by this package. ' +
        'Skipping the zdtp.show() / zdtp.hide() / zdtp.toggle() global alias to avoid clobbering ' +
        'it. Use window[consoleNamespace].* or the configurePanel(cfg) handle instead.',
    );
    return;
  }
  const alias: ZdtpGlobalApi & Record<symbol, unknown> = { ...api };
  alias[ZDTP_GLOBAL_ALIAS_MARKER] = true;
  win.zdtp = alias;
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
  if (
    cfg.toggleEvent !== undefined &&
    (typeof cfg.toggleEvent !== 'string' || (cfg.toggleEvent as string).length === 0)
  ) {
    throw new Error(
      `[design-token-panel] PanelConfig.toggleEvent must be a non-empty string when set (got ${typeof cfg.toggleEvent})`,
    );
  }
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
    // Pass the full (raw, untyped) tabs array down so a tab can validate
    // cross-tab references (S8, #469) against sibling tabs — including
    // siblings that appear later in the array and have not been validated
    // yet themselves. assertValidTab only reads shape (id/tiers/items) from
    // those siblings defensively; it never assumes they are fully valid.
    assertValidTab(t.id, t, tabs as unknown[]);
  }
}

/**
 * Shape-check a config-time `SemanticValue` override
 * (`colorExtras.semanticDefaults` entries, #499) against the union defined in
 * `tokens/tier-model.ts` — a plain-object shape check on unknown JSON rather
 * than a TS type guard, since these values arrive straight off `PanelConfig`
 * before any typed narrowing has happened.
 */
function isValidSemanticValueShape(v: unknown): boolean {
  if (typeof v === 'number') return true;
  if (v === 'bg' || v === 'fg') return true;
  if (v === null || typeof v !== 'object' || Array.isArray(v)) return false;
  const obj = v as Record<string, unknown>;
  if ('literal' in obj) {
    const lit = obj.literal;
    if (typeof lit === 'string') return true;
    if (lit === null || typeof lit !== 'object' || Array.isArray(lit)) return false;
    const pair = lit as Record<string, unknown>;
    return typeof pair.light === 'string' && typeof pair.dark === 'string';
  }
  if ('ref' in obj) {
    const ref = obj.ref;
    if (ref === null || typeof ref !== 'object' || Array.isArray(ref)) return false;
    const r = ref as Record<string, unknown>;
    if (typeof r.tier !== 'string' || typeof r.item !== 'string') return false;
    if (r.tab !== undefined && typeof r.tab !== 'string') return false;
    return true;
  }
  return false;
}

/**
 * Validate a single tab entry within `PanelConfig.tabs`.
 * Checks tier-id uniqueness, item-id uniqueness across all tiers, cssVar
 * format, referencesTier existence (the referenced tier id must exist), and
 * cross-tier kind compatibility (Option 2-a narrowed guard — see below).
 *
 * `allTabs` is the raw, untyped `PanelConfig.tabs` array (every tab, including
 * this one) — needed to validate cross-tab `referencesRamps` sources (S8,
 * #469), which name a sibling tab by id.
 */
function assertValidTab(tabId: string, tab: Record<string, unknown>, allTabs: unknown[]): void {
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

    // Rule: `semantic` is a boolean marker (`TierConfig.semantic?: true`) read
    // by five separate predicate sites across this file, cluster-config.ts,
    // and color-tab.tsx — some compare with truthiness, some with `=== true`.
    // A present-but-not-`true` value (e.g. `1`, `'true'`) is reachable from a
    // plain-JS host config, where TS's structural typing offers no defense,
    // and would get divergent treatment across those sites (e.g. excluded
    // from palette-pick here but still able to be picked elsewhere). Reject
    // it up front so the ambiguity is never reachable at runtime.
    if (ti.semantic !== undefined && ti.semantic !== true) {
      throw new Error(
        `[design-token-panel] PanelConfig.tabs["${tabId}"].tiers["${ti.id}"].semantic must be` +
          ` exactly \`true\` when present (got ${JSON.stringify(ti.semantic)})`,
      );
    }

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

  // Rule: referencesRamps integrity (S8, #469) — a `semantic: true` tier's
  // cross-tab ramp-source declaration must name an EXISTING tab (cross-tab;
  // an omitted `tab` means "this tab") and an existing tier within it.
  //
  // This is a DIFFERENT mechanism from the same-tab `referencesTier` guard
  // above: `referencesTier` names one tier a whole tier's items resolve
  // against by id; `referencesRamps` is a tier-level allow-list of ramp
  // SOURCES that per-row `{ ref: { tab?, tier, item } }` VALUES (see
  // `SemanticValue` in `tokens/tier-model.ts`) are permitted to point into.
  // Per-row `{ ref }` values are resolved (and validated against actual
  // items) at apply time by `resolveRefToCssVar` in `apply/tier-resolver.ts`
  // — this block only validates the declared sources, not every row.
  for (const tier of tab.tiers) {
    const ti = tier as Record<string, unknown>;
    const tierId = ti.id as string;
    if (ti.referencesRamps === undefined) continue;
    if (ti.semantic !== true) {
      throw new Error(
        `[design-token-panel] PanelConfig.tabs["${tabId}"].tiers["${tierId}"].referencesRamps is only valid on a tier with semantic: true`,
      );
    }
    if (!Array.isArray(ti.referencesRamps)) {
      throw new Error(
        `[design-token-panel] PanelConfig.tabs["${tabId}"].tiers["${tierId}"].referencesRamps must be an array`,
      );
    }
    // Representative kind of THIS semantic tier, for the best-effort
    // cross-kind compatibility check below (reuses the same tierKinds map
    // built during the item loop earlier in this function).
    const referencingKind = tierKinds.get(tierId);
    const sources = ti.referencesRamps as unknown[];
    for (let i = 0; i < sources.length; i++) {
      const src = sources[i];
      if (src === null || typeof src !== 'object' || Array.isArray(src)) {
        throw new Error(
          `[design-token-panel] PanelConfig.tabs["${tabId}"].tiers["${tierId}"].referencesRamps[${i}] must be a non-null object`,
        );
      }
      const s = src as Record<string, unknown>;
      if (typeof s.tier !== 'string' || s.tier.length === 0) {
        throw new Error(
          `[design-token-panel] PanelConfig.tabs["${tabId}"].tiers["${tierId}"].referencesRamps[${i}].tier must be a non-empty string`,
        );
      }
      if (s.tab !== undefined && (typeof s.tab !== 'string' || s.tab.length === 0)) {
        throw new Error(
          `[design-token-panel] PanelConfig.tabs["${tabId}"].tiers["${tierId}"].referencesRamps[${i}].tab must be a non-empty string when set`,
        );
      }
      // Resolve the source tab: omitted (or equal to this tab's id) means
      // "this tab" — mirrors resolveRefToCssVar's `ref.tab === undefined ||
      // ref.tab === currentTab.id` rule in apply/tier-resolver.ts, so the
      // declared allow-list stays in lockstep with actual row resolution.
      const targetTabId = s.tab === undefined ? tabId : s.tab;
      let targetTabRaw: Record<string, unknown>;
      if (targetTabId === tabId) {
        targetTabRaw = tab;
      } else {
        const found = allTabs.find(
          (t) =>
            t !== null &&
            typeof t === 'object' &&
            !Array.isArray(t) &&
            (t as Record<string, unknown>).id === targetTabId,
        );
        if (!found) {
          const availableTabs = allTabs
            .filter((t) => t !== null && typeof t === 'object' && !Array.isArray(t))
            .map((t) => (t as Record<string, unknown>).id)
            .join(', ');
          throw new Error(
            `[design-token-panel] PanelConfig.tabs["${tabId}"].tiers["${tierId}"].referencesRamps[${i}]: tab "${targetTabId}" does not exist. Available tabs: ${availableTabs}.`,
          );
        }
        targetTabRaw = found as Record<string, unknown>;
      }

      // Find the target tier within the target tab. The target tab may be a
      // sibling that has not gone through its own assertValidTab call yet
      // (it can appear later in `allTabs`), so this reads its raw shape
      // defensively instead of assuming full validity.
      const targetTiers = Array.isArray(targetTabRaw.tiers)
        ? (targetTabRaw.tiers as unknown[])
        : [];
      const targetTierIds: string[] = [];
      let targetTierRaw: Record<string, unknown> | undefined;
      for (const tt of targetTiers) {
        if (tt === null || typeof tt !== 'object' || Array.isArray(tt)) continue;
        const ttObj = tt as Record<string, unknown>;
        if (typeof ttObj.id !== 'string') continue;
        targetTierIds.push(ttObj.id);
        if (ttObj.id === s.tier) targetTierRaw = ttObj;
      }
      if (!targetTierRaw) {
        throw new Error(
          `[design-token-panel] PanelConfig.tabs["${tabId}"].tiers["${tierId}"].referencesRamps[${i}]: tier "${s.tier}" does not exist in tab "${targetTabId}". Available tiers: ${targetTierIds.join(', ')}.`,
        );
      }

      // Best-effort cross-tab kind compatibility: a color semantic tier
      // should reference color-kind ramp tiers, etc. Compute the target
      // tier's representative kind directly from its raw items (the
      // per-tab tierKinds map built earlier only covers THIS tab). Skip
      // when either kind is unknown (empty tier, missing type.kind) to stay
      // permissive — same precedent as the same-tab referencesTier guard.
      if (referencingKind !== undefined) {
        const targetItems = Array.isArray(targetTierRaw.items)
          ? (targetTierRaw.items as unknown[])
          : [];
        let targetKind: string | undefined;
        for (const rawItem of targetItems) {
          if (rawItem === null || typeof rawItem !== 'object' || Array.isArray(rawItem)) continue;
          const typeObj = (rawItem as Record<string, unknown>).type;
          if (typeObj === null || typeof typeObj !== 'object' || Array.isArray(typeObj)) continue;
          const kind = (typeObj as Record<string, unknown>).kind;
          if (typeof kind === 'string') {
            targetKind = kind;
            break;
          }
        }
        if (targetKind !== undefined && referencingKind !== targetKind) {
          throw new Error(
            `[design-token-panel] PanelConfig.tabs["${tabId}"].tiers["${tierId}"].referencesRamps[${i}]: referencing semantic tier has kind "${referencingKind}" but target tier "${s.tier}" in tab "${targetTabId}" has kind "${targetKind}" (cross-tab ramp sources must share the semantic tier's kind)`,
          );
        }
      }
    }
  }

  // colorExtras validation block (covers F8 deep validation + F4 palette
  // cssVar contiguity check). Both checks only apply when colorExtras is
  // present; a single guard is clearer than two separate if-blocks.
  if (tab.colorExtras !== undefined) {
    // F8: Validate the colorExtras shape before any downstream code
    // (e.g. getActiveSchemeName) touches its fields and produces cryptic
    // TypeErrors. The validator's contract is "one clear error at configure
    // time rather than a crash deep in state initialisation".
    const extras = tab.colorExtras as Record<string, unknown>;
    if (extras === null || typeof extras !== 'object' || Array.isArray(extras)) {
      throw new Error(
        `[design-token-panel] PanelConfig.tabs["${tabId}"].colorExtras must be a plain object`,
      );
    }
    for (const key of ['id', 'defaultShikiTheme'] as const) {
      if (typeof extras[key] !== 'string' || (extras[key] as string).length === 0) {
        throw new Error(
          `[design-token-panel] PanelConfig.tabs["${tabId}"].colorExtras.${key} must be a non-empty string (got ${typeof extras[key]})`,
        );
      }
    }
    for (const key of ['colorSchemes', 'baseRoles', 'baseDefaults'] as const) {
      if (
        extras[key] === undefined ||
        extras[key] === null ||
        typeof extras[key] !== 'object' ||
        Array.isArray(extras[key])
      ) {
        throw new Error(
          `[design-token-panel] PanelConfig.tabs["${tabId}"].colorExtras.${key} must be a plain object`,
        );
      }
    }
    if (
      extras.panelSettings === undefined ||
      extras.panelSettings === null ||
      typeof extras.panelSettings !== 'object' ||
      Array.isArray(extras.panelSettings)
    ) {
      throw new Error(
        `[design-token-panel] PanelConfig.tabs["${tabId}"].colorExtras.panelSettings must be a plain object`,
      );
    }
    const ps = extras.panelSettings as Record<string, unknown>;
    if (typeof ps.colorScheme !== 'string' || (ps.colorScheme as string).length === 0) {
      throw new Error(
        `[design-token-panel] PanelConfig.tabs["${tabId}"].colorExtras.panelSettings.colorScheme must be a non-empty string`,
      );
    }
    if (ps.colorMode !== false) {
      if (
        ps.colorMode === null ||
        typeof ps.colorMode !== 'object' ||
        Array.isArray(ps.colorMode)
      ) {
        throw new Error(
          `[design-token-panel] PanelConfig.tabs["${tabId}"].colorExtras.panelSettings.colorMode must be false or a plain object`,
        );
      }
      const cm = ps.colorMode as Record<string, unknown>;
      for (const key of ['lightScheme', 'darkScheme'] as const) {
        if (typeof cm[key] !== 'string' || (cm[key] as string).length === 0) {
          throw new Error(
            `[design-token-panel] PanelConfig.tabs["${tabId}"].colorExtras.panelSettings.colorMode.${key} must be a non-empty string`,
          );
        }
      }
      if (cm.defaultMode !== 'light' && cm.defaultMode !== 'dark') {
        throw new Error(
          `[design-token-panel] PanelConfig.tabs["${tabId}"].colorExtras.panelSettings.colorMode.defaultMode must be "light" or "dark" (got ${JSON.stringify(cm.defaultMode)})`,
        );
      }
    }

    // Optional semanticDefaults override map (#499): a config-time per-item
    // SemanticValue override that `resolveColorClusterFromTab` consults ahead
    // of `deriveSemanticValue` — the only way a host ships a
    // `{ literal: { light, dark } }` / `{ ref }` config-time default. Shape-check
    // every entry here so a malformed override throws a clear error at
    // configure time instead of surfacing as a cryptic failure deep in the
    // color tab.
    if (extras.semanticDefaults !== undefined) {
      if (
        extras.semanticDefaults === null ||
        typeof extras.semanticDefaults !== 'object' ||
        Array.isArray(extras.semanticDefaults)
      ) {
        throw new Error(
          `[design-token-panel] PanelConfig.tabs["${tabId}"].colorExtras.semanticDefaults must be a plain object`,
        );
      }
      const semanticDefaultsMap = extras.semanticDefaults as Record<string, unknown>;
      for (const [itemId, sv] of Object.entries(semanticDefaultsMap)) {
        if (!isValidSemanticValueShape(sv)) {
          throw new Error(
            `[design-token-panel] PanelConfig.tabs["${tabId}"].colorExtras.semanticDefaults["${itemId}"]` +
              ` must be a valid SemanticValue (number | 'bg' | 'fg' | { literal: string } |` +
              ` { literal: { light, dark } } | { ref: { tier, item, tab? } }), got ${JSON.stringify(sv)}`,
          );
        }
      }
    }

    // F4: Palette cssVar 0-based contiguity check.
    // Find the palette tier (first tier with kind:'color' items, no
    // referencesTier, and not marked `semantic: true`) and verify that each
    // item's cssVar matches the template derived from the first item at its
    // expected 0-based index. A mismatch means the host used 1-based or
    // non-numbered cssVars, which causes palette writes to land on the wrong
    // variables at runtime. A `semantic: true` tier is skipped here (#461) —
    // it legitimately holds named, non-contiguous cssVars (e.g. `--zd-danger`)
    // since its items are SemanticValue mappings, not palette slots.
    const tiers = tab.tiers as unknown as Array<Record<string, unknown>>;
    const paletteTier = tiers.find((t) => {
      if (t.referencesTier !== undefined) return false;
      if (t.semantic === true) return false;
      const items = t.items;
      if (!Array.isArray(items) || items.length === 0) return false;
      const first = items[0];
      if (first === null || typeof first !== 'object' || Array.isArray(first)) return false;
      const typeObj = (first as Record<string, unknown>).type;
      if (typeObj === null || typeof typeObj !== 'object' || Array.isArray(typeObj)) return false;
      return (typeObj as Record<string, unknown>).kind === 'color';
    });
    if (paletteTier) {
      const paletteTierId = paletteTier.id as string;
      const paletteItems = paletteTier.items as Array<Record<string, unknown>>;
      const firstCssVar = paletteItems[0]?.cssVar as string | undefined;
      if (firstCssVar !== undefined) {
        const derivedTemplate = firstCssVar.replace(/\d+$/, '{n}');
        // When the first cssVar has no trailing digits (e.g. "--brand-color"),
        // `replace(/\d+$/, '{n}')` leaves the string unchanged — no `{n}` is
        // ever inserted. In that case, `derivedTemplate.replace('{n}', i)` is
        // a no-op for every slot, so ALL slots would produce the same
        // expectedCssVar and a uniform non-numbered palette would pass silently.
        // Guard explicitly: a non-numbered cssVar is only valid for a single-slot
        // palette; any multi-item palette missing trailing digits is rejected.
        if (!derivedTemplate.includes('{n}')) {
          if (paletteItems.length > 1) {
            throw new Error(
              `[design-token-panel] PanelConfig.tabs["${tabId}"].tiers["${paletteTierId}"].items[0].cssVar` +
                ` ${JSON.stringify(firstCssVar)} has no trailing digit — palette item cssVars must share` +
                ` one prefix and be numbered 0..n-1 in tier order (e.g. "--pal-0" … "--pal-15")`,
            );
          }
          // Single-slot palette with a non-numbered cssVar is valid — nothing to check.
        } else {
          for (let i = 0; i < paletteItems.length; i++) {
            const item = paletteItems[i];
            const expectedCssVar = derivedTemplate.replace('{n}', String(i));
            if (item.cssVar !== expectedCssVar) {
              throw new Error(
                `[design-token-panel] PanelConfig.tabs["${tabId}"].tiers["${paletteTierId}"].items[${i}].cssVar` +
                  ` is ${JSON.stringify(item.cssVar)} but expected ${JSON.stringify(expectedCssVar)}` +
                  ` — palette item cssVars must share one prefix and be numbered 0..n-1 in tier order` +
                  ` (template derived from first item: ${JSON.stringify(derivedTemplate)})`,
              );
            }
          }
        }
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
