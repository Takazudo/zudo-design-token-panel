/**
 * Astro sub-export entry.
 *
 * Consumers import the host component via:
 *
 * ```astro
 * import { DesignTokenPanelHost } from '@takazudo/zudo-design-token-panel/astro';
 * ```
 *
 * The named-export pattern is preserved verbatim through the lib build:
 * `vite.config.ts` marks `*.astro` external (regex) so Vite leaves the
 * `from './DesignTokenPanelHost.astro'` literal in `dist/astro/index.js`,
 * and a postbuild copy step (`scripts/copy-astro-assets.mjs`) places the
 * raw `.astro` file alongside it. The consumer's own Astro toolchain then
 * resolves the relative path at build time.
 *
 * `PanelConfig` is re-exported here so callers don't need a deep
 * `@takazudo/zudo-design-token-panel/dist/config/panel-config` import to
 * type their config object.
 */

export { default as DesignTokenPanelHost } from './DesignTokenPanelHost.astro';
export type { PanelConfig } from '../config/panel-config';
// Re-exported so Astro-host wiring can type the entries of its
// `colorPresets` map without reaching into an internal sub-path.
export type { ColorScheme, ColorRef } from '../config/color-schemes';
// Exposed so host wrappers can lazy-load the preset map AFTER the SSR
// config blob is parsed. See `setPanelColorPresets` jsdoc in
// `panel-config.ts` for the rationale.
export { setPanelColorPresets } from '../config/panel-config';

// ---------------------------------------------------------------------------
// From src/config/color-schemes — bundled scheme registry
// ---------------------------------------------------------------------------
export { colorSchemes } from '../config/color-schemes';

// ---------------------------------------------------------------------------
// From src/config/color-scheme-utils — panel settings and semantic mappings
// ---------------------------------------------------------------------------
export { panelSettings, SEMANTIC_CSS_NAMES, SEMANTIC_DEFAULTS_ZD } from '../config/color-scheme-utils';

// ---------------------------------------------------------------------------
// From src/tokens/manifest — group ordering, titles, and public token types
// ---------------------------------------------------------------------------
export { GROUP_ORDER, FONT_GROUP_ORDER, SIZE_GROUP_ORDER, GROUP_TITLES } from '../tokens/manifest';
export type { TokenDef, TokenManifest } from '../tokens/manifest';
