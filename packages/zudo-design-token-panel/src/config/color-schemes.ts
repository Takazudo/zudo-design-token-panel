/**
 * Color-scheme types and bundled presets.
 *
 * Ported from zudo-doc (`/src/config/color-schemes.ts`).
 *
 * Differences from upstream:
 * - `shikiTheme` is typed as `string` (no Astro dependency).
 * - The `semantic` object exposes only the keys that this package has CSS
 *   variables for (see `color-scheme-utils.ts → SEMANTIC_CSS_NAMES`).
 *   Upstream keys with no counterpart here (mermaid*, chat*,
 *   imageOverlay*, matchedKeyword*) are dropped.
 * - Adds package-specific semantic keys: `bg`, `fg`, `link`, `price`, `sold`.
 */

/** A color reference: palette index (number) or direct color value (string) */
export type ColorRef = number | string;

export interface ColorScheme {
  background: ColorRef;
  foreground: ColorRef;
  cursor: ColorRef;
  selectionBg: ColorRef;
  selectionFg: ColorRef;
  palette: [
    string,
    string,
    string,
    string,
    string,
    string,
    string,
    string,
    string,
    string,
    string,
    string,
    string,
    string,
    string,
    string,
  ];
  /**
   * Shiki theme name. Loosely typed as a free-form string so we don't pull
   * in the Astro types (this package isn't an Astro app — this field is
   * preserved for symmetry with upstream presets and for any future
   * code-block tooling).
   */
  shikiTheme: string;
  /**
   * Optional semantic overrides — when omitted, defaults from
   * `SEMANTIC_DEFAULTS_ZD` (in `color-scheme-utils.ts`) are used.
   *
   * Each field accepts a palette index (number) or a direct color value
   * (string).
   */
  semantic?: {
    bg?: ColorRef;
    fg?: ColorRef;
    surface?: ColorRef;
    muted?: ColorRef;
    accent?: ColorRef;
    accentHover?: ColorRef;
    link?: ColorRef;
    codeBg?: ColorRef;
    codeFg?: ColorRef;
    success?: ColorRef;
    danger?: ColorRef;
    warning?: ColorRef;
    info?: ColorRef;
    price?: ColorRef;
    sold?: ColorRef;
  };
}

/**
 * Bundled color schemes shipped with the panel. Each scheme provides a
 * 16-color palette plus optional semantic overrides. The Scheme… dropdown in
 * the color tab lists these by name.
 *
 * Ported from upstream zudo-doc/src/config/color-schemes.ts (Default Light /
 * Default Dark) — palette and semantic mappings are unchanged because they
 * follow the standard p0–p15 convention and `SEMANTIC_DEFAULTS_ZD` re-uses the
 * same indices.
 */
export const colorSchemes: Record<string, ColorScheme> = {
  'Default Light': {
    background: 9,
    foreground: 11,
    cursor: 6,
    selectionBg: 11,
    selectionFg: 10,
    palette: [
      '#303030',
      '#dd3131',
      '#266538',
      '#a83838',
      '#3277c8',
      '#a35e0f',
      '#90a1b9',
      '#7a5218',
      '#6b6b6b',
      '#e2ddda',
      '#ece9e9',
      '#303030',
      '#5b99dc',
      '#b89ee7',
      '#8590a0',
      '#b91c1c',
    ],
    shikiTheme: 'catppuccin-latte',
    semantic: {
      surface: 10,
      muted: 8,
      accent: 5,
      accentHover: 14,
      codeBg: 10,
      codeFg: 11,
      success: 2,
      danger: 1,
      warning: 3,
      info: 4,
    },
  },
  'Default Dark': {
    background: 9,
    // p11 (light gray) — not p15. The example palette repurposes p15 as a
    // brand-red accent, so pinning `foreground` to p15 would paint the
    // panel's fg swatch red and make every `fg`-mapped semantic resolve
    // to red. p11 aligns with SEMANTIC_DEFAULTS_ZD.fg (also 11).
    foreground: 11,
    cursor: 6,
    selectionBg: 10,
    selectionFg: 11,
    palette: [
      '#1c1c1c',
      '#da6871',
      '#93bb77',
      '#dfbb77',
      '#5caae9',
      '#c074d6',
      '#90a1b9',
      '#a0a0a0',
      '#888888',
      '18',
      '#383838',
      '#e0e0e0',
      '#d69a66',
      '#c074d6',
      '#a7c0e3',
      '#b91c1c',
    ],
    shikiTheme: 'vitesse-dark',
    semantic: {
      surface: 0,
      muted: 8,
      accent: 12,
      accentHover: 14,
      codeBg: 10,
      codeFg: 11,
      success: 2,
      danger: 1,
      warning: 3,
      info: 4,
    },
  },
};
