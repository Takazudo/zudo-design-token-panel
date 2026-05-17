/**
 * Demo color cluster for the Astro example.
 *
 * The cluster's CSS-var family is `--astro-*` (palette + base roles +
 * semantic names), declared on `:root` by `src/styles/tokens.css`. Tweaks in
 * the panel write through these names; the apply pipeline (when wired through
 * the bin sidecar) rewrites the same names on disk.
 *
 * `paletteCssVarTemplate` is the only knob that decides the per-slot var name.
 * The cluster is JSON-serializable end-to-end so it round-trips through the
 * Astro frontmatter → island JSON boundary.
 *
 * Mirrors examples/zfb-tailwind/config/default-cluster.ts with --zfbtw-* → --astro-*
 * and includes success/warning semantic roles added in framework-demo-parity (#185).
 */

import type { ColorClusterConfig as ColorClusterDataConfig } from '@takazudo/zudo-design-token-panel/astro';

export const defaultCluster: ColorClusterDataConfig = {
  id: 'astro-cluster',
  label: 'Astro Example',
  paletteSize: 16,
  baseRoles: {
    background: '--astro-bg',
    foreground: '--astro-fg',
  },
  paletteCssVarTemplate: '--astro-palette-{n}',
  semanticDefaults: {
    primary: 1,
    accent: 3,
    surface: 0,
    muted: 8,
    success: 2,
    warning: 3,
    danger: 5,
  },
  semanticCssNames: {
    primary: '--astro-color-primary',
    accent:  '--astro-color-accent',
    surface: '--astro-color-surface',
    muted:   '--astro-color-muted',
    success: '--astro-color-success',
    warning: '--astro-color-warning',
    danger:  '--astro-color-danger',
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
