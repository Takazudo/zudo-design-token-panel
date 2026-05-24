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
 * Module-level singleton (NOT Preact context). The panel is a single-instance
 * dev tool, config is set once before the adapter mounts, and every read site
 * is happy to pay a function call to read the current config.
 *
 * Idempotency
 * -----------
 * `configurePanel` is one-shot. Calling it twice with structurally-equal
 * values is a silent no-op (a freshly-parsed inline JSON config can be
 * byte-equal to the previous call but referentially distinct, e.g. on Astro
 * view-transition reruns). Calling with structurally-different values throws.
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
// Singleton storage
// ---------------------------------------------------------------------------

/**
 * The symbol key used to store the singleton slot on globalThis.
 *
 * WHY globalThis instead of module-scope `let` bindings:
 * Vite's multi-entry build (e.g. Astro) can produce TWO separate module
 * instances of panel-config.ts — one in the host-adapter chunk, one in the
 * panel module chunk. Module-scope variables are per-instance, so
 * configurePanel() on instance A is invisible to getPanelConfig() on instance
 * B. Storing state on a Symbol.for() registry key makes all instances share
 * one slot regardless of chunk fragmentation. See epic #108 for context.
 */
const SLOT_SYMBOL = Symbol.for('@takazudo/zdtp:singleton');

interface SingletonSlot {
  configuredConfig: PanelConfig | null;
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
}

function getSingletonSlot(): SingletonSlot {
  const g = globalThis as unknown as Record<symbol, SingletonSlot | undefined>;
  let slot = g[SLOT_SYMBOL];
  if (!slot) {
    slot = { configuredConfig: null, pendingColorPresets: null, postConfigureHooks: [] };
    g[SLOT_SYMBOL] = slot;
  }
  return slot;
}

/**
 * Configure the panel runtime. Call exactly once per page lifecycle, before
 * the adapter is imported / mounted. Idempotent: calling twice with
 * structurally-equal values is a silent no-op; calling twice with structurally
 * different values throws so config conflicts surface immediately instead of
 * silently corrupting one of the two callers' assumptions.
 *
 * The re-init guard MUST use structural deep-equality, NOT referential
 * identity. The Astro host-adapter parses the inline JSON config on every
 * script run, including post view-transition reruns; that produces a
 * freshly-parsed object that is byte-for-byte identical to the previous call
 * but referentially distinct.
 */
export function configurePanel(config: PanelConfig): void {
  const slot = getSingletonSlot();
  if (slot.configuredConfig !== null) {
    if (structuralEqual(slot.configuredConfig, config)) return;
    throw new Error(
      '[design-token-panel] configurePanel() was already called with different values. ' +
        'Configuration is one-shot per page lifecycle.',
    );
  }
  slot.configuredConfig = slot.pendingColorPresets
    ? { ...config, colorPresets: slot.pendingColorPresets }
    : { ...config };
  slot.pendingColorPresets = null;
  // Fire post-configure hooks. These run AFTER the host's config is installed,
  // ensuring reapply paths (reapplyPersistedOverrides / reapplyFromStorage) use
  // the correct storagePrefix — not the DEFAULT sentinel. See issue #111 H2 fix.
  for (const hook of slot.postConfigureHooks) {
    hook();
  }
}

/**
 * Register a callback to run once configurePanel has been called with the
 * host's config. Used by src/index.tsx to defer reapplyPersistedOverrides and
 * reapplyFromStorage until AFTER the host has supplied the correct storagePrefix.
 *
 * H2 fix for issue #111: module-init in index.tsx previously ran reapply
 * synchronously — before configurePanel — using DEFAULT_PANEL_CONFIG's prefix,
 * causing a default-prefix panel to mount and clobber host-prefix storage keys
 * on the first toggle when contaminated localStorage was present.
 *
 * Idempotent: if the same hook reference is registered twice, the second call
 * is a no-op. If configurePanel has already been called, the hook fires
 * immediately so late registrants don't miss the trigger.
 */
export function registerPostConfigureHook(hook: () => void): void {
  const slot = getSingletonSlot();
  if (slot.postConfigureHooks.includes(hook)) return; // idempotent on reference
  slot.postConfigureHooks.push(hook);
  // If configurePanel was already called, run the hook immediately so ordering
  // between index.tsx module-init and configurePanel is non-load-bearing.
  if (slot.configuredConfig !== null) {
    hook();
  }
}

/**
 * Read the active panel config. Returns the value passed to `configurePanel`
 * if one was supplied, else `DEFAULT_PANEL_CONFIG`.
 */
export function getPanelConfig(): PanelConfig {
  return getSingletonSlot().configuredConfig ?? DEFAULT_PANEL_CONFIG;
}

/**
 * Test-only: clear the singleton so unit tests can exercise different configs
 * in isolation.
 */
export function __resetPanelConfigForTests(): void {
  const slot = getSingletonSlot();
  slot.configuredConfig = null;
  slot.pendingColorPresets = null;
  slot.postConfigureHooks = [];
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
 */
export function setPanelColorPresets(presets: Record<string, ColorScheme>): void {
  const slot = getSingletonSlot();
  if (slot.configuredConfig === null) {
    slot.pendingColorPresets = presets;
    return;
  }
  slot.configuredConfig = { ...slot.configuredConfig, colorPresets: presets };
}
