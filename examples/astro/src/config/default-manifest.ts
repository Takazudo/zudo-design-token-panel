/**
 * Demo token manifest for the Astro example.
 *
 * Every `cssVar` is an `--astroexample-*` name. These line up byte-for-byte
 * with the declarations in `src/styles/tokens.css` so the panel can rewrite
 * the same names live and the apply pipeline can rewrite them on disk.
 *
 * `TokenManifest` is reachable via the indexed-access lookup
 * `PanelConfig['tokens']` — the package's public Astro entry only re-exports
 * `PanelConfig`, so this avoids a deep import into `dist/tokens/manifest`.
 *
 * `spacingGroupOrder` is set to `['vsp', 'hsp']` (vertical above horizontal),
 * proving the host-supplied ordering field overrides the package default.
 */

import type { PanelConfig } from '@takazudo/zudo-design-token-panel/astro';

type TokenManifest = PanelConfig['tokens'];

export const defaultManifest: TokenManifest = {
  spacing: [
    {
      id: 'astroexample-spacing-md',
      cssVar: '--astroexample-spacing-md',
      label: 'Spacing M',
      group: 'hsp',
      default: '1rem',
      min: 0,
      max: 4,
      step: 0.0625,
      unit: 'rem',
    },
    {
      id: 'astroexample-spacing-lg',
      cssVar: '--astroexample-spacing-lg',
      label: 'Spacing L',
      group: 'vsp',
      default: '2rem',
      min: 0,
      max: 6,
      step: 0.0625,
      unit: 'rem',
    },
  ],
  typography: [
    {
      id: 'astroexample-text-base',
      cssVar: '--astroexample-text-base',
      label: 'Body Text',
      group: 'font-size',
      default: '1rem',
      min: 0.75,
      max: 1.5,
      step: 0.0625,
      unit: 'rem',
    },
    {
      id: 'astroexample-text-heading',
      cssVar: '--astroexample-text-heading',
      label: 'Heading Text',
      group: 'font-size',
      default: '1.75rem',
      min: 1,
      max: 4,
      step: 0.0625,
      unit: 'rem',
    },
  ],
  size: [
    {
      id: 'astroexample-radius',
      cssVar: '--astroexample-radius',
      label: 'Border Radius',
      group: 'radius',
      default: '0.5rem',
      min: 0,
      max: 2,
      step: 0.0625,
      unit: 'rem',
    },
  ],
  // Color tab is driven by the cluster — leave per-token rows empty.
  color: [],
  spacingGroupOrder: ['vsp', 'hsp'],
};
