/**
 * Tweak-state model for the design-token panel.
 *
 * This module owns:
 *  - The `ColorTweakState` shape (palette + base roles + semantic mappings + shikiTheme).
 *  - The unified `TweakState` envelope persisted under the v2 storage key.
 *  - Pure helpers for initialising state from a scheme, applying state to the
 *    DOM, and clearing applied inline styles.
 *
 * **Parameterisation — clusters come from `panelConfig`**
 *
 * The primary color cluster is read from the color TabConfig's colorExtras at
 * call time, so a host that calls `configurePanel({ ..., colorCluster })`
 * sees its own data flow through the apply / clear / load helpers without
 * further plumbing. The package itself ships zero baked-in cluster data —
 * a stub default lives only on `DEFAULT_PANEL_CONFIG` so the package imports
 * cleanly when no host has yet called `configurePanel`.
 *
 * The cluster shape is `ColorClusterDataConfig` (re-exported here as
 * `ColorClusterConfig` for backwards-compatibility). It is fully
 * JSON-serializable: the palette CSS-var name is materialised at use sites
 * by `resolvePaletteCssVar(cluster, i)`. Schemes and panel scheme settings
 * (`panelSettings.colorScheme` + `colorMode`) live on the cluster too, so a
 * host can swap the entire color story without editing
 * `color-scheme-utils.ts` or `color-schemes.ts`.
 *
 * The secondary cluster is an opt-in field on `PanelConfig`. When the host
 * does not configure one, the secondary slice is hidden / skipped end to end.
 *
 * **shikiTheme kept, applyShikiTheme stubbed**
 *
 * The `shikiTheme` field stays on the state + persist envelope so JSON
 * round-tripping with external exports is seamless; the UI hides it and
 * `applyShikiTheme` is a no-op. Removing the field would churn the serde
 * format for no real benefit. It stays *required* on the hydrated state —
 * constructors and hydrators always default it (from the scheme / cluster
 * default, or backfilled from defaults), and `TweakState` is re-exported, so
 * keeping it required avoids widening the public `state.color.shikiTheme` type.
 * Only the input `ColorScheme.shikiTheme` is optional (#342), so hosts may omit
 * it on their scheme maps.
 */

import type { ColorRef, ColorScheme } from '../config/color-schemes';
import type { TokenDef } from '../tokens/manifest';
import {
  type BaseRoleKey,
  type ColorClusterDataConfig,
  resolvePaletteCssVar,
} from '../config/cluster-config';
import type { SemanticValue } from '../tokens/tier-model';

// Re-export so callers that already import from `state/tweak-state` (the
// historical home of `ColorTweakState`) can reach the mapping-value type
// without a second import from `tokens/tier-model`. Defined in tier-model.ts
// to avoid a type-only import cycle with `config/cluster-config.ts` — see the
// doc comment on `SemanticValue` there.
export type { SemanticValue } from '../tokens/tier-model';
import {
  getPanelConfig,
  resolveSecondaryColorCluster,
  storageKey_density,
  storageKey_open,
  storageKey_position,
  storageKey_size,
  storageKey_stateV1,
  storageKey_stateV2,
  storageKey_stateV3,
  markColorSchemeWritten,
  clearColorSchemeOwnership,
  ownsColorScheme,
  type ApplySink,
  type PanelConfig,
} from '../config/panel-config';

// Re-export ApplySink so callers can import the type from the state module
// (same pattern used for TabOverrides).
export type { ApplySink } from '../config/panel-config';
import { resolvePrimaryColorCluster } from '../config/cluster-config';
import type { TabConfig } from '../tokens/tier-model';
import {
  type TabOverrides,
  emitTierItemCssValue,
  resolveTierItemValue,
  resolveRefToCssVar,
} from '../apply/tier-resolver';
import { cssToOklcha, type Oklcha } from '../utils/color-oklch';

// Re-export the cluster types under their historical names so existing call
// sites (build-apply-overrides.ts, apply-modal.tsx, tests) keep compiling.
// `ColorClusterConfig` is an alias for the JSON-serializable
// `ColorClusterDataConfig` — there is no separate runtime shape.
export type { BaseRoleKey, ColorClusterDataConfig } from '../config/cluster-config';
export { resolvePaletteCssVar } from '../config/cluster-config';
export type ColorClusterConfig = ColorClusterDataConfig;

// Re-export TabOverrides so callers that persist tab-level state can import the
// type from the state module (the canonical definition stays in tier-resolver
// to keep that pure module free of state-layer deps).
export type { TabOverrides } from '../apply/tier-resolver';

// ---------------------------------------------------------------------------
// Storage keys (derived from panelConfig at access time — see `panel-config.ts`)
// ---------------------------------------------------------------------------

/**
 * - `getStorageKeyV1()` is the original flat-state format (Color-only).
 * - `getStorageKeyV2()` is the new namespaced format (`{ color: ..., ... }`)
 *   that lets other tabs (Spacing, Typography, Size) add their own sub-states
 *   without colliding with Color.
 *
 * On first load at v2 we migrate v1 → v2, write the new key, and delete v1.
 *
 * **Lazy derivation**
 *
 * Each helper reads `getPanelConfig()` on every call by default so a
 * `configurePanel` call that lands *after* this module is imported still
 * influences the keys the panel hits. Capturing the values at module load
 * would freeze them before the host has a chance to configure.
 *
 * **Per-instance derivation (multi-instance, #353 Z1)**
 *
 * Each accessor takes an OPTIONAL `cfg: PanelConfig`. Passing it derives the
 * key for THAT instance instead of the default (active) instance — the seam
 * Z2/Z3 use to scope storage, mount, and apply to a specific panel instance.
 * Omitting it preserves the historical single-panel behaviour (resolve the
 * default instance via `getPanelConfig()`). Storage keys are a pure function of
 * `cfg.storagePrefix`, so two instances with distinct prefixes derive fully
 * independent keys.
 */
export function getStorageKeyV1(cfg: PanelConfig = getPanelConfig()): string {
  return storageKey_stateV1(cfg);
}

export function getStorageKeyV2(cfg: PanelConfig = getPanelConfig()): string {
  return storageKey_stateV2(cfg);
}

export function getStorageKeyV3(cfg: PanelConfig = getPanelConfig()): string {
  return storageKey_stateV3(cfg);
}

export function getOpenKey(cfg: PanelConfig = getPanelConfig()): string {
  return storageKey_open(cfg);
}

export function getPositionKey(cfg: PanelConfig = getPanelConfig()): string {
  return storageKey_position(cfg);
}

export function getSizeKey(cfg: PanelConfig = getPanelConfig()): string {
  return storageKey_size(cfg);
}

export function getDensityKey(cfg: PanelConfig = getPanelConfig()): string {
  return storageKey_density(cfg);
}

// ---------------------------------------------------------------------------
// Panel position
// ---------------------------------------------------------------------------

export interface PanelPosition {
  top: number;
  left: number;
}

/**
 * SSR-safe static fallback. Kept exported so hosts that read the constant
 * during SSR (where `window` is undefined) still get a deterministic value.
 * Runtime callers should prefer `defaultPosition()`, which returns a
 * viewport-centered position when `window` is available.
 */
export const DEFAULT_POSITION: PanelPosition = { top: 60, left: 20 };

/**
 * Compute a viewport-centered default panel position for first-open behaviour.
 *
 * The panel CSS-sizes itself up to 1200×800 but caps at 80% of the viewport,
 * so we mirror the same min/0.8x rule here. The resulting `top` / `left`
 * place the panel at the geometric center of the viewport.
 *
 * Falls back to the static `DEFAULT_POSITION` when `window` is undefined
 * (e.g. SSR / node test setup without jsdom). Real browsers + jsdom-backed
 * tests get the centered position.
 */
export function defaultPosition(): PanelPosition {
  if (typeof window === 'undefined') return DEFAULT_POSITION;
  const panelW = Math.min(1200, 0.8 * window.innerWidth);
  const panelH = Math.min(800, 0.8 * window.innerHeight);
  const top = Math.max(0, Math.round((window.innerHeight - panelH) / 2));
  const left = Math.max(0, Math.round((window.innerWidth - panelW) / 2));
  return { top, left };
}

export function loadPosition(cfg?: PanelConfig): PanelPosition {
  try {
    const saved = localStorage.getItem(getPositionKey(cfg));
    if (saved) {
      const parsed = JSON.parse(saved) as PanelPosition;
      // Mirror hydratePanelPosition: reject Infinity/NaN from payloads like
      // `1e999` which pass typeof === 'number' but are not finite coordinates.
      if (
        typeof parsed.top === 'number' &&
        typeof parsed.left === 'number' &&
        Number.isFinite(parsed.top) &&
        Number.isFinite(parsed.left)
      ) {
        return parsed;
      }
    }
  } catch {
    /* ignore */
  }
  return defaultPosition();
}

export function savePosition(pos: PanelPosition, cfg?: PanelConfig) {
  try {
    localStorage.setItem(getPositionKey(cfg), JSON.stringify(pos));
  } catch {
    /* ignore */
  }
}

/** Keep at least VISIBLE_MIN px of the panel on-screen so the user can grab it back. */
export const VISIBLE_MIN = 60;

// ---------------------------------------------------------------------------
// Panel size (user-resizable)
// ---------------------------------------------------------------------------

export interface PanelSize {
  width: number;
  height: number;
}

/** Minimum panel size — small enough to feel snappy, large enough to keep the header + tabbar usable. */
export const MIN_PANEL_WIDTH = 320;
export const MIN_PANEL_HEIGHT = 240;

/** Hard upper caps so the panel never grows past sensible bounds even before viewport clamping. */
export const MAX_PANEL_WIDTH = 1600;
export const MAX_PANEL_HEIGHT = 1200;

/**
 * SSR-safe static fallback. Matches the historical CSS expression
 * `min(1200, 0.8 * vw)` × `min(800, 0.8 * vh)` evaluated for a 1024×768
 * viewport so the package stays usable when imported during SSR (no
 * window). Runtime callers should prefer `defaultSize()`.
 */
export const DEFAULT_SIZE: PanelSize = { width: 1024 * 0.8, height: 768 * 0.8 };

/**
 * Compute the first-open panel size in px. Mirrors the historical CSS
 * `min(1200, 0.8 * vw)` × `min(800, 0.8 * vh)` rule so existing users
 * experience the same default size, then clamps through `clampSize` so the
 * result respects the MIN_PANEL_* floor and the viewport cap. The floor only
 * bites on phone-width viewports (e.g. 375px → 0.8*375 = 300, raised to the
 * 320 min); on normal viewports the clamp is a no-op.
 */
export function defaultSize(): PanelSize {
  if (typeof window === 'undefined') return DEFAULT_SIZE;
  return clampSize(
    Math.min(1200, 0.8 * window.innerWidth),
    Math.min(800, 0.8 * window.innerHeight),
  );
}

/** Margin kept around the panel when clamping size against the viewport. */
const SIZE_VIEWPORT_MARGIN = 32;

/**
 * Clamp a `{ width, height }` against the configured min caps and the current
 * viewport. The viewport upper bound prevents a panel saved on a 4K monitor
 * from rendering off-screen when reopened on a 1080p laptop.
 */
export function clampSize(width: number, height: number): PanelSize {
  const vw = typeof window !== 'undefined' ? window.innerWidth : MAX_PANEL_WIDTH;
  const vh = typeof window !== 'undefined' ? window.innerHeight : MAX_PANEL_HEIGHT;
  const maxW = Math.max(MIN_PANEL_WIDTH, Math.min(MAX_PANEL_WIDTH, vw - SIZE_VIEWPORT_MARGIN));
  const maxH = Math.max(MIN_PANEL_HEIGHT, Math.min(MAX_PANEL_HEIGHT, vh - SIZE_VIEWPORT_MARGIN));
  return {
    width: Math.max(MIN_PANEL_WIDTH, Math.min(width, maxW)),
    height: Math.max(MIN_PANEL_HEIGHT, Math.min(height, maxH)),
  };
}

export function loadSize(cfg?: PanelConfig): PanelSize {
  try {
    const saved = localStorage.getItem(getSizeKey(cfg));
    if (saved) {
      const parsed = JSON.parse(saved) as PanelSize;
      if (
        typeof parsed.width === 'number' &&
        typeof parsed.height === 'number' &&
        Number.isFinite(parsed.width) &&
        Number.isFinite(parsed.height)
      ) {
        return clampSize(parsed.width, parsed.height);
      }
    }
  } catch {
    /* ignore */
  }
  return defaultSize();
}

