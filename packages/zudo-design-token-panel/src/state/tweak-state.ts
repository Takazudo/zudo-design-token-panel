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
 * format for no real benefit.
 */

import type { ColorRef, ColorScheme } from '../config/color-schemes';
import type { TokenDef } from '../tokens/manifest';
import {
  type BaseRoleKey,
  type ColorClusterDataConfig,
  resolvePaletteCssVar,
} from '../config/cluster-config';
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
} from '../config/panel-config';
import { resolvePrimaryColorCluster } from '../config/cluster-config';
import type { TabConfig } from '../tokens/tier-model';
import {
  type TabOverrides,
  emitTierItemCssValue,
  resolveTierItemValue,
} from '../apply/tier-resolver';

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
 * Each helper reads `getPanelConfig()` on every call so a `configurePanel`
 * call that lands *after* this module is imported still influences the keys
 * the panel hits. Capturing the values at module load would freeze them
 * before the host has a chance to configure.
 */
export function getStorageKeyV1(): string {
  return storageKey_stateV1(getPanelConfig());
}

export function getStorageKeyV2(): string {
  return storageKey_stateV2(getPanelConfig());
}

export function getStorageKeyV3(): string {
  return storageKey_stateV3(getPanelConfig());
}

export function getOpenKey(): string {
  return storageKey_open(getPanelConfig());
}

export function getPositionKey(): string {
  return storageKey_position(getPanelConfig());
}

export function getSizeKey(): string {
  return storageKey_size(getPanelConfig());
}

