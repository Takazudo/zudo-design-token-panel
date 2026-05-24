/**
 * Astro sub-export entry — JS helpers and TypeScript types only.
 *
 * The host **component** is NOT re-exported here. Import it directly from
 * its dedicated `.astro` subexport so the consumer's Astro toolchain
 * compiles it natively:
 *
 * ```astro
 * import DesignTokenPanelHost from '@takazudo/zdtp/astro/DesignTokenPanelHost.astro';
 * ```
 *
 * Why not `import { DesignTokenPanelHost } from '@takazudo/zdtp/astro'`?
 * That named-export form forced `dist/astro/index.js` to statically
 * `import ... from './DesignTokenPanelHost.astro'`. As a `file:` workspace
 * link Vite compiles the `.astro`; as a real node_modules dependency it is
 * externalized, so Node hits the raw `.astro` at prerender and throws
 * `ERR_UNKNOWN_FILE_EXTENSION` (zdtp#308). Keeping this entry value-free
 * means that crash can't be reintroduced by following the docs.
 *
 * Type-only imports from this entry (`import type { PanelConfig } ...`) are
 * erased at build and stay safe — `PanelConfig` is re-exported here so
 * callers don't need a deep `@takazudo/zdtp/dist/config/panel-config`
 * import to type their config object.
 */

export type { PanelConfig } from '../config/panel-config';
// Re-exported so Astro-host wiring can type the entries of its
// `colorPresets` map without reaching into an internal sub-path.
export type { ColorScheme, ColorRef } from '../config/color-schemes';
// Re-exported so Astro-host `default-cluster.ts` config files can type the
// cluster object without reaching into an internal sub-path.
export type { ColorClusterConfig } from '../state/tweak-state';
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