export function saveSize(size: PanelSize, cfg?: PanelConfig) {
  try {
    localStorage.setItem(getSizeKey(cfg), JSON.stringify(size));
  } catch {
    /* ignore */
  }
}

// ---------------------------------------------------------------------------
// Tab-grid density
// ---------------------------------------------------------------------------

/**
 * User-chosen tab-grid density. Three discrete stops exposed as integers so a
 * native `<input type="range">` slider can read/write directly:
 *
 *   0 = dense  — small min-card width, more columns fit on a wide panel
 *   1 = cozy   — the auto-fit minmax default
 *   2 = wide   — forces one column so long var names are fully readable
 *
 * Mapped to a CSS `min` length by `densityToGridMin()`; the resolved length is
 * exposed on the panel shell via the `--tokenpanel-grid-min` custom property
 * and consumed by `.tokenpanel-tab-grid` / `.tokenpanel-tab-advanced-grid`.
 */
export type PanelDensity = 0 | 1 | 2;

export const DEFAULT_DENSITY: PanelDensity = 1;

export function densityToGridMin(density: PanelDensity): string {
  if (density === 0) return '192px';
  if (density === 2) return '100%';
  return '288px';
}

export function loadDensity(cfg?: PanelConfig): PanelDensity {
  try {
    const saved = localStorage.getItem(getDensityKey(cfg));
    if (saved === '0' || saved === '1' || saved === '2') {
      return Number(saved) as PanelDensity;
    }
  } catch {
    /* ignore */
  }
  return DEFAULT_DENSITY;
}

export function saveDensity(density: PanelDensity, cfg?: PanelConfig) {
  try {
    localStorage.setItem(getDensityKey(cfg), String(density));
  } catch {
    /* ignore */
  }
}

// `_panelHeight` is currently unused — see B2 fix note below. Kept on the
// signature (with the underscore prefix that TypeScript treats as
// intentionally unused per `noUnusedParameters`) so callers (panel.tsx drag
// + resize handlers) can keep passing the measured offsetHeight without
// churn, and so a future "tall panel" carve-out has the data on hand.
export function clampPosition(
  top: number,
  left: number,
  panelWidth: number,
  _panelHeight: number,
): PanelPosition {
  // Horizontal: allow panel to extend past left/right edges, keep VISIBLE_MIN
  // px of grip visible so the user can drag it back. The header spans the
  // full panel width, so any leftover horizontal slice contains a draggable
  // strip of the header.
  //
  // Top-left origin: `left` is the offset from the viewport's left edge to
  // the panel's left edge. minLeft pushes the panel past the LEFT edge
  // (only VISIBLE_MIN of the right-side header strip remains visible);
  // maxLeft pushes the panel past the RIGHT edge.
  const minLeftRaw = -(panelWidth - VISIBLE_MIN);
  const maxLeftRaw = window.innerWidth - VISIBLE_MIN;
  // Vertical: ASYMMETRIC with the horizontal axis on purpose.
  //
  // The drag handle is the panel header (`panel.tsx` attaches `onMouseDown`
  // to `.tokenpanel-header`), which sits at the TOP of the panel. If we
  // mirrored the horizontal lower bound — `-(panelHeight - VISIBLE_MIN)` —
  // an upward drag would leave only the footer visible and the user could
  // no longer grab the header to drag the panel back. The pre-fix code
  // dodged this by hard-coding `-(VISIBLE_MIN / 2)`; a symmetric attempt
  // would reintroduce that regression.
  //
  // The panel is also CSS-constrained to fit the viewport
  // (`maxHeight: calc(100vh - 32px)` in panel.tsx), so we don't need the
  // "scroll content into view" carve-out that a taller-than-viewport panel
  // would otherwise need. `panelHeight` is therefore unused on the lower
  // bound today.
  const minTopRaw = -(VISIBLE_MIN / 2);
  const maxTopRaw = window.innerHeight - VISIBLE_MIN;
  // guard against narrow / degenerate viewports
  // where the computed maximum would be lower than the minimum (innerHeight
  // < VISIBLE_MIN/2). When that happens, collapse maxTop to minTop so the
  // resulting Math.max/Math.min chain still produces a deterministic value
  // instead of relying on argument order.
  const maxTop = Math.max(maxTopRaw, minTopRaw);
  const maxLeft = Math.max(maxLeftRaw, minLeftRaw);
  return {
    top: Math.max(minTopRaw, Math.min(top, maxTop)),
    left: Math.max(minLeftRaw, Math.min(left, maxLeft)),
  };
}

// ---------------------------------------------------------------------------
// Shiki — stubbed
// ---------------------------------------------------------------------------

/**
 * Upstream re-highlights every `<pre>` on the page when the Shiki theme
 * changes. This package does not use Shiki — we keep the function for
 * API shape + persisted-state round-tripping, but the body is a no-op.
 */
export async function applyShikiTheme(_themeName: string): Promise<void> {
  // No Shiki integration here; preserved as a no-op for persist-envelope
  // round-trip compatibility with zudo-doc exports.
}

/** Theme list kept identical to upstream so imported state keeps its shikiTheme. */
export const SHIKI_THEMES = [
  'ayu-light',
  'catppuccin-latte',
  'catppuccin-mocha',
  'dracula',
  'everforest-dark',
  'everforest-light',
  'github-dark',
  'github-dark-dimmed',
  'github-light',
  'gruvbox-dark-medium',
  'gruvbox-light-medium',
  'kanagawa-dragon',
  'kanagawa-wave',
  'material-theme-darker',
  'material-theme-lighter',
  'material-theme-ocean',
  'min-dark',
  'min-light',
  'monokai',
  'night-owl',
  'nord',
  'one-dark-pro',
  'one-light',
  'poimandres',
  'rose-pine',
  'rose-pine-dawn',
  'rose-pine-moon',
  'snazzy-light',
  'solarized-dark',
  'solarized-light',
  'tokyo-night',
  'vesper',
  'vitesse-dark',
  'vitesse-light',
];

// ---------------------------------------------------------------------------
// Core types
// ---------------------------------------------------------------------------

/**
 * ColorTweakState — palette + base roles + semantic mappings. Shape is
 * identical to upstream so persisted JSON can round-trip across projects.
 *
 * The state is palette-size agnostic (just `string[]`); the cluster config
 * below supplies the expected length for validation + defaults.
 */
export interface ColorTweakState {
  palette: string[];
  background: number;
  foreground: number;
  cursor: number;
  selectionBg: number;
  selectionFg: number;
  /**
   * Semantic token name → mapping. Widened from `Record<string, number | 'bg'
   * | 'fg'>` to `Record<string, SemanticValue>` (#459 S1). This is additive
   * for readers of the type (every legacy value is still a valid
   * `SemanticValue`), but it BREAKS any exhaustive `switch`/equality check
   * written against the old narrow union — callers that pattern-match on a
   * mapping value must now also handle the new `{ literal }` / `{ ref }`
   * object variants (see `isIndexMapping` / `isLiteralMapping` /
   * `isPerModeLiteral` / `isRefMapping` below). `resolveMapping` (exported)
   * still only resolves the legacy `number | 'bg' | 'fg'` shape — resolving
   * the new variants is downstream work (#467/#469).
   */
  semanticMappings: Record<string, SemanticValue>;
  shikiTheme: string;
}

// ---------------------------------------------------------------------------
// SemanticValue narrowing helpers
// ---------------------------------------------------------------------------

/** True when `v` is a legacy index-style mapping (palette index or bg/fg alias). */
export function isIndexMapping(v: SemanticValue): v is number | 'bg' | 'fg' {
  return typeof v === 'number' || v === 'bg' || v === 'fg';
}

/** True when `v` is either literal-color variant (plain string or light/dark pair). */
export function isLiteralMapping(
  v: SemanticValue,
): v is { literal: string } | { literal: { light: string; dark: string } } {
  return typeof v === 'object' && v !== null && 'literal' in v;
}

/** True when `v` is specifically the light/dark literal-color variant. */
export function isPerModeLiteral(
  v: SemanticValue,
): v is { literal: { light: string; dark: string } } {
  return isLiteralMapping(v) && typeof v.literal === 'object' && v.literal !== null;
}

/** True when `v` is a cross-tab/tier ramp-item reference. */
export function isRefMapping(
  v: SemanticValue,
): v is { ref: { tab?: string; tier: string; item: string } } {
  return typeof v === 'object' && v !== null && 'ref' in v;
}

/**
 * Per-token override map. Keys are `TokenDef.id` (e.g. `hsp-sm`); values are
 * raw CSS length strings (e.g. `0.75rem`). Only overridden tokens appear in
 * the map — absent keys mean "use the stylesheet default".
 */
export type TokenOverrides = Record<string, string>;

/**
 * Unified persist envelope. Each tab owns its own sub-state so they can
 * evolve independently.
 *
 * Panel position and size are stored in SEPARATE localStorage keys
 * (`-position` / `-size`) and are NOT part of this envelope. The panel reads
 * them via `loadPosition` / `loadSize` on mount; drags / resizes write them
 * directly via `savePosition` / `saveSize`.
 *
 * `secondary` carries a second (optional) color cluster — absent until a host
 * opts in.
 *
 * `tabs` is the v3 extension: a tab-keyed map of `TabOverrides` for host-coined
 * generic tabs that use the tier model. The existing `color`/`spacing`/
 * `typography`/`size` slices are retained for internal back-compat until Wave 5
 * migrates those dedicated tab components to consume `TabConfig.tiers` directly.
 */
export interface TweakState {
  color: ColorTweakState;
  spacing: TokenOverrides;
  typography: TokenOverrides;
  size: TokenOverrides;
  secondary?: ColorTweakState;
  /** Generic tab overrides keyed by tab id. Added in v3 envelope. */
  tabs?: Record<string, TabOverrides>;
}

/** Produce an empty overrides map — `TweakState` default for new tabs. */
export function emptyOverrides(): TokenOverrides {
  return {};
}

// ---------------------------------------------------------------------------
// Color cluster config — parameterises the zd-specific upstream code
// ---------------------------------------------------------------------------

/**
 * Cluster config used to describe one independent color system. The shape is
 * `ColorClusterDataConfig` (re-exported above as `ColorClusterConfig` for
 * backwards-compatibility) — a fully JSON-serializable bundle of palette
 * template + base-role set + semantic tables + scheme registry + panel scheme
 * settings.
 *
 * Primary cluster — derived from the host's color TabConfig (tab.id 'color')
 * via `getActivePrimaryCluster()`. The package ships ZERO baked-in cluster
 * data; hosts MUST configure a color tab with `colorExtras` to provide one.
 */

/**
 * A minimal stub cluster used as fallback when no color tab is configured
 * (default empty config scenario). The stub carries zero palette slots so the
 * color tab shows an empty state.
 */
