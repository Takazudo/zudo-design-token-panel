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

import type { TokenManifest } from '../tokens/manifest';
import type { ColorScheme } from './color-schemes';
import type { ColorClusterDataConfig } from './cluster-config';
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
  /** Editable design tokens grouped per-tab. */
  tokens: TokenManifest;
  /**
   * Primary color-cluster data. Drives the color tab + the apply / clear /
   * load helpers in `state/tweak-state.ts`. Must be JSON-serializable.
   */
  colorCluster: ColorClusterDataConfig;
  /**
   * Optional secondary color-cluster data.
   *
   * Renders below the primary cluster on the Color tab and routes through
   * the apply / clear paths under its own CSS-var family. The host
   * controls participation:
   *
   *  - `undefined` (field omitted) — falls back to `null` (secondary
   *    cluster hidden / skipped).
   *  - `null` — explicit opt-out: the secondary palette section is hidden
   *    and the apply/clear paths skip the secondary cluster entirely.
   *  - A `ColorClusterDataConfig` object — host-supplied secondary cluster.
   *
   * Resolution helper: prefer `resolveSecondaryColorCluster()` over reading
   * the field directly so the `undefined → null` fallback is applied
   * consistently at every call site.
   */
  secondaryColorCluster?: ColorClusterDataConfig | null;
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
}

/**
 * Empty token manifest — used as the default fallback so the panel imports
 * cleanly without a `configurePanel(...)` call. Every tab renders an empty
 * state until the host configures real tokens.
 */
const EMPTY_TOKEN_MANIFEST: TokenManifest = {
  spacing: [],
  typography: [],
  size: [],
  color: [],
};

/**
 * Minimal stub color cluster — used as the default fallback. Carries an
 * empty palette and empty semantic / scheme registries so the color tab
 * shows an empty state. Hosts MUST override via
 * `configurePanel({ colorCluster })`.
 */
const STUB_COLOR_CLUSTER: ColorClusterDataConfig = {
  id: 'stub',
  label: 'STUB',
  paletteSize: 0,
  baseRoles: {},
  paletteCssVarTemplate: '--zudo-stub-p{n}',
  semanticDefaults: {},
  semanticCssNames: {},
  baseDefaults: {},
  defaultShikiTheme: 'dracula',
  colorSchemes: {},
  panelSettings: { colorScheme: '', colorMode: false },
};

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
  tokens: EMPTY_TOKEN_MANIFEST,
  colorCluster: STUB_COLOR_CLUSTER,
  // Default to null — secondary cluster is opt-in. Hosts that want one
  // pass an explicit cluster object via `configurePanel`.
  secondaryColorCluster: null,
  colorPresets: {},
  // No bundled apply endpoint / routing — hosts wire their own.
  applyEndpoint: undefined,
  applyRouting: undefined,
};

// ---------------------------------------------------------------------------
// Singleton storage
// ---------------------------------------------------------------------------

let configuredConfig: PanelConfig | null = null;
/**
 * Holding slot for a deferred preset map handed to `setPanelColorPresets`
 * before `configurePanel` has been called. Applied to the active config the
 * first time `getPanelConfig()` is read after configuration.
 */
let pendingColorPresets: Record<string, ColorScheme> | null = null;

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
  if (configuredConfig !== null) {
    if (structuralEqual(configuredConfig, config)) return;
    throw new Error(
      '[design-token-panel] configurePanel() was already called with different values. ' +
        'Configuration is one-shot per page lifecycle.',
    );
  }
  configuredConfig = pendingColorPresets
    ? { ...config, colorPresets: pendingColorPresets }
    : { ...config };
  pendingColorPresets = null;
}

/**
 * Read the active panel config. Returns the value passed to `configurePanel`
 * if one was supplied, else `DEFAULT_PANEL_CONFIG`.
 */
export function getPanelConfig(): PanelConfig {
  return configuredConfig ?? DEFAULT_PANEL_CONFIG;
}

/**
 * Test-only: clear the singleton so unit tests can exercise different configs
 * in isolation.
 */
export function __resetPanelConfigForTests(): void {
  configuredConfig = null;
  pendingColorPresets = null;
}

/**
 * Resolve the active secondary color cluster.
 *
 *  - Explicit `null` on the config — host opted out → returns `null`.
 *    Callers MUST treat this as "do not render / apply / clear secondary
 *    cluster".
 *  - Explicit cluster object — host-supplied secondary cluster → returned
 *    verbatim.
 *  - `undefined` (field omitted) — defaults to `null` (the package itself
 *    ships no bundled secondary cluster).
 */
export function resolveSecondaryColorCluster(
  cfg: PanelConfig = getPanelConfig(),
): ColorClusterDataConfig | null {
  if (cfg.secondaryColorCluster === null || cfg.secondaryColorCluster === undefined) return null;
  return cfg.secondaryColorCluster;
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

/** Legacy v1 key (Color-only flat state). Migrated into v2 on first load, then deleted. */
export function storageKey_stateV1(cfg: PanelConfig): string {
  return `${cfg.storagePrefix}-state`;
}

/** Mirror of the panel's `open` boolean (synchronous mount-time read). */
export function storageKey_open(cfg: PanelConfig): string {
  return `${cfg.storagePrefix}-open`;
}

/** Drag position `{ top, right }` so the panel reappears where the user left it. */
export function storageKey_position(cfg: PanelConfig): string {
  return `${cfg.storagePrefix}-position`;
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
  if (cfg.tokens === null || typeof cfg.tokens !== 'object' || Array.isArray(cfg.tokens)) {
    throw new Error('[design-token-panel] PanelConfig.tokens must be an object');
  }
  const tokens = cfg.tokens as Record<string, unknown>;
  for (const slice of ['spacing', 'typography', 'size', 'color'] as const) {
    if (!Array.isArray(tokens[slice])) {
      throw new Error(
        `[design-token-panel] PanelConfig.tokens.${slice} must be an array (got ${typeof tokens[
          slice
        ]})`,
      );
    }
  }
  if (
    cfg.colorCluster === null ||
    typeof cfg.colorCluster !== 'object' ||
    Array.isArray(cfg.colorCluster)
  ) {
    throw new Error('[design-token-panel] PanelConfig.colorCluster must be an object');
  }
  const cluster = cfg.colorCluster as Record<string, unknown>;
  if (typeof cluster.id !== 'string' || cluster.id.length === 0) {
    throw new Error('[design-token-panel] PanelConfig.colorCluster.id must be a non-empty string');
  }
  if (typeof cluster.paletteSize !== 'number' || cluster.paletteSize < 0) {
    throw new Error(
      '[design-token-panel] PanelConfig.colorCluster.paletteSize must be a non-negative number',
    );
  }
  if (typeof cluster.paletteCssVarTemplate !== 'string') {
    throw new Error(
      '[design-token-panel] PanelConfig.colorCluster.paletteCssVarTemplate must be a string',
    );
  }
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
  if (configuredConfig === null) {
    pendingColorPresets = presets;
    return;
  }
  configuredConfig = { ...configuredConfig, colorPresets: presets };
}
