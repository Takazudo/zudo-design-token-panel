/**
 * Demo color cluster for the Astro example.
 *
 * The cluster's CSS-var family is `--astroexample-*` (palette + base roles +
 * semantic names), declared on `:root` by `src/styles/tokens.css`. Tweaks in
 * the panel write through these names; the apply pipeline (when wired through
 * the bin sidecar) rewrites the same names on disk.
 *
 * `paletteCssVarTemplate` is the only knob that decides the per-slot var name.
 * The cluster is JSON-serializable end-to-end so it round-trips through the
 * Astro frontmatter → island JSON boundary.
 */

import type { PanelConfig } from '@takazudo/zudo-design-token-panel/astro';

type ColorClusterDataConfig = PanelConfig['colorCluster'];

export const defaultCluster: ColorClusterDataConfig = {
  id: 'astroexample-cluster',
  label: 'Astro Example',
  paletteSize: 16,
  baseRoles: {
    background: '--astroexample-bg',
    foreground: '--astroexample-fg',
  },
  paletteCssVarTemplate: '--astroexample-palette-{n}',
  semanticDefaults: {
    primary: 1,
    accent: 3,
    surface: 0,
    muted: 8,
    danger: 5,
  },
  semanticCssNames: {
    primary: '--astroexample-color-primary',
    accent: '--astroexample-color-accent',
    surface: '--astroexample-color-surface',
    muted: '--astroexample-color-muted',
    danger: '--astroexample-color-danger',
  },
  baseDefaults: {
    background: 0,
    foreground: 15,
  },
  defaultShikiTheme: 'github-dark',
  colorSchemes: {
    Default: {
      background: 0,
      foreground: 15,
      cursor: 4,
      selectionBg: 1,
      selectionFg: 15,
      palette: [
        '#1e1e1e',
        '#2d6cdf',
        '#3aa676',
        '#d97706',
        '#9b5de5',
        '#e63946',
        '#1d3557',
        '#06b6d4',
        '#475569',
        '#94a3b8',
        '#cbd5e1',
        '#e2e8f0',
        '#f1f5f9',
        '#fef3c7',
        '#bbf7d0',
        '#f8fafc',
      ],
      shikiTheme: 'github-dark',
    },
  },
  panelSettings: {
    colorScheme: 'Default',
    colorMode: false,
  },
};