const STUB_CLUSTER: ColorClusterDataConfig = {
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
 * Resolve the active primary color cluster from the panel config's tabs.
 * Returns the stub cluster when no color tab is configured.
 */
export function getActivePrimaryCluster(
  cfg = getPanelConfig(),
): ColorClusterDataConfig {
  return resolvePrimaryColorCluster(cfg.tabs) ?? STUB_CLUSTER;
}

/**
 * Produce a fresh `ColorTweakState` for a secondary color cluster.
 * Generalises the no-scheme seed path: the palette length, semantic
 * defaults, and shikiTheme all derive from the supplied cluster, so any
 * host-supplied secondary cluster (any paletteSize, any semantic
 * vocabulary) gets a deterministic neutral grayscale seed when the cluster
 * does not ship its own scheme registry.
 *
 * Palette seed strategy:
 *  - Synthesise a deterministic neutral grayscale palette of
 *    `cluster.paletteSize` slots. Index 0 → black, last → white, middle
 *    slots interpolate. Functional but visually flat; hosts wanting a
 *    designed seed should ship a scheme registry on the cluster and call
 *    `initColorFromScheme(cluster)` instead.
 *  - A cluster with `paletteSize: 0` (a lone `semantic: true` tier with no
 *    palette sibling, #458/#466) seeds an EMPTY palette — there is nothing
 *    to ramp. Forcing a 1-slot grayscale floor here produced a phantom
 *    `--zudo-stub-p0` swatch/token with no backing tier; see #466.
 *
 * The base-role indices are kept on the state shape for envelope-round-trip
 * compatibility but are inert — `applyColorState` only writes a base role
 * when the cluster declares the corresponding `baseRoles` entry.
 */
export function initSecondaryDefaults(cluster: ColorClusterDataConfig): ColorTweakState {
  // Deterministic grayscale ramp. Index 0 → black, last → white, middle
  // slots interpolate. Functional but visually flat; hosts wanting a
  // designed seed should ship a scheme registry on the cluster.
  // `paletteSize: 0` seeds an empty palette rather than flooring to 1 slot
  // (no Math.max(1, ...) floor) — see #466.
  const size = cluster.paletteSize;
  const palette: string[] = Array.from({ length: size }, (_, i) => {
    if (size === 1) return '#808080';
    const v = Math.round((i / (size - 1)) * 255);
    const hex = v.toString(16).padStart(2, '0');
    return `#${hex}${hex}${hex}`;
  });
  return {
    palette,
    background: cluster.baseDefaults.background ?? 0,
    foreground: cluster.baseDefaults.foreground ?? 0,
    cursor: cluster.baseDefaults.cursor ?? 0,
    selectionBg: cluster.baseDefaults.selectionBg ?? 0,
    selectionFg: cluster.baseDefaults.selectionFg ?? 0,
    semanticMappings: { ...cluster.semanticDefaults },
    shikiTheme: cluster.defaultShikiTheme,
  };
}

/**
 * Convenience helper used by `panel.tsx` and tests: seed a fresh secondary
 * `ColorTweakState` from the panel config's secondary cluster.
 * Returns `undefined` when the host opted out of the secondary cluster
 * (`secondaryColorCluster: null` or omitted).
 *
 * `cfg` scopes the secondary-cluster lookup to a specific panel instance
 * (multi-instance, #357). Omitting it resolves the default instance, preserving
 * the single-panel path.
 */
export function initSecondaryFromConfig(cfg?: PanelConfig): ColorTweakState | undefined {
  const secondary = resolveSecondaryColorCluster(cfg);
  return secondary ? initSecondaryDefaults(secondary) : undefined;
}

// ---------------------------------------------------------------------------
// Color helpers
// ---------------------------------------------------------------------------

/**
 * Feature-detect whether the canvas 2D context correctly implements fillStyle.
 * In JSDOM the setter is a no-op, so the value stays as the initial '#000000',
 * causing cssColorToHex to silently return black for every colour. We check
 * once at module load and skip the canvas path when it is broken.
 */
function _canvasCtxSupported(): boolean {
  try {
    const ctx = document.createElement('canvas').getContext('2d');
    if (!ctx) return false;
    ctx.fillStyle = '#ffffff';
    return ctx.fillStyle === '#ffffff';
  } catch {
    return false;
  }
}
const _canvasAvailable = _canvasCtxSupported();

/** Parse an rgb()/rgba() string to a hex colour, or return null on failure.
 * Returns 8-digit hex when an explicit alpha < 1 is present; 6-digit otherwise.
 */
function _rgbStringToHex(color: string): string | null {
  const match = color.match(/^rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)(?:\s*,\s*([\d.]+))?/);
  if (!match) return null;
  const r = parseInt(match[1], 10);
  const g = parseInt(match[2], 10);
  const b = parseInt(match[3], 10);
  const base6 = `#${((1 << 24) | (r << 16) | (g << 8) | b).toString(16).slice(1)}`;
  if (match[4] !== undefined) {
    const a = parseFloat(match[4]);
    if (a < 1) {
      const aa = Math.round(a * 255).toString(16).padStart(2, '0');
      return `${base6}${aa}`;
    }
  }
  return base6;
}

/** Serialize sRGB byte channels to hex — 8 digits when alpha < 255, else 6. */
function _rgbaBytesToHex(r: number, g: number, b: number, a: number): string {
  const hex2 = (n: number) => n.toString(16).padStart(2, '0');
  const base6 = `#${hex2(r)}${hex2(g)}${hex2(b)}`;
  return a < 255 ? `${base6}${hex2(a)}` : base6;
}

