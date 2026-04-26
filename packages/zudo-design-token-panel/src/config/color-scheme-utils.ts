/**
 * Color-scheme utilities for the design-token panel.
 *
 * Port adaptations:
 *
 * - The upstream `@/config/settings` import is removed. Only `colorScheme` and
 *   `colorMode` were ever consumed; both are inlined here as `panelSettings`
 *   so the panel package stays self-contained.
 * - `SEMANTIC_CSS_NAMES` points at this package's `--zd-semantic-*` CSS
 *   custom properties (example tokens shipped with the package). Upstream
 *   keys with no counterpart here (mermaid*, chat*, imageOverlay*,
 *   matchedKeyword*) are dropped.
 * - `SEMANTIC_DEFAULTS_ZD` mirrors the `--zd-semantic-*: var(--zd-pN)`
 *   mappings in the bundled tokens, so the panel's defaults on first open
 *   match the example CSS exactly.
 */

import { colorSchemes, type ColorScheme, type ColorRef } from './color-schemes';

// ---------------------------------------------------------------------------
// Inlined settings (replaces upstream `@/config/settings`)
// ---------------------------------------------------------------------------

/**
 * Minimal local replacement for the upstream `settings` object. The panel only
 * ever reads `colorScheme` and `colorMode`; the rest of the upstream settings
 * surface (i18n, sitemap, sidebars, …) is irrelevant here.
 *
 * If a future host wants to swap the active scheme without editing this
 * file, expose a setter or wire it through state — for now hard-coding to
 * `Default Dark` matches the example CSS in `tokens.css`.
 */
export const panelSettings = {
  colorScheme: 'Default Dark' as const,
  colorMode: false as
    | false
    | { defaultMode: 'light' | 'dark'; lightScheme: string; darkScheme: string },
};

// ---------------------------------------------------------------------------
// Semantic token mapping
// ---------------------------------------------------------------------------

/**
 * Default mapping: semantic token name → palette index.
 *
 * Mirrors the `--zd-semantic-*: var(--zd-pN)` declarations in the host
 * design-system tokens (example: examples/astro/.../tokens.css). Keep in
 * sync.
 */
export const SEMANTIC_DEFAULTS_ZD: Record<string, number> = {
  bg: 9,
  fg: 11,
  surface: 10,
  muted: 8,
  accent: 5,
  accentHover: 14,
  link: 4,
  codeBg: 0,
  codeFg: 7,
  success: 2,
  danger: 1,
  warning: 3,
  info: 4,
  price: 12,
  sold: 13,
  active: 14,
};

/**
 * Backwards-compatible alias for callers that just want `SEMANTIC_DEFAULTS`
 * without thinking about the suffix. Identical contents.
 */
export const SEMANTIC_DEFAULTS = SEMANTIC_DEFAULTS_ZD;

/**
 * Example default mapping for a secondary cluster: semantic token name →
 * palette index. This is an example shape that hosts can copy or replace
 * via `setPanelColorPresets` / `configurePanel` — not a normative table.
 *
 * Note the differences from the primary defaults:
 *  - Palette is 9 slots (pa0..pa8), not 16.
 *  - No `cursor` / `selectionBg` / `selectionFg` base roles.
 *  - Semantic table is shorter and uses kebab-case CSS var names
 *    (`--app-secondary-bg-deep`, etc.) — keys here stay camelCase to match
 *    the `semanticMappings` shape used by the panel.
 */
export const SEMANTIC_DEFAULTS_SECONDARY: Record<string, number> = {
  bg: 1,
  bgDeep: 0,
  surface: 2,
  border: 3,
  text: 6,
  textSecondary: 5,
  textMuted: 4,
  accent: 7,
  accentHover: 8,
};

/**
 * Example mapping of semantic token name → CSS custom property for a
 * secondary cluster. Hosts can override the prefix and shape via
 * `configurePanel`.
 */
export const SEMANTIC_CSS_NAMES_SECONDARY: Record<string, string> = {
  bg: '--app-secondary-bg',
  bgDeep: '--app-secondary-bg-deep',
  surface: '--app-secondary-surface',
  border: '--app-secondary-border',
  text: '--app-secondary-text',
  textSecondary: '--app-secondary-text-secondary',
  textMuted: '--app-secondary-text-muted',
  accent: '--app-secondary-accent',
  accentHover: '--app-secondary-accent-hover',
};

/**
 * Semantic token name → CSS custom property in this package's example
 * design system.
 *
 * Source of truth: the example `tokens.css` shipped under
 * `examples/astro/...`.
 */
