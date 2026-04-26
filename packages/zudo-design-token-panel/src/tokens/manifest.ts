/**
 * Token manifest — type definitions, helpers, and group ordering.
 *
 * After Sub 3 of the portable epic (#1553), this module ships ZERO baked-in
 * manifest data. The four token arrays that used to live here
 * (`SPACING_TOKENS`, `FONT_TOKENS`, `SIZE_TOKENS`, `COLOR_TOKENS`) moved to
 * `./zmod-default-manifest.ts` and are wired into `panelConfig.tokens` via the
 * default-fallback config in `../config/panel-config.ts`.
 *
 * Consumers supply their own manifest by passing a `TokenManifest` to
 * `configurePanel({...})` (see PORTABLE-CONTRACT.md §3). The package consumes
 * whatever the host hands in; tab components, `applyTokenOverrides`, and
 * `serialize`/`deserialize` all read from `getPanelConfig().tokens` at use
 * time so a host that calls `configurePanel` before mount sees its own data
 * everywhere.
 *
 * What stays here:
 *  - Public types: `TokenDef`, `TokenGroup`, `TokenControl`, `TokenManifest`.
 *  - Helpers: `parseNumericValue`, `formatValue`, `buildTokenIndex`.
 *  - Group ordering / titles consumed by the spacing / font / size tabs.
 */

/**
 * Manifest-group identifier.
 *
 * Sub S5a (#1588) opened this from the previously-closed union of zmod's
 * group ids (`'hsp' | 'vsp' | …`) to plain `string` so non-zmod consumers can
 * coin their own group ids without forking the package types. Tab components
 * key section headers off whatever string each `TokenDef.group` carries; the
 * display order and human title for an unknown group come from
 * `TokenManifest.spacingGroupOrder` / `fontGroupOrder` / `sizeGroupOrder` /
 * `groupTitles` (the consumer-supplied overrides), falling back to the
 * package-bundled `GROUP_ORDER` / `FONT_GROUP_ORDER` / `SIZE_GROUP_ORDER` /
 * `GROUP_TITLES` defaults so existing zmod consumers keep working unchanged.
 */
export type TokenGroup = string;

/**
 * Control kind for a token row.
 *
 * - `"slider"` — default; numeric range input paired with a number field.
 * - `"select"` — native `<select>` with `options` (e.g. font-weight 100..900).
 * - `"text"`   — free-form text input (e.g. font-family CSS string).
 *
 * `min`/`max`/`step`/`unit` are only meaningful for the slider control. They
 * stay on the interface with zero defaults for non-slider rows so the manifest
 * shape stays uniform.
 */
export type TokenControl = 'slider' | 'select' | 'text';

export interface TokenDef {
  /** Stable id used as the Record key in persisted state (e.g. `hsp-2xs`). */
  id: string;
  /** CSS custom property name written to `:root` (e.g. `--zd-spacing-hgap-2xs`). */
  cssVar: string;
  /** Display label shown in the panel row. */
  label: string;
  /** Manifest group — tab components use this for section headers. */
  group: TokenGroup;
  /** Default value as a CSS length string (e.g. `0.125rem`). */
  default: string;
  /** Slider min (numeric, in `unit`). Unused when `readonly`. */
  min: number;
  /** Slider max (numeric, in `unit`). Unused when `readonly`. */
  max: number;
  /** Slider step (numeric, in `unit`). Unused when `readonly`. */
  step: number;
  /** Unit suffix (e.g. `rem`, `px`). Read-only rows may use an empty string. */
  unit: string;
  /** Read-only tokens are displayed but not editable (e.g. `clamp()` expressions). */
  readonly?: true;
  /** Which control renders this token. Defaults to `"slider"` when absent. */
  control?: TokenControl;
  /** Select options — only used when `control === "select"`. */
  options?: readonly string[];
  /** Hide behind the per-tab Advanced `<details>` disclosure (font tab). */
  advanced?: true;
  /**
   * Opt-in "Pill" toggle. When present the control shows a checkbox that flips
   * between `value` (checked — e.g. `9999px` for full-radius pills) and a
   * slider-editable custom value (unchecked). Currently used for
   * `--radius-full`, where a slider alone can't meaningfully drive a 9999px
   * sentinel.
   */
  pill?: {
    /** CSS string applied when the pill checkbox is ON. */
    value: string;
    /** CSS string the slider falls back to when the pill is toggled OFF and
     *  there is no prior custom value yet. */
    customDefault: string;
  };
}