/** Convert any CSS color to hex using a canvas (cached context). */
let _canvasCtx: CanvasRenderingContext2D | null = null;
export function cssColorToHex(color: string): string {
  if (!color || color === 'initial' || color === 'inherit') return '#000000';
  const trimmed = color.trim();
  if (/^#[0-9a-fA-F]{6}$/.test(trimmed)) return trimmed;
  if (/^#[0-9a-fA-F]{8}$/.test(trimmed)) return trimmed;
  if (/^#[0-9a-fA-F]{3}$/.test(trimmed)) {
    return `#${trimmed[1]}${trimmed[1]}${trimmed[2]}${trimmed[2]}${trimmed[3]}${trimmed[3]}`;
  }
  if (/^#[0-9a-fA-F]{4}$/.test(trimmed)) {
    return `#${trimmed[1]}${trimmed[1]}${trimmed[2]}${trimmed[2]}${trimmed[3]}${trimmed[3]}${trimmed[4]}${trimmed[4]}`;
  }
  // Manual rgb()/rgba() fallback — handles the most common non-hex CSS form
  // and is always available (including JSDOM where the canvas path is broken).
  const rgbHex = _rgbStringToHex(trimmed);
  if (rgbHex) return rgbHex;

  // Canvas path: only used in real browsers where fillStyle actually works.
  if (!_canvasAvailable) return '#000000';
  try {
    if (!_canvasCtx) _canvasCtx = document.createElement('canvas').getContext('2d');
    if (!_canvasCtx) return '#000000';
    // Read the resolved color from pixel data, NOT from the fillStyle string.
    // Modern browsers round-trip CSS Color 4 inputs (oklch, oklab, lab, lch,
    // color()) back through the fillStyle *getter* in their own syntax — e.g.
    // `oklch(0.65 0.2 45)` — which matches neither the `#` branch nor the
    // rgb() parser, so the old string-readback path collapsed every such
    // color to '#000000'. Painting one pixel and sampling it via getImageData
    // yields resolved sRGB bytes regardless of the getter's serialization.
    // Seed fillStyle with a known value first: an invalid `trimmed` is
    // silently ignored by the setter, so this makes invalid input resolve
    // deterministically to black instead of leaking a prior cached color.
    _canvasCtx.fillStyle = '#000000';
    _canvasCtx.fillStyle = trimmed;
    _canvasCtx.clearRect(0, 0, 1, 1);
    _canvasCtx.fillRect(0, 0, 1, 1);
    const [r, g, b, a] = _canvasCtx.getImageData(0, 0, 1, 1).data;
    return _rgbaBytesToHex(r, g, b, a);
  } catch {
    return '#000000';
  }
}

/**
 * Write a single CSS custom property to `document.documentElement`.
 *
 * The sink-aware write path bypasses this helper entirely: sink callers
 * collect all pairs into a batch and call `sink.apply(pairs)` directly.
 * This helper is used only by the default (no-sink) path in the `else`
 * branches of `applyColorState`, `applyTabOverridesFlat`, etc.
 */
export function setCssVar(name: string, value: string) {
  document.documentElement.style.setProperty(name, value);
}

/**
 * Compare two canonical `Oklcha` values for equality within a per-channel
 * epsilon. Alpha is INCLUDED so two entries with the same L/C/H but different
 * alpha are treated as distinct. Hue uses a CIRCULAR delta so 359.999° and
 * 0.001° are recognised as adjacent.
 *
 * Epsilons (against `cssToOklcha`'s internal scale — l/a on 0–100, c native,
 * h in degrees): l ≤ 1e-3, c ≤ 1e-5, h ≤ 1e-3°, a ≤ 1e-3. These only absorb
 * serialization/float noise — genuinely different colors differ by far more.
 */
function oklchaApproxEqual(a: Oklcha, b: Oklcha): boolean {
  let dh = Math.abs(a.h - b.h) % 360;
  if (dh > 180) dh = 360 - dh;
  return (
    Math.abs(a.l - b.l) <= 1e-3 &&
    Math.abs(a.c - b.c) <= 1e-5 &&
    dh <= 1e-3 &&
    Math.abs(a.a - b.a) <= 1e-3
  );
}

/**
 * Resolve a `ColorRef` to a palette index. If it's already a number, use it.
 * If it's a string, find an exact palette match or the nearest color by RGB
 * distance. `fallback` is returned only when `ref` is undefined.
 *
 * Match order (format-tolerant + alpha-aware):
 *  (a) exact raw-string match — preserves byte-for-byte `oklch()`/hex refs
 *      without any lossy normalization (palette refs are usually canonical);
 *  (b) OKLCH-aware match — when the ref AND a palette entry both parse as CSS
 *      Color 4 `oklch()`, compare canonical `cssToOklcha` forms with a
 *      per-channel epsilon (alpha included). This keeps a wide-gamut oklch ref
 *      from collapsing to '#000000' under the hex path (jsdom / engines whose
 *      canvas can't parse oklch) and keeps a same-L/C/H-different-alpha ref
 *      bound to the correct slot;
 *  (c) hex fallback — normalize ref + palette to canonical hex for an exact
 *      match, else nearest color by base-RGB distance. This is the path for
 *      genuine hex/rgb refs; the nearest-distance step intentionally drops
 *      alpha, so the exact matches above must run first when alpha matters.
 */
export function colorRefToIndex(
  ref: ColorRef | undefined,
  palette: string[],
  fallback: number,
): number {
  if (ref === undefined) return fallback;
  if (typeof ref === 'number') return ref;
  // (a) Exact raw-string match first.
  const rawIdx = palette.indexOf(ref);
  if (rawIdx >= 0) return rawIdx;
  // (b) OKLCH-aware match — only when both sides parse as oklch().
  const refOklch = cssToOklcha(ref);
  if (refOklch) {
    for (let i = 0; i < palette.length; i++) {
      const pOklch = cssToOklcha(palette[i]);
      if (pOklch && oklchaApproxEqual(refOklch, pOklch)) return i;
    }
  }
  // (c) Hex fallback for genuine hex/rgb refs.
  const refHex = cssColorToHex(ref);
  const normalized: string[] = palette.map((p) => cssColorToHex(p));
  const normIdx = normalized.indexOf(refHex);
  if (normIdx >= 0) return normIdx;
  // No exact match — find nearest palette color by RGB distance.
  // Alpha is intentionally dropped here (distance is base-RGB only) so it is
  // the caller's responsibility to ensure exact-match succeeds first when
  // alpha-precision matters.
  const refRgb = hexToRgb(refHex);
  let bestIdx = fallback;
  let bestDist = Infinity;
  for (let i = 0; i < normalized.length; i++) {
    const pRgb = hexToRgb(normalized[i]);
    const dist = (refRgb.r - pRgb.r) ** 2 + (refRgb.g - pRgb.g) ** 2 + (refRgb.b - pRgb.b) ** 2;
    if (dist < bestDist) {
      bestDist = dist;
      bestIdx = i;
    }
  }
  return bestIdx;
}

/** Parse a hex color string to RGB(A) components. When the hex is 8 digits,
 * `aa` is the parsed alpha byte (0–255); otherwise `aa` defaults to 255.
 */
function hexToRgb(hex: string): { r: number; g: number; b: number; aa: number } {
  const h = hex.replace('#', '');
  return {
    r: parseInt(h.substring(0, 2), 16) || 0,
    g: parseInt(h.substring(2, 4), 16) || 0,
    b: parseInt(h.substring(4, 6), 16) || 0,
    aa: h.length >= 8 ? (parseInt(h.substring(6, 8), 16) || 0) : 255,
  };
}

// ---------------------------------------------------------------------------
// Scheme → state
// ---------------------------------------------------------------------------

/**
 * Resolve the active scheme name for the given cluster, considering
 * light/dark mode. Reads `panelSettings` from the cluster so a
 * host-supplied cluster can declare its own scheme + light/dark pairing
 * without editing the panel package.
 *
 * When `cfg` is supplied AND it has an `applySink`, this instance is a
 * "sink instance" — it does NOT read the host's `data-theme` attribute
 * (which belongs to the host's document, not to this instance). Instead it
 * falls back to the panel's own `colorScheme` setting so it picks the
 * correct default scheme and a scheme switch touches only its own overrides.
 */
export function getActiveSchemeName(
  cluster: ColorClusterDataConfig = getActivePrimaryCluster(),
  cfg?: PanelConfig,
): string {
  const settings = cluster.panelSettings;
  // Sink instances must NOT read the host document's data-theme — the host
  // theme attribute targets the host's own :root, which is irrelevant to a
  // panel routed to a different sink target. Fall back to the static
  // colorScheme declared in the cluster's panelSettings instead.
  const isSinkInstance = cfg !== undefined && cfg.applySink !== undefined;
  if (settings.colorMode && !isSinkInstance) {
    const theme = document.documentElement.getAttribute('data-theme');
    if (theme === 'light') return settings.colorMode.lightScheme;
    if (theme === 'dark') return settings.colorMode.darkScheme;
  }
  return settings.colorScheme;
}

/**
 * Initialise a `ColorTweakState` from the active color scheme for the given
 * cluster. Defaults to the host's primary cluster (derived from the color
 * TabConfig).
 *
 * Reads the scheme registry from `cluster.colorSchemes`. Clusters that ship
 * no schemes should not call this directly — they use
 * `initSecondaryDefaults(cluster)` instead because there is no scheme to
 * seed from.
 *
 * @param cfg - The panel instance config. When provided and the config has
 *   `applySink`, the host's `data-theme` attribute is ignored and the scheme
 *   seed comes from `cluster.panelSettings.colorScheme` instead (sink-instance
 *   guard). Omitting it silently falls through to reading `data-theme`, which
 *   is the correct behavior for non-sink instances but wrong for sinks.
 */
export function initColorFromScheme(
  cluster: ColorClusterDataConfig = getActivePrimaryCluster(),
  cfg?: PanelConfig,
): ColorTweakState {
  const schemes = cluster.colorSchemes;
  // No schemes → fall back to the deterministic neutral seed. This keeps the
  // package boot-able when no host has called `configurePanel` (the bundled
  // stub cluster ships zero schemes), and it matches the documented contract
  // for cluster-shaped data without a scheme registry.
  if (Object.keys(schemes).length === 0) {
    return initSecondaryDefaults(cluster);
  }
  // Pass cfg so getActiveSchemeName can detect sink instances and avoid reading
  // the host document's data-theme (which belongs to the host, not this panel).
  const schemeName = getActiveSchemeName(cluster, cfg);
  const scheme = schemes[schemeName] ?? Object.values(schemes)[0];
  return initColorFromSchemeData(scheme, cluster);
}

/**
 * Palette entry sanitiser. Raw `oklch(...)` values are preserved verbatim so
 * wide-gamut chroma survives (and they never touch the canvas → no '#000000'
 * under jsdom / engines whose 2D canvas can't parse oklch). Every NON-oklch entry
 * goes through cssColorToHex() — the exact pre-OKLCH behaviour — which
 * canonicalises valid hex/rgb and, crucially, turns an unparseable string into a
 * safe '#000000' rather than leaking it into a CSS custom property. Without this,
 * a bundled scheme's stray non-color entry (e.g. `Default Dark`'s slot-9 `"18"`,
 * referenced by `background: 9`) would reach the apply path verbatim.
 *
 * Exported so the serde import path (design-token-serde.ts) can apply the same
 * sanitiser to imported palette values — commit 8d54e07 hardened seeding; this
 * export closes the equivalent gap in the JSON-import path.
 */
export function normalizeSchemePaletteEntry(value: string): string {
  return cssToOklcha(value) ? value : cssColorToHex(value);
}

export function initColorFromSchemeData(
  scheme: ColorScheme,
  cluster: ColorClusterDataConfig = getActivePrimaryCluster(),
): ColorTweakState {
  // A palette-less cluster (paletteSize: 0, a lone `semantic: true` tier with
  // no palette sibling, #458/#466) has nothing for a scheme/preset to seed:
  // schemes only carry a 16-slot palette + index/string refs, never the
  // `{ literal }` / `{ ref }` / per-mode SemanticValue shapes such a tier's
  // rows hold. Loading one anyway previously reseeded `scheme.palette` wholesale
  // (phantom `--zudo-stub-p*` swatches, since paletteCssVarTemplate falls back
  // to the stub template with no palette tier to name slots after) and
  // collapsed every non-numeric semanticDefault to palette index 0 (below),
  // destroying literal/ref rows. Treat the load as a no-op instead — identical
  // to the cluster's own no-scheme cold seed (#488).
  if (cluster.paletteSize === 0) {
    console.warn(
      `[tweak] Scheme/preset load ignored for palette-less cluster "${cluster.id}" ` +
        '(paletteSize: 0) — schemes cannot seed a tier with no palette.',
    );
    return initSecondaryDefaults(cluster);
  }
  // Preserve raw `oklch(...)` losslessly (wide-gamut chroma survives; never
  // collapses to '#000000' under jsdom). Every other entry is sanitised through
  // cssColorToHex() exactly as before this OKLCH work — canonicalises valid
  // hex/rgb and turns invalid bundled-scheme strings (e.g. Default Dark's "18")
  // into a safe '#000000' instead of leaking them to apply. sRGB clamping for
  // oklch still happens only at a true hex-conversion boundary.
  const palette = scheme.palette.map(normalizeSchemePaletteEntry);
  const semanticMappings: Record<string, SemanticValue> = {};
  for (const [key, defaultVal] of Object.entries(cluster.semanticDefaults)) {
    // `cluster.semanticDefaults` is `SemanticValue`-typed (#459), but every
    // default this function has ever produced is a plain palette-index number
    // — the `'bg'`/`'fg'` aliases and the `{ literal }` / `{ ref }` variants
    // are populated by downstream sub-issues (#467/#469), not resolved here.
    // Fall back to 0 for a non-numeric default so this stays total over the
    // widened type; `colorRefToIndex`'s `fallback` param is `number`-only.
    const indexDefault = typeof defaultVal === 'number' ? defaultVal : 0;
    const schemeVal = scheme.semantic?.[key as keyof typeof scheme.semantic];
    if (schemeVal === undefined) {
      semanticMappings[key] = indexDefault;
    } else if (typeof schemeVal === 'number') {
      semanticMappings[key] = schemeVal;
    } else {
      // String value — find in palette or nearest match.
      semanticMappings[key] = colorRefToIndex(schemeVal, scheme.palette, indexDefault);
    }
  }

  return {
    palette,
    background: colorRefToIndex(
      scheme.background,
      scheme.palette,
      cluster.baseDefaults.background ?? 0,
    ),
    foreground: colorRefToIndex(
      scheme.foreground,
      scheme.palette,
      cluster.baseDefaults.foreground ?? 0,
    ),
    cursor: colorRefToIndex(scheme.cursor, scheme.palette, cluster.baseDefaults.cursor ?? 0),
    selectionBg: colorRefToIndex(
      scheme.selectionBg,
      scheme.palette,
      cluster.baseDefaults.selectionBg ?? 0,
    ),
    selectionFg: colorRefToIndex(
      scheme.selectionFg,
      scheme.palette,
      cluster.baseDefaults.selectionFg ?? 0,
    ),
    semanticMappings,
    shikiTheme: String(scheme.shikiTheme ?? cluster.defaultShikiTheme),
  };
}

// ---------------------------------------------------------------------------
// Apply / clear
// ---------------------------------------------------------------------------

/**
 * Resolve a semantic mapping to an actual color (bounds-checked).
 *
 * Only handles the legacy `number | 'bg' | 'fg'` index shape — the narrower
 * type this function accepted before `ColorTweakState.semanticMappings` /
 * `ColorClusterDataConfig.semanticDefaults` were widened to `SemanticValue`
 * (#459 S1). Callers holding a `SemanticValue` must narrow with
 * `isIndexMapping()` first; resolving the `{ literal }` / `{ ref }` variants
 * is downstream work (#467/#469), not this function's job today.
 */
export function resolveMapping(
  mapping: number | 'bg' | 'fg',
  palette: string[],
  bgIndex: number,
  fgIndex: number,
): string {
  const len = palette.length;
  if (mapping === 'bg') return palette[safeIndex(bgIndex, len)] ?? '#000000';
  if (mapping === 'fg') return palette[safeIndex(fgIndex, len)] ?? '#ffffff';
  return palette[safeIndex(mapping, len)] ?? '#000000';
}

export function safeIndex(index: number, len: number): number {
  return index >= 0 && index < len ? index : 0;
}

/**
 * Resolve a `SemanticValue` to an actual color for the apply path. Delegates
 * to `resolveMapping` for the legacy index shape (every mapping produced by
 * the panel today), returns the raw CSS value verbatim for a single-mode
 * `{ literal: string }` mapping (#465, S4) — the DOM value for a literal row
 * must equal what `build-apply-overrides.ts`'s disk emitter writes for the
 * same mapping — and resolves a cross-tab/tier `{ ref }` mapping (#468) via
 * `resolveRefToCssVar` into a `var(--target)` string, again matching the disk
 * emitter's output for the same mapping.
 *
 * `currentTab` / `tabs` are optional so existing callers that have no tab
 * context (or only ever produce index/literal mappings) keep compiling. A
 * `{ ref }` mapping with no `currentTab` supplied, or one that fails to
 * resolve (misconfigured manifest), returns `null` — "emit nothing", matching
 * the disk emitter's skip behavior (see the inline comment below) — rather
 * than throwing or painting a fallback color. Up-front source validation is
 * #469's job, not this function's.
 *
 * The per-mode `{ literal: { light, dark } }` variant (#472) emits a CSS
 * `light-dark(<light>, <dark>)` function so the browser resolves the correct
 * side automatically from the applied root's `color-scheme` (set by
 * `applyColorState` whenever any per-mode literal is present). When the
 * optional `perModeMode` is supplied — a preview / seed / non-browser context
 * where `light-dark()` cannot resolve — the branch instead collapses to that
 * single mode's literal. `perModeMode` is the cluster's
 * `panelSettings.colorMode.defaultMode` (via `getClusterDefaultMode`), giving
 * that previously-inert field a real runtime effect.
 */
function resolveSemanticCssValue(
  mapping: SemanticValue,
  palette: string[],
  bgIndex: number,
  fgIndex: number,
  currentTab?: TabConfig,
  tabs?: readonly TabConfig[],
  perModeMode?: 'light' | 'dark',
): string | null {
  // Returns `null` to mean "emit nothing" — an unresolvable `{ ref }` or an
  // unrecognized mapping shape. Apply call sites SKIP a null (leaving the
  // token at its stylesheet default), matching the disk emitter
  // (`build-apply-overrides.ts`) which also skips. The preview caller
  // (`resolveSemanticPreviewColor`) substitutes a concrete fallback instead.
  if (isIndexMapping(mapping)) return resolveMapping(mapping, palette, bgIndex, fgIndex);
  if (isLiteralMapping(mapping) && isPerModeLiteral(mapping)) {
    // #472 — per-mode literal. Emit `light-dark()` so the browser picks the
    // side matching the applied root's used color-scheme; or, when a concrete
    // single value is requested (preview/seed, no `light-dark()` support),
    // collapse to `perModeMode`'s literal.
    return perModeMode
      ? mapping.literal[perModeMode]
      : `light-dark(${mapping.literal.light}, ${mapping.literal.dark})`;
  }
  if (isLiteralMapping(mapping) && !isPerModeLiteral(mapping)) return mapping.literal;
  if (isRefMapping(mapping) && currentTab) {
    try {
      const targetCssVar = resolveRefToCssVar(mapping.ref, currentTab, tabs ?? [currentTab]);
      return `var(${targetCssVar})`;
    } catch {
      // Unresolvable ref (misconfigured manifest / renamed ramp item) — emit
      // nothing so the token keeps its stylesheet default, exactly as the disk
      // emitter does. Do NOT paint it black.
      return null;
    }
  }
  return null;
}

/**
 * The cluster's configured default light/dark mode, or `'light'` when the
 * cluster declares no `colorMode` (`colorMode === false`).
 *
 * This is the single runtime reader of `ClusterPanelSettings.colorMode.defaultMode`
 * (#472). The field validates but was previously never read at runtime; this
 * helper (consumed by `resolveSemanticPreviewColor`) gives it a real effect —
 * it selects which side of a per-mode `{ literal: { light, dark } }` pair is the
 * fallback when `light-dark()` cannot resolve.
 */
export function getClusterDefaultMode(
  cluster: ColorClusterDataConfig,
): 'light' | 'dark' {
  const cm = cluster.panelSettings.colorMode;
  return cm ? cm.defaultMode : 'light';
}

/**
 * Resolve a per-mode literal to a single concrete CSS color for `mode`.
 *
 * Used wherever CSS `light-dark()` cannot be used — a preview swatch, an SSR
 * seed, or any non-browser consumer that needs one flat value rather than a
 * `light-dark(...)` function. The emitters (`applyColorState`,
 * `buildApplyOverrides`) deliberately do NOT call this; they emit
 * `light-dark()` and let the browser choose.
 */
export function resolvePerModeLiteral(
  value: { literal: { light: string; dark: string } },
  mode: 'light' | 'dark',
): string {
  return value.literal[mode];
}

/**
 * Resolve a semantic mapping to a single concrete CSS color suitable for a
 * PREVIEW swatch — a flat value, never a `light-dark()` function. Mirrors the
 * internal apply-path resolver, except a per-mode `{ literal: { light, dark } }`
 * value collapses to `getClusterDefaultMode(cluster)`'s side (#472).
 *
 * This is the "preview/seed" consumer referenced by #472/#473: the per-mode
 * editor UI (#473) renders its swatch from this so the user sees the cluster's
 * default-mode color, while the applied CSS var still emits `light-dark()`.
 */
export function resolveSemanticPreviewColor(
  mapping: SemanticValue,
  state: ColorTweakState,
  cluster: ColorClusterDataConfig = getActivePrimaryCluster(),
  currentTab?: TabConfig,
  tabs?: readonly TabConfig[],
): string {
  // Preview needs a concrete color; substitute the neutral fallback when the
  // mapping resolves to nothing (unresolvable ref / unknown shape).
  return (
    resolveSemanticCssValue(
      mapping,
      state.palette,
      state.background,
      state.foreground,
      currentTab,
      tabs,
      getClusterDefaultMode(cluster),
    ) ?? '#000000'
  );
}

/**
 * Inline CSS property (NOT a custom property) written to the applied root when
 * a cluster emits any per-mode `light-dark()` value, so that function resolves
 * against a defined color-scheme instead of silently falling back. Emitted as
 * a plain `[name, value]` pair through the same write path (sink batch or
 * `document.documentElement`) as every other var, per #472.
 */
const COLOR_SCHEME_PROP = 'color-scheme';
const COLOR_SCHEME_LIGHT_DARK = 'light dark';

/**
 * True when applying `state` against `cluster` would emit at least one per-mode
 * `light-dark()` semantic value — i.e. the applied root needs
 * `color-scheme: light dark` for those values to resolve.
 */
function hasPerModeLiteralSemantic(
  state: ColorTweakState,
  cluster: ColorClusterDataConfig,
): boolean {
  for (const key of Object.keys(cluster.semanticCssNames)) {
    const mapping = state.semanticMappings[key] ?? cluster.semanticDefaults[key];
    if (mapping !== undefined && isPerModeLiteral(mapping)) return true;
  }
  return false;
}

/**
 * Apply a single `ColorTweakState` to the DOM using the given cluster config.
 *
 * `currentTab` / `tabs` are optional and exist so a cross-tab/tier `{ ref }`
 * semantic mapping (#468) can resolve: `currentTab` should be the color
 * TabConfig this cluster was derived from (id `'color'` or
 * `'color-secondary'`), and `tabs` the panel's full tabs array so a ref
 * pointing into another tab (e.g. the grouped Palette tab) resolves. Callers
 * that never hold `{ ref }` mappings (or have no tab context, e.g. most
 * existing tests) can omit both — `resolveSemanticCssValue` returns `null`
 * for an unresolvable ref rather than throwing, and this function skips a
 * `null` (leaving the token at its stylesheet default) rather than painting
 * a fallback color.
 *
 * `ownerPrefix` (#501) is the instance `storagePrefix` this apply belongs to.
 * When supplied AND this cluster emits a per-mode `light-dark()` literal (so
 * `color-scheme: light dark` is written to the apply target — either
 * `document.documentElement` or the sink's root), the instance is recorded as
 * the owner of that inline `color-scheme` so the clear paths can later remove
 * it without ever wiping a host-owned `<html style="color-scheme">`. Omitting
 * it (direct callers with no instance context, e.g. some tests) skips the
 * bookkeeping only — the actual CSS write is unchanged.
 */
export function applyColorState(
  state: ColorTweakState,
  cluster: ColorClusterDataConfig = getActivePrimaryCluster(),
  sink?: ApplySink,
  currentTab?: TabConfig,
  tabs?: readonly TabConfig[],
  ownerPrefix?: string,
) {
  const len = state.palette.length;
  if (sink) {
    // Batch all writes for this cluster into one sink.apply() call.
    const pairs: [string, string][] = [];
    for (let i = 0; i < len; i++) {
      pairs.push([resolvePaletteCssVar(cluster, i), state.palette[i]]);
    }
    for (const [key, cssName] of Object.entries(cluster.baseRoles)) {
      if (typeof cssName !== 'string' || cssName.length === 0) continue;
      const stateIndex = state[key as BaseRoleKey];
      if (typeof stateIndex !== 'number') continue;
      pairs.push([cssName, state.palette[safeIndex(stateIndex, len)]]);
    }
    for (const [key, cssName] of Object.entries(cluster.semanticCssNames)) {
      const mapping = state.semanticMappings[key] ?? cluster.semanticDefaults[key];
      const value = resolveSemanticCssValue(
        mapping,
        state.palette,
        state.background,
        state.foreground,
        currentTab,
        tabs,
      );
      // Skip an unresolvable ref / unknown shape (null) — leave the token at
      // its default, matching the disk emitter.
      if (value !== null) pairs.push([cssName, value]);
    }
    // #472 — when any semantic value emits `light-dark()`, the applied root
    // needs `color-scheme: light dark` for it to resolve. Route it through the
    // SAME sink so it lands on the sink's own target root, never a hardcoded
    // `document.documentElement`.
    if (hasPerModeLiteralSemantic(state, cluster)) {
      pairs.push([COLOR_SCHEME_PROP, COLOR_SCHEME_LIGHT_DARK]);
      // #501 — record that THIS instance wrote `color-scheme` to its sink root
      // so the clear paths can scope removal to panel-written values.
      if (ownerPrefix) markColorSchemeWritten(ownerPrefix);
    }
    try {
      sink.apply(pairs);
    } catch (err) {
      console.warn('[design-token-panel] applySink.apply threw; falling back silently.', err);
    }
    return;
  }
  // Default path — write directly to document.documentElement.
  // Palette slots.
  for (let i = 0; i < len; i++) {
    setCssVar(resolvePaletteCssVar(cluster, i), state.palette[i]);
  }
  // Base roles — only write the roles this cluster declares. Iterate
  // `cluster.baseRoles` (rather than hardcoding all 5) so a cluster that
  // ships zero base roles emits zero base-role writes.
  for (const [key, cssName] of Object.entries(cluster.baseRoles)) {
    if (typeof cssName !== 'string' || cssName.length === 0) continue;
    const stateIndex = state[key as BaseRoleKey];
    if (typeof stateIndex !== 'number') continue;
    setCssVar(cssName, state.palette[safeIndex(stateIndex, len)]);
  }
  // Semantic.
  for (const [key, cssName] of Object.entries(cluster.semanticCssNames)) {
    const mapping = state.semanticMappings[key] ?? cluster.semanticDefaults[key];
    const value = resolveSemanticCssValue(
      mapping,
      state.palette,
      state.background,
      state.foreground,
      currentTab,
      tabs,
    );
    // Skip an unresolvable ref / unknown shape (null) — leave the token at its
    // default, matching the disk emitter.
    if (value !== null) setCssVar(cssName, value);
  }
  // #472 — set `color-scheme: light dark` on the applied root so any emitted
  // `light-dark()` semantic value resolves. `setCssVar` writes to
  // `document.documentElement` (the default, no-sink path's root). This is a
  // plain CSS property, not a custom property, but `setProperty` handles both.
  if (hasPerModeLiteralSemantic(state, cluster)) {
    setCssVar(COLOR_SCHEME_PROP, COLOR_SCHEME_LIGHT_DARK);
    // #501 — record that THIS instance wrote `color-scheme` to
    // document.documentElement so the clear paths can scope removal to
    // panel-written values (never the host-owned `<html style="color-scheme">`).
    if (ownerPrefix) markColorSchemeWritten(ownerPrefix);
  }
}

/**
 * Apply a `TokenOverrides` map for a given manifest — writes inline
 * `--css-var: value` on `:root` for every overridden token, and removes the
 * inline property for tokens absent from the map (so the stylesheet default
 * comes back).
 *
 * Read-only tokens are skipped in both directions: they are informational rows
 * in the UI and are never written to storage.
 */
export function applyTokenOverrides(
  tokens: readonly TokenDef[],
  overrides: TokenOverrides,
  sink?: ApplySink,
) {
  if (sink) {
    const applyPairs: [string, string][] = [];
    const clearNames: string[] = [];
    for (const t of tokens) {
      if (t.readonly) continue;
      const v = overrides[t.id];
      if (typeof v === 'string' && v.length > 0) {
        applyPairs.push([t.cssVar, v]);
      } else {
        clearNames.push(t.cssVar);
      }
    }
    if (applyPairs.length > 0) {
      try {
        sink.apply(applyPairs);
      } catch (err) {
        console.warn('[design-token-panel] applySink.apply threw; falling back silently.', err);
      }
    }
    if (clearNames.length > 0) {
      try {
        sink.clear(clearNames);
      } catch (err) {
        console.warn('[design-token-panel] applySink.clear threw; falling back silently.', err);
      }
    }
    return;
  }
  for (const t of tokens) {
    if (t.readonly) continue;
    const v = overrides[t.id];
    if (typeof v === 'string' && v.length > 0) {
      setCssVar(t.cssVar, v);
    } else {
      document.documentElement.style.removeProperty(t.cssVar);
    }
  }
}

/**
 * Apply the full unified `TweakState` — primary color cluster + token
 * overrides + optional secondary cluster.
 *
 * Tab configs AND the primary color cluster are read from `panelConfig`
 * at call time so a host that calls `configurePanel` before mount sees its
 * own data driving the apply pass.
 *
 * When `cfg` is supplied its `applySink` (if any) is used to route all
 * CSS-var writes for this instance. Omitting `cfg` uses the default active
 * config (single-panel path, unchanged behavior).
 *
 * `color-scheme` is managed as an AGGREGATE across the primary + secondary
 * clusters, not per-cluster (#482 D3): `applyColorState` only ever SETS
 * `color-scheme: light dark` when its OWN cluster needs it, it never clears
 * it, so demoting the last per-mode-literal row (in either cluster) would
 * otherwise leave the previous apply's value stale. A naive per-cluster
 * clear inside `applyColorState` would let a per-mode-free secondary undo
 * what the primary just required (or vice versa), so the clear-when-neither-
 * needs-it decision is made here, once, after both clusters have applied.
 */
export function applyFullState(state: TweakState, cfg?: PanelConfig) {
  const config = cfg ?? getPanelConfig();
  const sink = config.applySink;
  // Primary color cluster is derived from the color TabConfig. Thread the
  // color tab + the full tabs array through so a cross-tab `{ ref }` semantic
  // mapping (#468) resolves against a ramp tier living in another tab (e.g.
  // the grouped Palette tab).
  const colorTab = config.tabs.find((t) => t.id === 'color');
  const primaryCluster = getActivePrimaryCluster(config);
  applyColorState(state.color, primaryCluster, sink, colorTab, config.tabs, config.storagePrefix);
  // Apply spacing / typography / size from tabs[] (required field post-Wave-5).
  applyTabOverridesFlat(config.tabs, 'spacing', state.spacing, sink);
  applyTabOverridesFlat(config.tabs, 'font', state.typography, sink);
  applyTabOverridesFlat(config.tabs, 'size', state.size, sink);
  // The secondary cluster is host-driven via the 'color-secondary' tab.
  // When no such tab is configured, skip the secondary apply pass entirely.
  const secondaryCluster = resolveSecondaryColorCluster(config);
  let secondaryHasPerMode = false;
  if (secondaryCluster && state.secondary) {
    const secondaryColorTab = config.tabs.find((t) => t.id === 'color-secondary');
    applyColorState(
      state.secondary,
      secondaryCluster,
      sink,
      secondaryColorTab,
      config.tabs,
      config.storagePrefix,
    );
    secondaryHasPerMode = hasPerModeLiteralSemantic(state.secondary, secondaryCluster);
  }
  // #482 D3 — clear the aggregate `color-scheme` exactly when NEITHER
  // cluster needs it. When either does, that cluster's own `applyColorState`
  // call already set it above (see the docstring above for why this can't
  // be a per-cluster decision).
  //
  // #501 — but scope the removal to a color-scheme THIS instance actually
  // wrote. `reapplyPersistedOverrides()` (src/index.tsx) calls `applyFullState`
  // on every adapter init and `astro:page-load`; a non-per-mode host that owns
  // `<html style="color-scheme">` must not have it wiped by that reapply.
  if (!hasPerModeLiteralSemantic(state.color, primaryCluster) && !secondaryHasPerMode) {
    if (sink) {
      // Sink targets (shadow root / iframe) are panel-owned, so the sink clear
      // stays unconditional — but drop the ownership claim to keep it honest.
      try {
        sink.clear([COLOR_SCHEME_PROP]);
      } catch (err) {
        console.warn('[design-token-panel] applySink.clear threw; falling back silently.', err);
      }
      clearColorSchemeOwnership(config.storagePrefix);
    } else {
      clearOwnedColorSchemeFromDocument(config.storagePrefix);
    }
  }
  // Apply generic tab overrides (v3 envelope tabs field).
  // The `tabs` field stores `TabOverrides` (tierId → { itemId → value }).
  // `applyTabOverridesFlat` takes a flat `TokenOverrides` (itemId → value),
  // so we flatten each tab's tier map before passing it through.
  if (state.tabs) {
    for (const [tabId, tabOverrides] of Object.entries(state.tabs)) {
      const flatOverrides: TokenOverrides = {};
      for (const tierOverrides of Object.values(tabOverrides)) {
        for (const [itemId, value] of Object.entries(tierOverrides)) {
          flatOverrides[itemId] = value;
        }
      }
      applyTabOverridesFlat(config.tabs, tabId, flatOverrides, sink);
    }
  }
}

/**
 * Apply a flat TokenOverrides map against a TabConfig. Finds the tab by id
 * in `tabs`, then for each tier item resolves the effective CSS value using
 * the tier resolver (so reference tiers emit `var(--target)`) and writes it
 * to `:root`. Items not present in the overrides map have their inline
 * property removed so the stylesheet default re-asserts.
 *
 * Skips gracefully when the tab is not found (host config without that tab).
 *
 * When `sink` is supplied, CSS-var writes and clears are routed through it
 * instead of `document.documentElement`.
 */
function applyTabOverridesFlat(
  tabs: readonly TabConfig[],
  tabId: string,
  overrides: TokenOverrides,
  sink?: ApplySink,
) {
  const tab = tabs.find((t) => t.id === tabId);
  if (!tab) return;

  // Build a TabOverrides-shaped view of the flat overrides so the tier
  // resolver can do reference-tier resolution. The flat map stores overrides
  // keyed by item id; we wrap each item into its tier bucket.
  const tabOverrides: Record<string, Record<string, string>> = {};
  for (const tier of tab.tiers) {
    const tierOverrides: Record<string, string> = {};
    for (const item of tier.items) {
      const v = overrides[item.id];
      if (typeof v === 'string' && v.length > 0) {
        tierOverrides[item.id] = v;
      }
    }
    tabOverrides[tier.id] = tierOverrides;
  }

  if (sink) {
    // Collect all apply pairs and clear names, then flush to the sink.
    const applyPairs: [string, string][] = [];
    const clearNames: string[] = [];
    for (const tier of tab.tiers) {
      for (const item of tier.items) {
        if (item.readonly) continue;
        try {
          const resolved = resolveTierItemValue(tab, tier.id, item.id, tabOverrides);
          const cssValue = emitTierItemCssValue(resolved);
          const hasOverride =
            typeof overrides[item.id] === 'string' && overrides[item.id].length > 0;
          if (hasOverride || tier.referencesTier !== undefined) {
            applyPairs.push([item.cssVar, cssValue]);
          } else {
            clearNames.push(item.cssVar);
          }
        } catch {
          clearNames.push(item.cssVar);
        }
      }
    }
    if (applyPairs.length > 0) {
      try {
        sink.apply(applyPairs);
      } catch (err) {
        console.warn('[design-token-panel] applySink.apply threw; falling back silently.', err);
      }
    }
    if (clearNames.length > 0) {
      try {
        sink.clear(clearNames);
      } catch (err) {
        console.warn('[design-token-panel] applySink.clear threw; falling back silently.', err);
      }
    }
    return;
  }

  // Apply each item using the resolver so reference tiers emit var() refs.
  const root = document.documentElement;
  for (const tier of tab.tiers) {
    for (const item of tier.items) {
      if (item.readonly) continue;
      try {
        const resolved = resolveTierItemValue(tab, tier.id, item.id, tabOverrides);
        const cssValue = emitTierItemCssValue(resolved);
        // Only write if there is actually an override — otherwise remove
        // so the stylesheet default takes effect.
        const hasOverride = typeof overrides[item.id] === 'string' && overrides[item.id].length > 0;
        if (hasOverride || tier.referencesTier !== undefined) {
          // For reference tiers we always write var(--target) because the
          // CSS var itself points at the canonical default target, which
          // may differ from a user-overridden raw tier item. Writing nothing
          // would leave the previous var() ref or the stylesheet default.
          setCssVar(item.cssVar, cssValue);
        } else {
          root.style.removeProperty(item.cssVar);
        }
      } catch {
        // Resolver errors (misconfigured tab) are non-fatal — remove any
        // stale inline value and let the stylesheet default through.
        root.style.removeProperty(item.cssVar);
      }
    }
  }
}

/**
 * Default wipe set — follows the host's configuration. Derives the clusters
 * to clear from the color tabs (primary + optional secondary).
 */
function defaultClusterWipeSet(cfg?: PanelConfig): readonly ColorClusterDataConfig[] {
  const config = cfg ?? getPanelConfig();
  const primary = getActivePrimaryCluster(config);
  const secondary = resolveSecondaryColorCluster(config);
  return secondary ? [primary, secondary] : [primary];
}

/**
 * Collect ALL CSS var names owned by a color cluster (palette slots, base
 * roles, semantic vars). Used by the sink-aware clear path to call
 * `sink.clear(fullTokenNameSet)` for a full-instance reset.
 */
function clusterVarNames(cluster: ColorClusterDataConfig): string[] {
  const names: string[] = [];
  for (let i = 0; i < cluster.paletteSize; i++) {
    names.push(resolvePaletteCssVar(cluster, i));
  }
  for (const prop of Object.values(cluster.baseRoles)) {
    if (typeof prop === 'string' && prop.length > 0) names.push(prop);
  }
  for (const cssName of Object.values(cluster.semanticCssNames)) {
    names.push(cssName);
  }
  return names;
}

/**
 * Collect ALL CSS var names owned by non-color tabs (spacing/font/size and
 * generic host tabs). Used by the sink-aware reset path.
 */
function nonColorTabVarNames(cfg: PanelConfig): string[] {
  const names: string[] = [];
  for (const tab of cfg.tabs) {
    if (tab.id === 'color' || tab.id === 'color-secondary') continue;
    for (const tier of tab.tiers) {
      for (const item of tier.items) {
        if (item.readonly) continue;
        names.push(item.cssVar);
      }
    }
  }
  return names;
}

/**
 * #501 — remove a panel-written `color-scheme` from `document.documentElement`,
 * but ONLY when the instance keyed by `prefix` is its recorded writer AND the
 * current inline value is still the panel-written `light dark` sentinel.
 *
 * Three cases:
 *  - We don't own it (host owns `<html style="color-scheme">`, or the panel
 *    never wrote one): leave the value untouched — the #501 fix.
 *  - We own it and the value is still `light dark`: remove it and drop the
 *    ownership claim.
 *  - We own it but the value was overwritten by the host after we wrote it (the
 *    stale-ownership case — e.g. the host re-asserted `color-scheme` between a
 *    `destroy()` and a remount): leave the host's value, but drop the now-stale
 *    ownership claim so the next apply re-establishes it cleanly.
 *
 * Palette / base-role / semantic var removals are always panel-written, so they
 * stay unconditional at the call sites; only the standard `color-scheme`
 * property (which the host may legitimately own) is gated here.
 */
function clearOwnedColorSchemeFromDocument(prefix: string): void {
  if (!ownsColorScheme(prefix)) return;
  const root = document.documentElement;
  if (root.style.getPropertyValue(COLOR_SCHEME_PROP) === COLOR_SCHEME_LIGHT_DARK) {
    root.style.removeProperty(COLOR_SCHEME_PROP);
  }
  clearColorSchemeOwnership(prefix);
}

/**
 * Strip the inline CSS variables written by the color cluster(s) only —
 * palette slots, base roles, and semantic vars. Spacing / typography / size
 * tab vars are left untouched.
 *
 * This is the scheme-change clear path. A host light/dark toggle re-seeds the
 * absolute color palette from the new scheme, but the user's spacing /
 * typography / size tweaks are scheme-independent and must survive the toggle
 * (#347). For a full panel-level reset (Reset / Apply) use `clearAppliedStyles`.
 *
 * Accepts an optional list of clusters so callers can scope the wipe to a
 * subset; the default covers both the primary and secondary clusters.
 *
 * When `sink` is supplied, clears are routed through it instead of
 * `document.documentElement`.
 *
 * `cfg` scopes the clear to a specific panel instance (multi-instance, #357):
 * when supplied AND no explicit `clusters` / `sink` are given, the default
 * cluster wipe set is derived from `cfg`'s tabs and clears route through
 * `cfg.applySink`. An explicitly-passed `clusters` or `sink` still wins, so the
 * historical `(clusters, sink)` call shape (e.g. the scheme-change path before
 * #357, and existing tests) is unchanged. Omitting all three preserves the
 * single-panel default-instance behaviour.
 *
 * The color-scheme removal on the `document.documentElement` path is gated on
 * this instance owning the inline value (#501) — see
 * `clearOwnedColorSchemeFromDocument`. The owner is `cfg.storagePrefix` when a
 * `cfg` is given, else the default instance's prefix.
 */
export function clearAppliedColorStyles(
  clusters?: readonly ColorClusterDataConfig[],
  sink?: ApplySink,
  cfg?: PanelConfig,
) {
  const resolvedClusters = clusters ?? defaultClusterWipeSet(cfg);
  const resolvedSink = sink ?? cfg?.applySink;
  const ownerPrefix = (cfg ?? getPanelConfig()).storagePrefix;
  return clearAppliedColorStylesImpl(resolvedClusters, resolvedSink, ownerPrefix);
}

function clearAppliedColorStylesImpl(
  clusters: readonly ColorClusterDataConfig[],
  sink?: ApplySink,
  ownerPrefix?: string,
) {
  if (sink) {
    const names: string[] = [];
    for (const cluster of clusters) {
      names.push(...clusterVarNames(cluster));
    }
    // #474 — the apply path may have set `color-scheme: light dark` on this
    // sink's target root (whenever any per-mode literal was present, #472).
    // Clear it alongside the palette/base-role/semantic vars so a Reset
    // doesn't leave it lingering. Harmless when it was never set — clearing
    // an absent property is a no-op. Sink targets are panel-owned, so this
    // stays unconditional; we just drop the ownership claim to keep it honest.
    if (clusters.length > 0) names.push(COLOR_SCHEME_PROP);
    if (names.length > 0) {
      try {
        sink.clear(names);
      } catch (err) {
        console.warn('[design-token-panel] applySink.clear threw; falling back silently.', err);
      }
    }
    if (ownerPrefix && clusters.length > 0) clearColorSchemeOwnership(ownerPrefix);
    return;
  }
  const root = document.documentElement;
  for (const cluster of clusters) {
    for (let i = 0; i < cluster.paletteSize; i++) {
      root.style.removeProperty(resolvePaletteCssVar(cluster, i));
    }
    for (const prop of Object.values(cluster.baseRoles)) {
      root.style.removeProperty(prop);
    }
    for (const cssName of Object.values(cluster.semanticCssNames)) {
      root.style.removeProperty(cssName);
    }
  }
  // #474 — remove a lingering `color-scheme: light dark` set by the apply path
  // for a per-mode literal, but #501-gated: only when THIS instance wrote it
  // and the host hasn't overwritten it since (never wipe a host-owned
  // `<html style="color-scheme">`).
  if (clusters.length > 0 && ownerPrefix) clearOwnedColorSchemeFromDocument(ownerPrefix);
}

/**
 * Strip ALL tweak-applied inline CSS variables — color clusters AND every
 * spacing / typography / size tab var — so the stylesheet-provided values from
 * the active scheme take effect again.
 *
 * Accepts an optional list of clusters so callers can scope the color wipe to a
 * subset; the default wipes both the primary and secondary clusters so a
 * panel-level reset leaves no stale inline overrides on `:root` regardless
 * of which cluster was last edited.
 *
 * When `cfg` is supplied its `applySink` (if any) routes the clear through the
 * sink with the FULL token-name set for this instance (not just dirty vars).
 * This satisfies the Reset contract: the sink `clear` receives every var the
 * instance can own, so the sink's target element is completely clean.
 */
export function clearAppliedStyles(
  clusters?: readonly ColorClusterDataConfig[],
  cfg?: PanelConfig,
) {
  const config = cfg ?? getPanelConfig();
  const sink = config.applySink;
  const resolvedClusters = clusters ?? defaultClusterWipeSet(config);

  if (sink) {
    // Collect the FULL token-name set for this instance so the sink target
    // is completely cleaned — not just the currently-dirty vars.
    const names: string[] = [];
    for (const cluster of resolvedClusters) {
      names.push(...clusterVarNames(cluster));
    }
    // #482 D2 — same rationale as `clearAppliedColorStylesImpl`'s sink
    // branch: the apply path may have set `color-scheme: light dark` on this
    // sink's target root (#472/#474); clear it here too so a Reset (or the
    // post-Apply cleanup) doesn't leave it lingering. Harmless when it was
    // never set — clearing an absent property is a no-op.
    if (resolvedClusters.length > 0) names.push(COLOR_SCHEME_PROP);
    names.push(...nonColorTabVarNames(config));
    if (names.length > 0) {
      try {
        sink.clear(names);
      } catch (err) {
        console.warn('[design-token-panel] applySink.clear threw; falling back silently.', err);
      }
    }
    // #501 — sink targets are panel-owned; the clear above is unconditional, so
    // just drop the ownership claim to keep it honest.
    if (resolvedClusters.length > 0) clearColorSchemeOwnership(config.storagePrefix);
    return;
  }

  // Default path — write/remove directly on document.documentElement.
  // Color cluster vars (palette / base roles / semantic). Pass `config` so the
  // color-scheme removal is #501-gated on THIS instance's ownership.
  clearAppliedColorStyles(resolvedClusters, undefined, config);
  // Tabs — clear all cssVars for items in spacing/font/size tabs so the
  // stylesheet defaults take effect again.
  const root = document.documentElement;
  for (const tab of config.tabs) {
    // Color tab vars are handled above via cluster clear paths.
    if (tab.id === 'color' || tab.id === 'color-secondary') continue;
    for (const tier of tab.tiers) {
      for (const item of tier.items) {
        if (item.readonly) continue;
        root.style.removeProperty(item.cssVar);
      }
    }
  }
}

// ---------------------------------------------------------------------------
// Validation + migration
// ---------------------------------------------------------------------------

/** Validate a parsed object has the minimum fields to be a `ColorTweakState`. */
function isValidColorShape(s: unknown, paletteSize: number): s is Partial<ColorTweakState> {
  if (!s || typeof s !== 'object') return false;
  const o = s as Record<string, unknown>;
  return (
    Array.isArray(o.palette) &&
    (o.palette as unknown[]).length === paletteSize &&
    typeof o.background === 'number' &&
    typeof o.foreground === 'number' &&
    typeof o.cursor === 'number' &&
    typeof o.selectionBg === 'number' &&
    typeof o.selectionFg === 'number' &&
    typeof o.semanticMappings === 'object' &&
    o.semanticMappings !== null
  );
}

/**
 * Validate+narrow a single persisted `semanticMappings` entry into a
 * `SemanticValue`, or return `undefined` when the shape matches none of the
 * known variants.
 *
 * Accepts every shape `ColorTweakState.semanticMappings` has ever held:
 * the legacy index mapping (`number` / `'bg'` / `'fg'`, pre-#459) plus the
 * `{ literal }` / `{ literal: { light, dark } }` / `{ ref }` object variants
 * added in #459 and carried through the external serde in #462.
 */
function parsePersistedSemanticValue(val: unknown): SemanticValue | undefined {
  if (typeof val === 'number') return val;
  if (val === 'bg' || val === 'fg') return val;
  if (!val || typeof val !== 'object' || Array.isArray(val)) return undefined;

  const o = val as Record<string, unknown>;

  if ('literal' in o) {
    const lit = o.literal;
    if (typeof lit === 'string') return { literal: lit };
    if (lit && typeof lit === 'object' && !Array.isArray(lit)) {
      const lo = lit as Record<string, unknown>;
      if (typeof lo.light === 'string' && typeof lo.dark === 'string') {
        return { literal: { light: lo.light, dark: lo.dark } };
      }
    }
    return undefined;
  }

  if ('ref' in o) {
    const ref = o.ref;
    if (ref && typeof ref === 'object' && !Array.isArray(ref)) {
      const ro = ref as Record<string, unknown>;
      if (typeof ro.tier === 'string' && typeof ro.item === 'string') {
        return {
          ref: {
            tier: ro.tier,
            item: ro.item,
            ...(typeof ro.tab === 'string' ? { tab: ro.tab } : {}),
          },
        };
      }
    }
    return undefined;
  }

  return undefined;
}

/**
 * Hydrate a persisted `semanticMappings` object into a validated
 * `Record<string, SemanticValue>`, merged over `defaults` (so keys the
 * manifest has grown since the payload was written still backfill — see the
 * "fills in missing semantic keys from defaults" test).
 *
 * This is the persist-envelope "tolerant reader" for #462: an OLD payload
 * (pre-#459, index-only — every value a `number` / `'bg'` / `'fg'`) hydrates
 * byte-identical to before, because every one of those values already
 * satisfies `parsePersistedSemanticValue`. A NEWER payload may additionally
 * carry the `{ literal }` / `{ ref }` object variants, which round-trip too.
 * Any entry whose shape matches NEITHER — a corrupted key, or a foreign
 * localStorage value — falls back to whatever `defaults[key]` already holds
 * instead of being merged in verbatim, so malformed persisted data can't
 * inject an arbitrary object into runtime state.
 *
 * No storage-key version bump was needed for this: `getStorageKeyV3()` /
 * `storageKey_stateV3()` are also read directly by `astro/host-adapter.ts`
 * (autoload) and `index.tsx` (`hasPersistedOverrides`) outside this module.
 * Renaming the key here alone would desync those "does persisted state
 * exist" checks from where new saves actually land — the v3 envelope shape
 * was already wide enough (untyped at the JSON boundary) to carry the new
 * variants, so widening what THIS function accepts is the migration; the key
 * itself doesn't need to change.
 */
function hydrateSemanticMappings(
  raw: unknown,
  defaults: Record<string, SemanticValue>,
): Record<string, SemanticValue> {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return { ...defaults };
  const out: Record<string, SemanticValue> = { ...defaults };
  for (const [key, val] of Object.entries(raw as Record<string, unknown>)) {
    const parsed = parsePersistedSemanticValue(val);
    if (parsed !== undefined) {
      out[key] = parsed;
    }
    // else: an unrecognized shape — keep whatever `defaults[key]` already
    // provided (possibly nothing) rather than merging garbage into state.
  }
  return out;
}

/** Fill missing fields on a `ColorTweakState`-shaped object using defaults. */
function hydrateColorState(
  partial: Partial<ColorTweakState>,
  defaults: ColorTweakState,
): ColorTweakState {
  // palette is loaded from untrusted persisted
  // storage. Validate that every element is a string before casting; a
  // single non-string element would otherwise reach `style.setProperty` and
  // either crash or silently coerce. Falling back to defaults on bad data
  // keeps the panel functional and surfaces the corruption via console.error.
  const paletteRaw = Array.isArray(partial.palette) ? partial.palette : null;
  let palette: string[];
  if (
    paletteRaw &&
    paletteRaw.length === defaults.palette.length &&
    paletteRaw.every((v) => typeof v === 'string')
  ) {
    palette = paletteRaw as string[];
  } else {
    if (paletteRaw && paletteRaw.some((v) => typeof v !== 'string')) {
      console.error(
        '[design-token-panel] Persisted palette contained non-string elements; falling back to defaults.',
      );
    }
    palette = defaults.palette;
  }
  return {
    palette,
    background: typeof partial.background === 'number' ? partial.background : defaults.background,
    foreground: typeof partial.foreground === 'number' ? partial.foreground : defaults.foreground,
    cursor: typeof partial.cursor === 'number' ? partial.cursor : defaults.cursor,
    selectionBg:
      typeof partial.selectionBg === 'number' ? partial.selectionBg : defaults.selectionBg,
    selectionFg:
      typeof partial.selectionFg === 'number' ? partial.selectionFg : defaults.selectionFg,
    semanticMappings: hydrateSemanticMappings(partial.semanticMappings, defaults.semanticMappings),
    shikiTheme:
      typeof partial.shikiTheme === 'string' && partial.shikiTheme.length > 0
        ? partial.shikiTheme
        : defaults.shikiTheme,
  };
}

/**
 * Test-friendly migration entry point. Reads from a provided storage (defaults
 * to `localStorage`) and returns the loaded+migrated `TweakState`, or `null`
 * when no usable state exists.
 *
 * Rules:
 *  1. If v2 key exists and parses → use it (v2 wins).
 *  2. Else if v1 key exists → parse with safe defaults, lift into `state.color`,
 *     write v2, delete v1.
 *  3. Else → return null (caller initialises from the active scheme).
 *
 * Malformed JSON is caught with `console.warn` and returns null (caller falls
 * back to fresh defaults).
 */
export interface StorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

/**
 * Legacy zdtp-internal typography rename map — opt-in via
 * `PanelConfig.legacyIdRenameMap`.
 *
 * An earlier zdtp-internal port step renamed the font-size manifest ids from
 * panel-internal labels (`text-caption`, `text-small`, `text-body`,
 * `text-subheading`, `text-heading`, `text-display`) to main-site Tailwind
 * tiers (`text-xs`, `text-sm`, `text-base`, `text-lg`, `text-3xl`,
 * `text-5xl`), and dropped `text-micro` entirely (no main-site equivalent
 * exists). This map preserves persisted user tweaks across that one-time
 * rename — including the drop of `text-micro` (`null` value) — for callers
 * that opt in.
 *
 * Critically, this map is NOT applied by default any more (see issue #51):
 * hosts whose canonical manifest ids share names with these "old" labels —
 * e.g. `zudo-doc`, where `text-caption` IS the stable id — were having
 * their valid overrides remapped to non-existent ids and silently dropped.
 * The default `loadPersistedState` path now applies an empty rename map.
 *
 * The `text-micro: null` entry exists because dropping is the only way to
 * keep an obsolete legacy id from persisting indefinitely as dead
 * localStorage data: `applyTokenOverrides` silently ignores unknown ids,
 * but every save round-trips the dead key back to disk.
 *
 * Spacing + size manifest ids were NOT renamed (hsp-/vsp- ids kept their
 * labels), so this migration only applies to the typography slice.
 */
export const ZDTP_LEGACY_TYPOGRAPHY_RENAME_MAP: Readonly<Record<string, string | null>> = {
  'text-caption': 'text-xs',
  'text-small': 'text-sm',
  'text-body': 'text-base',
  'text-subheading': 'text-lg',
  'text-heading': 'text-3xl',
  'text-display': 'text-5xl',
  // Dropped — no main-site equivalent. `null` signals "discard".
  'text-micro': null,
};

/**
 * Narrow a stored value into a `TokenOverrides` map. Accepts any plain object
 * whose values are strings; unknown keys pass through so we don't silently
 * drop overrides when the manifest grows at runtime (they'll just be ignored
 * by `applyTokenOverrides`).
 */
function hydrateOverrides(raw: unknown): TokenOverrides {
  if (!raw || typeof raw !== 'object') return {};
  const out: TokenOverrides = {};
  for (const [k, v] of Object.entries(raw as Record<string, unknown>)) {
    if (typeof v === 'string') out[k] = v;
  }
  return out;
}

/**
 * Same as `hydrateOverrides` but also rewrites typography-slice keys per a
 * caller-supplied rename map. Map values are interpreted as:
 *
 *  - A `string` — rename: the value moves to that key. If BOTH the old and
 *    new ids are present in the payload, the new id wins (post-migration
 *    user tweak preserved).
 *  - `null` — drop the legacy id entirely (no replacement in the active
 *    manifest). Without this, a stray legacy override survives every save
 *    as dead localStorage data.
 *
 * Keys not mentioned in the rename map pass through unchanged.
 *
 * The rename map is sourced from `PanelConfig.legacyIdRenameMap` at call time
 * by `loadPersistedState`. The default is an empty map (no renaming) so
 * hosts whose manifest ids are stable are not corrupted by an opinionated
 * built-in rename — see issue #51 and the doc on
 * `ZDTP_LEGACY_TYPOGRAPHY_RENAME_MAP` for the historical zdtp-internal map
 * that callers can opt into.
 */
function hydrateTypographyOverrides(
  raw: unknown,
  renameMap: Readonly<Record<string, string | null>> = {},
): TokenOverrides {
  if (!raw || typeof raw !== 'object') return {};
  const out: TokenOverrides = {};
  for (const [k, v] of Object.entries(raw as Record<string, unknown>)) {
    if (typeof v !== 'string') continue;
    // `Object.hasOwn` (not `k in renameMap`) so a payload key like
    // `toString` / `constructor` cannot match an inherited Object.prototype
    // method and corrupt the rename target.
    if (Object.hasOwn(renameMap, k)) {
      const target = renameMap[k];
      if (target === null) continue; // dropped legacy id
      if (!Object.hasOwn(out, target)) {
        // Only take the legacy value if no post-migration value already set.
        out[target] = v;
      }
    } else {
      out[k] = v;
    }
  }
  return out;
}

/**
 * Hydrate a `tabs` field from a raw persisted value.
 * Each value under each tab key is expected to be a `Record<tierId, Record<itemId, string>>`.
 * Unknown shapes are silently dropped; valid string values pass through.
 */
function hydrateTabs(raw: unknown): Record<string, TabOverrides> {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return {};
  const result: Record<string, TabOverrides> = {};
  for (const [tabId, tabVal] of Object.entries(raw as Record<string, unknown>)) {
    if (!tabVal || typeof tabVal !== 'object' || Array.isArray(tabVal)) continue;
    const tierMap: Record<string, Record<string, string>> = {};
    for (const [tierId, tierVal] of Object.entries(tabVal as Record<string, unknown>)) {
      if (!tierVal || typeof tierVal !== 'object' || Array.isArray(tierVal)) continue;
      const itemMap: Record<string, string> = {};
      for (const [itemId, itemVal] of Object.entries(tierVal as Record<string, unknown>)) {
        if (typeof itemVal === 'string') itemMap[itemId] = itemVal;
      }
      tierMap[tierId] = itemMap;
    }
    result[tabId] = tierMap;
  }
  return result;
}

/**
 * Shared logic for hydrating a v2 or v3-shaped persisted object into a `TweakState`.
 *
 * Both v2 (from the old `-state-v2` key) and v3 (from `-state-v3`) share the
 * same top-level shape. The only difference is that v3 adds an optional `tabs`
 * field — which is backward-tolerated in v2 payloads too (just absent).
 */
function hydrateV2OrV3Object(
  obj: {
    color?: unknown;
    spacing?: unknown;
    typography?: unknown;
    font?: unknown;
    size?: unknown;
    secondary?: unknown;
    tabs?: unknown;
  },
  cluster: ColorClusterDataConfig,
  colorDefaults?: ColorTweakState,
  cfg: PanelConfig = getPanelConfig(),
): TweakState | null {
  // Return null only when color is completely absent or not an object-shaped
  // value. A palette-size mismatch (common during a supported config evolution
  // where the host grows/shrinks paletteSize) is tolerated: hydrateColorState
  // falls back to defaults.palette for the color slice and the non-color slices
  // (spacing/typography/size/tabs) the user set under the previous config are
  // preserved.
  if (!obj.color || typeof obj.color !== 'object') return null;

  const defaults = colorDefaults ?? tryInitColorFromScheme(cluster, cfg);
  const typographySlice = obj.typography !== undefined ? obj.typography : obj.font;
  // Rename map sourced from THIS instance's panel config. Defaults to an
  // empty map (no renaming) so hosts whose manifest ids are stable are
  // not corrupted — see issue #51 and the doc on
  // `ZDTP_LEGACY_TYPOGRAPHY_RENAME_MAP` for the opt-in zdtp-internal
  // map.
  const renameMap = cfg.legacyIdRenameMap ?? {};
  const next: TweakState = {
    color: hydrateColorState(obj.color as Partial<ColorTweakState>, defaults),
    // New sections added after v1 migration — tolerate their absence so
    // older v2 payloads (Color-only) still load cleanly.
    spacing: hydrateOverrides(obj.spacing),
    // Typography slice: apply the host-configured rename map (if any)
    // so payloads persisted under the host's "old" ids survive a
    // host-driven id rename without losing the user's tweaks.
    typography: hydrateTypographyOverrides(typographySlice, renameMap),
    size: hydrateOverrides(obj.size),
  };
  // Optional secondary slice — validated against the active secondary
  // cluster's palette size, NOT the primary cluster's. When the host
  // opted out (`secondaryColorCluster: null` or omitted), there is no
  // secondary cluster to validate against, so we skip hydration
  // entirely — the apply path also skips secondary writes, and the
  // JSON envelope simply omits the slice for opt-out hosts. Defaults
  // come from `initSecondaryDefaults(cluster)`.
  const secondaryCluster = resolveSecondaryColorCluster(cfg);
  if (
    secondaryCluster &&
    obj.secondary &&
    isValidColorShape(obj.secondary, secondaryCluster.paletteSize)
  ) {
    next.secondary = hydrateColorState(
      obj.secondary as Partial<ColorTweakState>,
      initSecondaryDefaults(secondaryCluster),
    );
  }
  // v3 extension: generic tab overrides keyed by tab id.
  const tabs = hydrateTabs(obj.tabs);
  if (Object.keys(tabs).length > 0) {
    next.tabs = tabs;
  }
  return next;
}

export function loadPersistedState(
  storage: StorageLike = localStorage,
  colorDefaults?: ColorTweakState,
  cluster: ColorClusterDataConfig = getActivePrimaryCluster(),
  cfg: PanelConfig = getPanelConfig(),
): TweakState | null {
  const STORAGE_KEY_V1 = getStorageKeyV1(cfg);
  const STORAGE_KEY_V2 = getStorageKeyV2(cfg);
  const STORAGE_KEY_V3 = getStorageKeyV3(cfg);

  // 1. v3 wins.
  const rawV3 = safeGet(storage, STORAGE_KEY_V3);
  if (rawV3 !== null) {
    const parsed = safeParse(rawV3);
    if (parsed && typeof parsed === 'object') {
      const obj = parsed as {
        color?: unknown;
        spacing?: unknown;
        typography?: unknown;
        font?: unknown;
        size?: unknown;
        secondary?: unknown;
        tabs?: unknown;
      };
      const next = hydrateV2OrV3Object(obj, cluster, colorDefaults, cfg);
      if (next !== null) {
        // Renormalize storage when:
        // (a) The typography slice changed — rename or null-drop — or the
        //     legacy `font` alias was used instead of `typography`. Without
        //     this, legacy ids and dropped entries survive on disk
        //     indefinitely as dead data, and a host that later removes the
        //     opt-in rename map regresses every user back to non-applying
        //     overrides.
        // (b) The stored color palette length differs from the current
        //     cluster.paletteSize. hydrateColorState already fell back to
        //     defaults.palette in that case; we rewrite v3 so the stale
        //     palette is replaced and `hasPersistedOverrides` stays accurate.
        const typographySlice = obj.typography !== undefined ? obj.typography : obj.font;
        const typographyChanged =
          JSON.stringify(typographySlice ?? {}) !== JSON.stringify(next.typography);
        const storedColor = obj.color as Record<string, unknown>;
        const paletteSizeMismatch =
          Array.isArray(storedColor?.palette) &&
          (storedColor.palette as unknown[]).length !== cluster.paletteSize;
        if (typographyChanged || obj.typography === undefined || paletteSizeMismatch) {
          try {
            storage.setItem(STORAGE_KEY_V3, JSON.stringify(next));
          } catch {
            /* storage full — return the in-memory state anyway */
          }
        }
        return next;
      }
    }
    // v3 present but color is completely absent/invalid — warn and fall
    // through to v2 check.
    console.warn(`[tweak] Malformed ${STORAGE_KEY_V3}, attempting v2 migration`);
  }

  // 2. v2 → v3 migration.
  const rawV2 = safeGet(storage, STORAGE_KEY_V2);
  if (rawV2 !== null) {
    const parsed = safeParse(rawV2);
    if (parsed && typeof parsed === 'object') {
      const obj = parsed as {
        color?: unknown;
        spacing?: unknown;
        typography?: unknown;
        font?: unknown;
        size?: unknown;
        secondary?: unknown;
        tabs?: unknown;
      };
      const migrated = hydrateV2OrV3Object(obj, cluster, colorDefaults, cfg);
      if (migrated !== null) {
        try {
          storage.setItem(STORAGE_KEY_V3, JSON.stringify(migrated));
          storage.removeItem(STORAGE_KEY_V2);
        } catch {
          /* storage full; still return migrated state for this session */
        }
        return migrated;
      }
    }
    // v2 present but color is completely absent/invalid — warn and fall through.
    console.warn(`[tweak] Malformed ${STORAGE_KEY_V2}, attempting v1 migration`);
  }

  // 3. v1 → v3 migration.
  const rawV1 = safeGet(storage, STORAGE_KEY_V1);
  if (rawV1 !== null) {
    const parsed = safeParse(rawV1);
    if (parsed && typeof parsed === 'object' && isValidColorShape(parsed, cluster.paletteSize)) {
      const defaults = colorDefaults ?? tryInitColorFromScheme(cluster, cfg);
      // Backfill shikiTheme like the legacy loader did.
      const partial = parsed as Partial<ColorTweakState>;
      if (!partial.shikiTheme) {
        partial.shikiTheme = defaults.shikiTheme;
      }
      const color = hydrateColorState(partial, defaults);
      const migrated: TweakState = {
        color,
        spacing: emptyOverrides(),
        typography: emptyOverrides(),
        size: emptyOverrides(),
      };
      try {
        storage.setItem(STORAGE_KEY_V3, JSON.stringify(migrated));
        storage.removeItem(STORAGE_KEY_V1);
      } catch {
        /* storage full; still return migrated state for this session */
      }
      return migrated;
    }
    // v1 unreadable — warn and drop it.
    console.warn(`[tweak] Malformed ${STORAGE_KEY_V1}; discarding and using fresh defaults`);
    try {
      storage.removeItem(STORAGE_KEY_V1);
    } catch {
      /* ignore */
    }
  }

  // 4. Fresh defaults.
  return null;
}

/**
 * Persist the full `TweakState` to v3.
 *
 * `cfg` scopes the storage key to a specific panel instance (multi-instance,
 * #357). Omitting it resolves the default instance via `getPanelConfig()`,
 * preserving the single-panel path.
 */
export function savePersistedState(
  state: TweakState,
  storage: StorageLike = localStorage,
  cfg: PanelConfig = getPanelConfig(),
) {
  try {
    storage.setItem(getStorageKeyV3(cfg), JSON.stringify(state));
  } catch {
    // Storage full.
  }
}

/**
 * Remove v3 (and lingering v2/v1) keys.
 *
 * `cfg` scopes the cleared keys to a specific panel instance (multi-instance,
 * #357). Omitting it resolves the default instance via `getPanelConfig()`,
 * preserving the single-panel path.
 */
export function clearPersistedState(
  storage: StorageLike = localStorage,
  cfg: PanelConfig = getPanelConfig(),
) {
  try {
    storage.removeItem(getStorageKeyV3(cfg));
  } catch {
    /* ignore */
  }
  try {
    storage.removeItem(getStorageKeyV2(cfg));
  } catch {
    /* ignore */
  }
  try {
    storage.removeItem(getStorageKeyV1(cfg));
  } catch {
    /* ignore */
  }
}

function safeGet(storage: StorageLike, key: string): string | null {
  try {
    return storage.getItem(key);
  } catch {
    return null;
  }
}

function safeParse(raw: string): unknown {
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

/**
 * `initColorFromScheme` wrapper that survives JSDOM / node environments where
 * `document` may not be fully scheme-aware. Used as a last-resort default.
 */
function tryInitColorFromScheme(cluster: ColorClusterDataConfig, cfg?: PanelConfig): ColorTweakState {
  try {
    return initColorFromScheme(cluster, cfg);
  } catch {
    // Fallback: a minimal black/white palette so migration stays deterministic.
    const palette = Array.from({ length: cluster.paletteSize }, (_, i) =>
      i === 0 ? '#000000' : i === cluster.paletteSize - 1 ? '#ffffff' : '#808080',
    );
    return {
      palette,
      background: cluster.baseDefaults.background ?? 0,
      foreground: cluster.baseDefaults.foreground ?? 0,
      cursor: cluster.baseDefaults.cursor ?? 0,
      selectionBg: cluster.baseDefaults.selectionBg ?? 0,
      selectionFg: cluster.baseDefaults.selectionFg ?? 0,
      semanticMappings: { ...cluster.semanticDefaults },
      shikiTheme: cluster.defaultShikiTheme,
    };
  }
}