export function getDensityKey(): string {
  return storageKey_density(getPanelConfig());
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

export function loadPosition(): PanelPosition {
  try {
    const saved = localStorage.getItem(getPositionKey());
    if (saved) {
      const parsed = JSON.parse(saved) as PanelPosition;
      if (typeof parsed.top === 'number' && typeof parsed.left === 'number') {
        return parsed;
      }
    }
  } catch {
    /* ignore */
  }
  return defaultPosition();
}

export function savePosition(pos: PanelPosition) {
  try {
    localStorage.setItem(getPositionKey(), JSON.stringify(pos));
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
 * experience the same default size after this PR ships.
 */
export function defaultSize(): PanelSize {
  if (typeof window === 'undefined') return DEFAULT_SIZE;
  return {
    width: Math.min(1200, 0.8 * window.innerWidth),
    height: Math.min(800, 0.8 * window.innerHeight),
  };
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

export function loadSize(): PanelSize {
  try {
    const saved = localStorage.getItem(getSizeKey());
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

export function saveSize(size: PanelSize) {
  try {
    localStorage.setItem(getSizeKey(), JSON.stringify(size));
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
  if (density === 0) return '12rem';
  if (density === 2) return '100%';
  return '18rem';
}

export function loadDensity(): PanelDensity {
  try {
    const saved = localStorage.getItem(getDensityKey());
    if (saved === '0' || saved === '1' || saved === '2') {
      return Number(saved) as PanelDensity;
    }
  } catch {
    /* ignore */
  }
  return DEFAULT_DENSITY;
}

export function saveDensity(density: PanelDensity) {
  try {
    localStorage.setItem(getDensityKey(), String(density));
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
  semanticMappings: Record<string, number | 'bg' | 'fg'>;
  shikiTheme: string;
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
 * `panelPosition` is persisted alongside the envelope so the user's drag
 * location survives reloads. `secondary` carries a second (optional) color
 * cluster — absent until a host opts in.
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
  panelPosition?: PanelPosition;
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
 *
 * The base-role indices are kept on the state shape for envelope-round-trip
 * compatibility but are inert — `applyColorState` only writes a base role
 * when the cluster declares the corresponding `baseRoles` entry.
 */
export function initSecondaryDefaults(cluster: ColorClusterDataConfig): ColorTweakState {
  // Deterministic grayscale ramp. Index 0 → black, last → white, middle
  // slots interpolate. Functional but visually flat; hosts wanting a
  // designed seed should ship a scheme registry on the cluster.
  const size = Math.max(1, cluster.paletteSize);
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
 * `ColorTweakState` from the active panel config's secondary cluster.
 * Returns `undefined` when the host opted out of the secondary cluster
 * (`secondaryColorCluster: null` or omitted).
 */
export function initSecondaryFromConfig(): ColorTweakState | undefined {
  const secondary = resolveSecondaryColorCluster();
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

/** Parse an rgb()/rgba() string to a hex colour, or return null on failure. */
function _rgbStringToHex(color: string): string | null {
  const match = color.match(/^rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/);
  if (!match) return null;
  const r = parseInt(match[1], 10);
  const g = parseInt(match[2], 10);
  const b = parseInt(match[3], 10);
  return `#${((1 << 24) | (r << 16) | (g << 8) | b).toString(16).slice(1)}`;
}

/** Convert any CSS color to hex using a canvas (cached context). */
let _canvasCtx: CanvasRenderingContext2D | null = null;
export function cssColorToHex(color: string): string {
  if (!color || color === 'initial' || color === 'inherit') return '#000000';
  const trimmed = color.trim();
  if (/^#[0-9a-fA-F]{6}$/.test(trimmed)) return trimmed;
  if (/^#[0-9a-fA-F]{3}$/.test(trimmed)) {
    return `#${trimmed[1]}${trimmed[1]}${trimmed[2]}${trimmed[2]}${trimmed[3]}${trimmed[3]}`;
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
    _canvasCtx.fillStyle = trimmed;
    const resolved = _canvasCtx.fillStyle;
    if (resolved.startsWith('#')) return resolved;
    return _rgbStringToHex(resolved) ?? '#000000';
  } catch {
    return '#000000';
  }
}

export function setCssVar(name: string, value: string) {
  document.documentElement.style.setProperty(name, value);
}

/**
 * Resolve a `ColorRef` to a palette index. If it's already a number, use it.
 * If it's a string, find an exact palette match or the nearest color by RGB
 * distance. `fallback` is returned only when `ref` is undefined.
 */
export function colorRefToIndex(
  ref: ColorRef | undefined,
  palette: string[],
  fallback: number,
): number {
  if (ref === undefined) return fallback;
  if (typeof ref === 'number') return ref;
  // String: try exact match in palette.
  const idx = palette.indexOf(ref);
  if (idx >= 0) return idx;
  // No exact match — find nearest palette color by RGB distance.
  const refHex = cssColorToHex(ref);
  const refRgb = hexToRgb(refHex);
  let bestIdx = fallback;
  let bestDist = Infinity;
  for (let i = 0; i < palette.length; i++) {
    const pHex = cssColorToHex(palette[i]);
    const pRgb = hexToRgb(pHex);
    const dist = (refRgb.r - pRgb.r) ** 2 + (refRgb.g - pRgb.g) ** 2 + (refRgb.b - pRgb.b) ** 2;
    if (dist < bestDist) {
      bestDist = dist;
      bestIdx = i;
    }
  }
  return bestIdx;
}

/** Parse a hex color string to RGB components. */
function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const h = hex.replace('#', '');
  return {
    r: parseInt(h.substring(0, 2), 16) || 0,
    g: parseInt(h.substring(2, 4), 16) || 0,
    b: parseInt(h.substring(4, 6), 16) || 0,
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
 */
export function getActiveSchemeName(
  cluster: ColorClusterDataConfig = getActivePrimaryCluster(),
): string {
  const settings = cluster.panelSettings;
  if (settings.colorMode) {
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
 */
export function initColorFromScheme(
  cluster: ColorClusterDataConfig = getActivePrimaryCluster(),
): ColorTweakState {
  const schemes = cluster.colorSchemes;
  // No schemes → fall back to the deterministic neutral seed. This keeps the
  // package boot-able when no host has called `configurePanel` (the bundled
  // stub cluster ships zero schemes), and it matches the documented contract
  // for cluster-shaped data without a scheme registry.
  if (Object.keys(schemes).length === 0) {
    return initSecondaryDefaults(cluster);
  }
  const schemeName = getActiveSchemeName(cluster);
  const scheme = schemes[schemeName] ?? Object.values(schemes)[0];
  return initColorFromSchemeData(scheme, cluster);
}

export function initColorFromSchemeData(
  scheme: ColorScheme,
  cluster: ColorClusterDataConfig = getActivePrimaryCluster(),
): ColorTweakState {
  const palette = scheme.palette.map((c) => cssColorToHex(c));
  const semanticMappings: Record<string, number | 'bg' | 'fg'> = {};
  for (const [key, defaultVal] of Object.entries(cluster.semanticDefaults)) {
    const schemeVal = scheme.semantic?.[key as keyof typeof scheme.semantic];
    if (schemeVal === undefined) {
      semanticMappings[key] = defaultVal;
    } else if (typeof schemeVal === 'number') {
      semanticMappings[key] = schemeVal;
    } else {
      // String value — find in palette or nearest match.
      semanticMappings[key] = colorRefToIndex(schemeVal, scheme.palette, defaultVal);
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

/** Resolve a semantic mapping to an actual color (bounds-checked). */
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

/** Apply a single `ColorTweakState` to the DOM using the given cluster config. */
export function applyColorState(
  state: ColorTweakState,
  cluster: ColorClusterDataConfig = getActivePrimaryCluster(),
) {
  const len = state.palette.length;
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
    setCssVar(cssName, resolveMapping(mapping, state.palette, state.background, state.foreground));
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
export function applyTokenOverrides(tokens: readonly TokenDef[], overrides: TokenOverrides) {
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
 */
export function applyFullState(state: TweakState) {
  const config = getPanelConfig();
  // Primary color cluster is derived from the color TabConfig.
  applyColorState(state.color, getActivePrimaryCluster(config));
  // Apply spacing / typography / size from tabs[] (required field post-Wave-5).
  applyTabOverridesFlat(config.tabs, 'spacing', state.spacing);
  applyTabOverridesFlat(config.tabs, 'font', state.typography);
  applyTabOverridesFlat(config.tabs, 'size', state.size);
  // The secondary cluster is host-driven via the 'color-secondary' tab.
  // When no such tab is configured, skip the secondary apply pass entirely.
  const secondaryCluster = resolveSecondaryColorCluster(config);
  if (secondaryCluster && state.secondary) {
    applyColorState(state.secondary, secondaryCluster);
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
 */
function applyTabOverridesFlat(
  tabs: readonly TabConfig[],
  tabId: string,
  overrides: TokenOverrides,
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
 * Strip all tweak-applied inline CSS variables so the stylesheet-provided
 * values from the active scheme take effect again.
 *
 * Accepts an optional list of clusters so callers can scope the wipe to a
 * subset; the default wipes both the primary and secondary clusters so a
 * panel-level reset leaves no stale inline overrides on `:root` regardless
 * of which cluster was last edited.
 */
export function clearAppliedStyles(
  clusters: readonly ColorClusterDataConfig[] = (() => {
    // Default wipe set follows the host's configuration. Derive clusters
    // from the color tabs (primary + optional secondary).
    const cfg = getPanelConfig();
    const primary = getActivePrimaryCluster(cfg);
    const secondary = resolveSecondaryColorCluster(cfg);
    return secondary ? [primary, secondary] : [primary];
  })(),
) {
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
  // Tabs — clear all cssVars for items in spacing/font/size tabs so the
  // stylesheet defaults take effect again.
  for (const tab of getPanelConfig().tabs) {
    // Color tab vars are handled above via cluster clear paths.
    if (tab.id === 'color') continue;
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
    semanticMappings:
      partial.semanticMappings && typeof partial.semanticMappings === 'object'
        ? { ...defaults.semanticMappings, ...partial.semanticMappings }
        : defaults.semanticMappings,
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

/** Narrow a stored value into a `PanelPosition`, or undefined if malformed. */
function hydratePanelPosition(raw: unknown): PanelPosition | undefined {
  if (!raw || typeof raw !== 'object') return undefined;
  const o = raw as Record<string, unknown>;
  if (
    typeof o.top === 'number' &&
    typeof o.left === 'number' &&
    Number.isFinite(o.top) &&
    Number.isFinite(o.left)
  ) {
    return { top: o.top, left: o.left };
  }
  return undefined;
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
    panelPosition?: unknown;
    secondary?: unknown;
    tabs?: unknown;
  },
  cluster: ColorClusterDataConfig,
  colorDefaults?: ColorTweakState,
): TweakState | null {
  if (!obj.color || !isValidColorShape(obj.color, cluster.paletteSize)) return null;

  const defaults = colorDefaults ?? tryInitColorFromScheme(cluster);
  const typographySlice = obj.typography !== undefined ? obj.typography : obj.font;
  // Rename map sourced from the active panel config. Defaults to an
  // empty map (no renaming) so hosts whose manifest ids are stable are
  // not corrupted — see issue #51 and the doc on
  // `ZDTP_LEGACY_TYPOGRAPHY_RENAME_MAP` for the opt-in zdtp-internal
  // map.
  const renameMap = getPanelConfig().legacyIdRenameMap ?? {};
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
    panelPosition: hydratePanelPosition(obj.panelPosition),
  };
  // Optional secondary slice — validated against the active secondary
  // cluster's palette size, NOT the primary cluster's. When the host
  // opted out (`secondaryColorCluster: null` or omitted), there is no
  // secondary cluster to validate against, so we skip hydration
  // entirely — the apply path also skips secondary writes, and the
  // JSON envelope simply omits the slice for opt-out hosts. Defaults
  // come from `initSecondaryDefaults(cluster)`.
  const secondaryCluster = resolveSecondaryColorCluster();
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
): TweakState | null {
  const STORAGE_KEY_V1 = getStorageKeyV1();
  const STORAGE_KEY_V2 = getStorageKeyV2();
  const STORAGE_KEY_V3 = getStorageKeyV3();

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
        panelPosition?: unknown;
        secondary?: unknown;
        tabs?: unknown;
      };
      const next = hydrateV2OrV3Object(obj, cluster, colorDefaults);
      if (next !== null) {
        // Renormalize storage when the typography migration actually changed
        // the slice (rename or null-drop) OR the legacy `font` alias was
        // used instead of `typography`. Without this, legacy ids and dropped
        // entries survive on disk indefinitely as dead data, and a host
        // that later removes the opt-in rename map regresses every user
        // back to non-applying overrides.
        const typographySlice = obj.typography !== undefined ? obj.typography : obj.font;
        const typographyChanged =
          JSON.stringify(typographySlice ?? {}) !== JSON.stringify(next.typography);
        if (typographyChanged || obj.typography === undefined) {
          try {
            storage.setItem(STORAGE_KEY_V3, JSON.stringify(next));
          } catch {
            /* storage full — return the in-memory state anyway */
          }
        }
        return next;
      }
    }
    // v3 present but malformed — warn and fall through to v2 check.
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
        panelPosition?: unknown;
        secondary?: unknown;
        tabs?: unknown;
      };
      const migrated = hydrateV2OrV3Object(obj, cluster, colorDefaults);
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
    // v2 present but malformed — warn and fall through to v1 check.
    console.warn(`[tweak] Malformed ${STORAGE_KEY_V2}, attempting v1 migration`);
  }

  // 3. v1 → v3 migration.
  const rawV1 = safeGet(storage, STORAGE_KEY_V1);
  if (rawV1 !== null) {
    const parsed = safeParse(rawV1);
    if (parsed && typeof parsed === 'object' && isValidColorShape(parsed, cluster.paletteSize)) {
      const defaults = colorDefaults ?? tryInitColorFromScheme(cluster);
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

/** Persist the full `TweakState` to v3. */
export function savePersistedState(state: TweakState, storage: StorageLike = localStorage) {
  try {
    storage.setItem(getStorageKeyV3(), JSON.stringify(state));
  } catch {
    // Storage full.
  }
}

/** Remove v3 (and lingering v2/v1) keys. */
export function clearPersistedState(storage: StorageLike = localStorage) {
  try {
    storage.removeItem(getStorageKeyV3());
  } catch {
    /* ignore */
  }
  try {
    storage.removeItem(getStorageKeyV2());
  } catch {
    /* ignore */
  }
  try {
    storage.removeItem(getStorageKeyV1());
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
function tryInitColorFromScheme(cluster: ColorClusterDataConfig): ColorTweakState {
  try {
    return initColorFromScheme(cluster);
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
