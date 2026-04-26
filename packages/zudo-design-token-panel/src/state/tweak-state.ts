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
 * The primary color cluster is read from `getPanelConfig().colorCluster` at
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
  storageKey_open,
  storageKey_position,
  storageKey_stateV1,
  storageKey_stateV2,
} from '../config/panel-config';

// Re-export the cluster types under their historical names so existing call
// sites (build-apply-overrides.ts, apply-modal.tsx, tests) keep compiling.
// `ColorClusterConfig` is an alias for the JSON-serializable
// `ColorClusterDataConfig` — there is no separate runtime shape.
export type { BaseRoleKey, ColorClusterDataConfig } from '../config/cluster-config';
export { resolvePaletteCssVar } from '../config/cluster-config';
export type ColorClusterConfig = ColorClusterDataConfig;

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

export function getOpenKey(): string {
  return storageKey_open(getPanelConfig());
}

export function getPositionKey(): string {
  return storageKey_position(getPanelConfig());
}

// ---------------------------------------------------------------------------
// Panel position
// ---------------------------------------------------------------------------

export interface PanelPosition {
  top: number;
  right: number;
}

export const DEFAULT_POSITION: PanelPosition = { top: 60, right: 20 };

export function loadPosition(): PanelPosition {
  try {
    const saved = localStorage.getItem(getPositionKey());
    if (saved) {
      const parsed = JSON.parse(saved) as PanelPosition;
      if (typeof parsed.top === 'number' && typeof parsed.right === 'number') {
        return parsed;
      }
    }
  } catch {
    /* ignore */
  }
  return DEFAULT_POSITION;
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

// `_panelHeight` is currently unused — see B2 fix note below. Kept on the
// signature (with the underscore prefix that TypeScript treats as
// intentionally unused per `noUnusedParameters`) so callers (panel.tsx drag
// + resize handlers) can keep passing the measured offsetHeight without
// churn, and so a future "tall panel" carve-out has the data on hand.
export function clampPosition(
  top: number,
  right: number,
  panelWidth: number,
  _panelHeight: number,
): PanelPosition {
  // Horizontal: allow panel to extend past left/right edges, keep VISIBLE_MIN
  // px of grip visible so the user can drag it back. The header spans the
  // full panel width, so any leftover horizontal slice contains a draggable
  // strip of the header.
  const minRight = -(panelWidth - VISIBLE_MIN);
  const maxRightRaw = window.innerWidth - VISIBLE_MIN;
  // Vertical: ASYMMETRIC with the horizontal axis on purpose.
  //
  // The drag handle is the panel header (`panel.tsx` attaches `onMouseDown`
  // to `.tokenpanel-header`), which sits at the TOP of the panel. If we
  // mirrored the horizontal lower bound — `-(panelHeight - VISIBLE_MIN)` —
  // an upward drag would leave only the footer visible and the user could
  // no longer grab the header to drag the panel back. The pre-fix code
  // dodged this by hard-coding `-(VISIBLE_MIN / 2)`; the symmetric attempt
  // in PR #1440 review item B2 reintroduced the regression that codex
  // caught on review.
  //
  // The panel is also CSS-constrained to fit the viewport
  // (`maxHeight: calc(100vh - 32px)` in panel.tsx), so we don't need the
  // "scroll content into view" carve-out that a taller-than-viewport panel
  // would otherwise need. `panelHeight` is therefore unused on the lower
  // bound today.
  //
  // The pre-fix code's tautology bug (`panelHeight > 0 ? 0 : 0` always
  // yielding 0) is replaced with the simpler `window.innerHeight -
  // VISIBLE_MIN`. The original `Math.max(..., 0)` only mattered on
  // viewports shorter than VISIBLE_MIN, which we treat as a degenerate
  // case and don't special-case any more.
  const minTopRaw = -(VISIBLE_MIN / 2);
  const maxTopRaw = window.innerHeight - VISIBLE_MIN;
  // PR #1440 review item M-13 — guard against narrow / degenerate viewports
  // where the computed maximum would be lower than the minimum (innerHeight
  // < VISIBLE_MIN/2). When that happens, collapse maxTop to minTop so the
  // resulting Math.max/Math.min chain still produces a deterministic value
  // instead of relying on argument order.
  const maxTop = Math.max(maxTopRaw, minTopRaw);
  const maxRight = Math.max(maxRightRaw, minRight);
  return {
    top: Math.max(minTopRaw, Math.min(top, maxTop)),
    right: Math.max(minRight, Math.min(right, maxRight)),
  };
}

// ---------------------------------------------------------------------------
// Shiki — stubbed in zmod2
// ---------------------------------------------------------------------------

/**
 * Upstream re-highlights every `<pre>` on the page when the Shiki theme
 * changes. zmod2 does not use Shiki — we keep the function for API shape +
 * persisted-state round-tripping, but the body is a no-op.
 */
export async function applyShikiTheme(_themeName: string): Promise<void> {
  // zmod2 has no Shiki integration; preserved as a no-op for persist-envelope
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
 * location survives reloads. `zaudio` carries a second (optional) color
 * cluster used by Sub 7b — absent during Wave 1.
 */
export interface TweakState {
  color: ColorTweakState;
  spacing: TokenOverrides;
  typography: TokenOverrides;
  size: TokenOverrides;
  panelPosition?: PanelPosition;
  zaudio?: ColorTweakState;
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
 * Primary cluster — read from `getPanelConfig().colorCluster` at every call
 * site. The package itself ships ZERO baked-in cluster data; hosts MUST call
 * `configurePanel({ colorCluster })` to provide one.
 */

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

/** Convert any CSS color to hex using a canvas (cached context). */
let _canvasCtx: CanvasRenderingContext2D | null = null;
export function cssColorToHex(color: string): string {
  if (!color || color === 'initial' || color === 'inherit') return '#000000';
  if (/^#[0-9a-fA-F]{6}$/.test(color.trim())) return color.trim();
  if (/^#[0-9a-fA-F]{3}$/.test(color.trim())) {
    const c = color.trim();
    return `#${c[1]}${c[1]}${c[2]}${c[2]}${c[3]}${c[3]}`;
  }
  try {
    if (!_canvasCtx) _canvasCtx = document.createElement('canvas').getContext('2d');
    if (!_canvasCtx) return '#000000';
    _canvasCtx.fillStyle = color;
    const resolved = _canvasCtx.fillStyle;
    if (resolved.startsWith('#')) return resolved;
    const match = resolved.match(/^rgba?\((\d+),\s*(\d+),\s*(\d+)/);
    if (match) {
      const r = parseInt(match[1], 10);
      const g = parseInt(match[2], 10);
      const b = parseInt(match[3], 10);
      return `#${((1 << 24) | (r << 16) | (g << 8) | b).toString(16).slice(1)}`;
    }
    return '#000000';
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
 * light/dark mode. Reads `panelSettings` from the cluster (Sub 4) so a
 * host-supplied cluster can declare its own scheme + light/dark pairing
 * without editing the panel package.
 */
export function getActiveSchemeName(
  cluster: ColorClusterDataConfig = getPanelConfig().colorCluster,
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
 * cluster. Defaults to the host's primary cluster (`panelConfig.colorCluster`).
 *
 * Reads the scheme registry from `cluster.colorSchemes`. Clusters that ship
 * no schemes should not call this directly — they use
 * `initSecondaryDefaults(cluster)` instead because there is no scheme to
 * seed from.
 */
export function initColorFromScheme(
  cluster: ColorClusterDataConfig = getPanelConfig().colorCluster,
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
  cluster: ColorClusterDataConfig = getPanelConfig().colorCluster,
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
  cluster: ColorClusterDataConfig = getPanelConfig().colorCluster,
) {
  const len = state.palette.length;
  // Palette slots.
  for (let i = 0; i < len; i++) {
    setCssVar(resolvePaletteCssVar(cluster, i), state.palette[i]);
  }
  // Base roles — only write the roles this cluster declares. Iterate
  // `cluster.baseRoles` (rather than hardcoding all 5) so a cluster like
  // zaudio that ships zero base roles emits zero base-role writes.
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
 * overrides + optional zaudio cluster.
 *
 * Token manifests AND the primary color cluster are read from `panelConfig`
 * at call time (Sub 3 #1553 + Sub 4 #1554) so a host that calls
 * `configurePanel` before mount sees its own data driving the apply pass.
 */
export function applyFullState(state: TweakState) {
  const config = getPanelConfig();
  applyColorState(state.color, config.colorCluster);
  const tokens = config.tokens;
  applyTokenOverrides(tokens.spacing, state.spacing);
  applyTokenOverrides(tokens.typography, state.typography);
  applyTokenOverrides(tokens.size, state.size);
  // Sub S5b (#1589) — secondary cluster is host-driven via
  // `panelConfig.secondaryColorCluster`. When the host opted out (null),
  // skip the secondary apply pass entirely; even though `state.zaudio` may
  // still be hydrated for envelope round-trip purposes, no secondary CSS
  // vars belong to this host.
  const secondaryCluster = resolveSecondaryColorCluster(config);
  if (secondaryCluster && state.zaudio) {
    applyColorState(state.zaudio, secondaryCluster);
  }
}

/**
 * Strip all tweak-applied inline CSS variables so the stylesheet-provided
 * values from the active scheme take effect again.
 *
 * Accepts an optional list of clusters so callers can scope the wipe to a
 * subset; the default wipes BOTH `zd` and `zaudio` so a panel-level reset
 * leaves no stale inline overrides on `:root` regardless of which cluster
 * was last edited.
 */
export function clearAppliedStyles(
  clusters: readonly ColorClusterDataConfig[] = (() => {
    // Sub S5b (#1589) — default wipe set follows the host's configuration.
    // When the host opted out of the secondary cluster (null), only the
    // primary cluster's vars get cleared. Callers can still pass an
    // explicit list to scope the wipe further.
    const cfg = getPanelConfig();
    const secondary = resolveSecondaryColorCluster(cfg);
    return secondary ? [cfg.colorCluster, secondary] : [cfg.colorCluster];
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
  // Token manifests — same contract: wipe any inline overrides so stylesheet
  // defaults take effect again. Read from panelConfig so a host-supplied
  // manifest's cssVars get cleared (Sub 3, #1553).
  const tokens = getPanelConfig().tokens;
  for (const t of tokens.spacing) {
    if (t.readonly) continue;
    root.style.removeProperty(t.cssVar);
  }
  for (const t of tokens.typography) {
    if (t.readonly) continue;
    root.style.removeProperty(t.cssVar);
  }
  for (const t of tokens.size) {
    if (t.readonly) continue;
    root.style.removeProperty(t.cssVar);
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
  // PR #1440 review item P1-10 — palette is loaded from untrusted persisted
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
 * Legacy → current id mapping for the typography slice.
 *
 * Sub 6 (2026-04) renamed the font-size manifest ids from panel-internal
 * labels (`text-caption`, `text-small`, `text-body`, `text-subheading`,
 * `text-heading`, `text-display`) to main-site Tailwind tiers (`text-xs`,
 * `text-sm`, `text-base`, `text-lg`, `text-3xl`, `text-5xl`). The
 * `text-micro` id was dropped entirely (no `--zd-font-xxs` equivalent in the
 * design system).
 *
 * When a v2 payload comes in with the old ids we rewrite the keys here so
 * existing persisted tweaks survive the rename without the user losing
 * their work. Unknown / dropped ids (e.g. `text-micro`) are silently
 * discarded — they no longer route to anything.
 *
 * Note: spacing + size manifest ids were NOT renamed (hsp-/vsp- ids kept
 * their labels), so this migration only applies to the typography slice.
 */
const TYPOGRAPHY_ID_MIGRATIONS: Readonly<Record<string, string | null>> = {
  'text-caption': 'text-xs',
  'text-small': 'text-sm',
  'text-body': 'text-base',
  'text-subheading': 'text-lg',
  'text-heading': 'text-3xl',
  'text-display': 'text-5xl',
  // Dropped — no main-site equivalent. Null signals "discard".
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
 * Same as `hydrateOverrides` but also rewrites legacy typography-slice keys
 * per `TYPOGRAPHY_ID_MIGRATIONS`. If BOTH the old and new ids are present,
 * the new id wins (user actively tweaked it post-migration). Keys mapped to
 * `null` are dropped.
 */
function hydrateTypographyOverrides(raw: unknown): TokenOverrides {
  if (!raw || typeof raw !== 'object') return {};
  const out: TokenOverrides = {};
  for (const [k, v] of Object.entries(raw as Record<string, unknown>)) {
    if (typeof v !== 'string') continue;
    if (k in TYPOGRAPHY_ID_MIGRATIONS) {
      const target = TYPOGRAPHY_ID_MIGRATIONS[k];
      if (target === null) continue; // dropped id
      if (!(target in out)) {
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
    typeof o.right === 'number' &&
    Number.isFinite(o.top) &&
    Number.isFinite(o.right)
  ) {
    return { top: o.top, right: o.right };
  }
  return undefined;
}

export function loadPersistedState(
  storage: StorageLike = localStorage,
  colorDefaults?: ColorTweakState,
  cluster: ColorClusterDataConfig = getPanelConfig().colorCluster,
): TweakState | null {
  const STORAGE_KEY_V1 = getStorageKeyV1();
  const STORAGE_KEY_V2 = getStorageKeyV2();
  // 1. v2 wins.
  const rawV2 = safeGet(storage, STORAGE_KEY_V2);
  if (rawV2 !== null) {
    const parsed = safeParse(rawV2);
    if (parsed && typeof parsed === 'object') {
      const obj = parsed as {
        color?: unknown;
        spacing?: unknown;
        typography?: unknown;
        font?: unknown; // upstream alias — migrated into `typography`
        size?: unknown;
        panelPosition?: unknown;
        zaudio?: unknown;
      };
      if (obj.color && isValidColorShape(obj.color, cluster.paletteSize)) {
        const defaults = colorDefaults ?? tryInitColorFromScheme(cluster);
        const typographySlice = obj.typography !== undefined ? obj.typography : obj.font;
        const next: TweakState = {
          color: hydrateColorState(obj.color as Partial<ColorTweakState>, defaults),
          // New sections added after v1 migration — tolerate their absence so
          // older v2 payloads (Color-only) still load cleanly.
          spacing: hydrateOverrides(obj.spacing),
          // Typography slice: run through the Sub 6 id migration so payloads
          // persisted under the old ids (text-caption, text-body, …) survive
          // the rename to main-site tiers (text-xs, text-base, …).
          typography: hydrateTypographyOverrides(typographySlice),
          size: hydrateOverrides(obj.size),
          panelPosition: hydratePanelPosition(obj.panelPosition),
        };
        // Optional secondary slice (legacy field name `zaudio`) — validated
        // against the active secondary cluster's palette size, NOT the
        // primary cluster's. When the host opted out
        // (`secondaryColorCluster: null` or omitted), there is no secondary
        // cluster to validate against, so we skip hydration entirely — the
        // apply path also skips secondary writes, and the JSON envelope
        // simply omits the slice for opt-out hosts. Defaults come from
        // `initSecondaryDefaults(cluster)`.
        const secondaryCluster = resolveSecondaryColorCluster();
        if (
          secondaryCluster &&
          obj.zaudio &&
          isValidColorShape(obj.zaudio, secondaryCluster.paletteSize)
        ) {
          next.zaudio = hydrateColorState(
            obj.zaudio as Partial<ColorTweakState>,
            initSecondaryDefaults(secondaryCluster),
          );
        }
        return next;
      }
    }
    // v2 present but malformed — warn and fall through to v1 check.
    console.warn(`[tweak] Malformed ${STORAGE_KEY_V2}, attempting v1 migration`);
  }

  // 2. v1 migration.
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
        storage.setItem(STORAGE_KEY_V2, JSON.stringify(migrated));
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

  // 3. Fresh defaults.
  return null;
}

/** Persist the full `TweakState` to v2. */
export function savePersistedState(state: TweakState, storage: StorageLike = localStorage) {
  try {
    storage.setItem(getStorageKeyV2(), JSON.stringify(state));
  } catch {
    // Storage full.
  }
}

/** Remove v2 (and lingering v1) keys. */
export function clearPersistedState(storage: StorageLike = localStorage) {
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
