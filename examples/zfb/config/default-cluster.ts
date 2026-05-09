/**
 * Demo color cluster for the zfb example.
 *
 * The cluster's CSS-var family is `--zfbexample-*` (palette + base roles +
 * semantic names), declared on `:root` by `styles/tokens.css`. Tweaks in
 * the panel write through these names; the apply pipeline (when wired through
 * the bin sidecar) rewrites the same names on disk.
 *
 * `paletteCssVarTemplate` is the only knob that decides the per-slot var name.
 * The cluster is JSON-serializable end-to-end so it round-trips through the
 * Preact island JSON boundary.
 */

import type { PanelConfig } from '@takazudo/zudo-design-token-panel/astro';

type ColorClusterDataConfig = PanelConfig['colorCluster'];

export const defaultCluster: ColorClusterDataConfig = {
  id: 'zfbexample-cluster',
  label: 'zfb Example',
  paletteSize: 16,
  baseRoles: {
    background: '--zfbexample-bg',
    foreground: '--zfbexample-fg',
  },
  paletteCssVarTemplate: '--zfbexample-palette-{n}',
  semanticDefaults: {
    primary: 1,
    accent: 3,
    surface: 0,
    muted: 8,
    danger: 5,
  },
  semanticCssNames: {
    primary: '--zfbexample-color-primary',
    accent: '--zfbexample-color-accent',
    surface: '--zfbexample-color-surface',
    muted: '--zfbexample-color-muted',
    danger: '--zfbexample-color-danger',
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