/**
 * Consumer-supplied token manifest (PORTABLE-CONTRACT.md §3.1).
 *
 * Each field is the per-tab token list:
 *  - `spacing` → spacing tab rows
 *  - `typography` → font tab rows (NOTE: field name is `typography`, not
 *    `font`. This follows the persist envelope's slice name. The host
 *    project's source array MAY still use the historical `FONT_TOKENS` name
 *    — only the field on `TokenManifest` is what the contract pins.)
 *  - `size` → size tab rows
 *  - `color` → color-tab per-token rows (zmod ships an empty array because
 *    color is driven by the cluster; cluster-less hosts populate this).
 *
 * Optional ordering / titles fields (added in Sub S5a, #1588): consumers may
 * supply their own per-tab group ordering and section-heading text. When
 * absent, the spacing / font / size tabs fall back to the package-bundled
 * `GROUP_ORDER` / `FONT_GROUP_ORDER` / `SIZE_GROUP_ORDER` / `GROUP_TITLES`
 * defaults so existing zmod-shaped manifests keep rendering exactly as
 * before. Non-zmod consumers that coin their own group ids MUST populate at
 * least the tab they care about and SHOULD populate `groupTitles` so the
 * section headers carry human-readable labels.
 */
export interface TokenManifest {
  spacing: readonly TokenDef[];
  typography: readonly TokenDef[];
  size: readonly TokenDef[];
  color: readonly TokenDef[];
  /** Optional spacing-tab group order. Defaults to `GROUP_ORDER`. */
  spacingGroupOrder?: readonly string[];
  /** Optional font-tab primary group order. Defaults to `FONT_GROUP_ORDER`. */
  fontGroupOrder?: readonly string[];
  /** Optional size-tab group order. Defaults to `SIZE_GROUP_ORDER`. */
  sizeGroupOrder?: readonly string[];
  /** Optional human-readable section titles keyed by group id. Defaults to `GROUP_TITLES`. */
  groupTitles?: Readonly<Record<string, string>>;
}

/** Convenience: build a lookup map keyed by token id. */
export function buildTokenIndex(
  ...groups: readonly (readonly TokenDef[])[]
): Record<string, TokenDef> {
  const out: Record<string, TokenDef> = {};
  for (const group of groups) {
    for (const t of group) {
      out[t.id] = t;
    }
  }
  return out;
}

/** Human-readable section titles for grouped rendering. */
export const GROUP_TITLES: Record<TokenGroup, string> = {
  hsp: 'HORIZONTAL SPACING (HSP)',
  vsp: 'VERTICAL SPACING (VSP)',
  icon: 'ICONS',
  layout: 'LAYOUT',
  'font-size': 'FONT SIZES',
  'line-height': 'LINE HEIGHTS',
  'font-weight': 'FONT WEIGHTS',
  'font-family': 'FONT FAMILIES',
  'font-scale': 'ADVANCED — SCALE (TIER 1)',
  radius: 'BORDER RADIUS',
  transition: 'TRANSITIONS',
};

/** Stable display order of groups within the Spacing tab. */
export const GROUP_ORDER: readonly TokenGroup[] = ['hsp', 'vsp', 'icon', 'layout'] as const;

/** Stable display order of primary groups within the Font tab.
 *  The `font-scale` group is rendered separately under an Advanced disclosure. */
export const FONT_GROUP_ORDER: readonly TokenGroup[] = [
  'font-size',
  'line-height',
  'font-weight',
  'font-family',
] as const;

/** Stable display order of size-tab groups. */
export const SIZE_GROUP_ORDER: readonly TokenGroup[] = ['radius', 'transition'] as const;

// --- Value parsing helpers (shared across controls + persist) ---

/**
 * Parse a CSS length string like `"1.5rem"` into its numeric part.
 * Returns `null` for anything non-numeric (e.g. `clamp(...)`, `"0"` counts as 0).
 *
 * Intentionally permissive: strips any non-numeric suffix after the leading
 * number, which is exactly what our slider rows need (user-typed `"1.5rem"` →
 * 1.5, `"12px"` → 12). Falls back to `null` for unparseable input so the caller
 * can decide the error UX.
 */
export function parseNumericValue(value: string): number | null {
  const match = value.trim().match(/^(-?\d+(?:\.\d+)?)/);
  if (!match) return null;
  const n = Number(match[1]);
  return Number.isFinite(n) ? n : null;
}

/** Format a numeric slider value back into the stored string form. */
export function formatValue(n: number, unit: string): string {
  // Trim needless trailing zeros but keep the value readable.
  // `Number.prototype.toString` already drops zeros for decimals, which is
  // what we want here.
  return `${n}${unit}`;
}