export const SEMANTIC_CSS_NAMES: Record<string, string> = {
  bg: '--zd-semantic-bg',
  fg: '--zd-semantic-fg',
  surface: '--zd-semantic-surface',
  muted: '--zd-semantic-muted',
  accent: '--zd-semantic-accent',
  accentHover: '--zd-semantic-accent-hover',
  link: '--zd-semantic-link',
  codeBg: '--zd-semantic-code-bg',
  codeFg: '--zd-semantic-code-fg',
  success: '--zd-semantic-success',
  danger: '--zd-semantic-danger',
  warning: '--zd-semantic-warning',
  info: '--zd-semantic-info',
  price: '--zd-semantic-price',
  sold: '--zd-semantic-sold',
  active: '--zd-semantic-active',
};

export const lightDarkPairings = [
  { light: 'Default Light', dark: 'Default Dark', label: 'Default' },
];

// ---------------------------------------------------------------------------
// Scheme resolution
// ---------------------------------------------------------------------------

export function getActiveScheme(): ColorScheme {
  const scheme = colorSchemes[panelSettings.colorScheme];
  if (!scheme) {
    throw new Error(
      `Unknown color scheme: "${panelSettings.colorScheme}". Available: ${Object.keys(
        colorSchemes,
      ).join(', ')}`,
    );
  }
  return scheme;
}

/**
 * Resolve a `ColorRef` to a concrete color string.
 *
 * - `number`     → `palette[value]`
 * - `string`     → used as-is (treated as a literal CSS color)
 * - `undefined`  → `fallback`
 */
export function resolveColor(
  value: ColorRef | undefined,
  palette: string[],
  fallback: string,
): string {
  if (value === undefined) return fallback;
  if (typeof value === 'number') return palette[value] ?? fallback;
  return value;
}

/**
 * Resolve all semantic tokens for a scheme, falling back to the
 * `SEMANTIC_DEFAULTS_ZD` palette slot when the scheme doesn't override the
 * token.
 */
export function resolveSemanticColors(scheme: ColorScheme): Record<string, string> {
  const p = scheme.palette;
  const result: Record<string, string> = {};
  for (const [key, defaultIndex] of Object.entries(SEMANTIC_DEFAULTS_ZD)) {
    const override = scheme.semantic?.[key as keyof NonNullable<ColorScheme['semantic']>];
    result[key] = resolveColor(override, p, p[defaultIndex] ?? p[0]);
  }
  return result;
}

/**
 * Project a scheme to a flat list of `[cssVar, value]` pairs ready to inject
 * onto `:root`. Mirrors the upstream shape: base tokens (bg / fg / cursor /
 * selection), the full palette, then every semantic token.
 */
export function schemeToCssPairs(scheme: ColorScheme): [string, string][] {
  const p = scheme.palette;
  const sem = resolveSemanticColors(scheme);
  const pairs: [string, string][] = [
    ['--zd-bg', resolveColor(scheme.background, p, p[0])],
    ['--zd-fg', resolveColor(scheme.foreground, p, p[15])],
    ['--zd-cursor', resolveColor(scheme.cursor, p, p[6])],
    ['--zd-sel-bg', resolveColor(scheme.selectionBg, p, resolveColor(scheme.background, p, p[0]))],
    ['--zd-sel-fg', resolveColor(scheme.selectionFg, p, resolveColor(scheme.foreground, p, p[15]))],
    ...p.map((color, i) => [`--zd-p${i}`, color] as [string, string]),
  ];
  for (const [key, cssVar] of Object.entries(SEMANTIC_CSS_NAMES)) {
    pairs.push([cssVar, sem[key]!]);
  }
  return pairs;
}

export function generateCssCustomProperties(): string {
  const scheme = getActiveScheme();
  const pairs = schemeToCssPairs(scheme);
  const lines = [':root {', ...pairs.map(([prop, value]) => `  ${prop}: ${value};`), '}'];
  return lines.join('\n');
}

export function generateLightDarkCssProperties(): string {
  if (!panelSettings.colorMode) {
    throw new Error('colorMode is not configured');
  }
  const { lightScheme, darkScheme } = panelSettings.colorMode;
  const light = colorSchemes[lightScheme];
  const dark = colorSchemes[darkScheme];
  if (!light) throw new Error(`Unknown light scheme: "${lightScheme}"`);
  if (!dark) throw new Error(`Unknown dark scheme: "${darkScheme}"`);

  const lightPairs = schemeToCssPairs(light);
  const darkPairs = schemeToCssPairs(dark);

  if (lightPairs.length !== darkPairs.length) {
    throw new Error(
      `Light scheme has ${lightPairs.length} properties but dark scheme has ${darkPairs.length}`,
    );
  }

  const lines = [':root {', '  color-scheme: light dark;'];
  for (let i = 0; i < lightPairs.length; i++) {
    const prop = lightPairs[i][0];
    const lightVal = lightPairs[i][1];
    const darkVal = darkPairs[i][1];
    lines.push(`  ${prop}: light-dark(${lightVal}, ${darkVal});`);
  }
  lines.push('}');
  return lines.join('\n');
}
