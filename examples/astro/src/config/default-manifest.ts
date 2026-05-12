/**
 * Demo tab config for the Astro example.
 *
 * Every `cssVar` is an `--astroexample-*` name. These line up byte-for-byte
 * with the declarations in `src/styles/tokens.css` so the panel can rewrite
 * the same names live and the apply pipeline can rewrite them on disk.
 *
 * Migrated in Wave 5 from TokenManifest to TabConfig[].
 */

import type { PanelConfig } from '@takazudo/zudo-design-token-panel/astro';

type TabConfig = PanelConfig['tabs'][number];

export const defaultTabs: readonly TabConfig[] = [
  {
    id: 'spacing',
    label: 'Spacing',
    tiers: [
      {
        id: 'raw',
        label: 'Spacing',
        items: [
          {
            id: 'astroexample-spacing-md',
            cssVar: '--astroexample-spacing-md',
            label: 'Spacing M',
            group: 'hsp',
            default: '1rem',
            type: { kind: 'length', min: 0, max: 4, step: 0.0625, unit: 'rem' },
          },
          {
            id: 'astroexample-spacing-lg',
            cssVar: '--astroexample-spacing-lg',
            label: 'Spacing L',
            group: 'vsp',
            default: '2rem',
            type: { kind: 'length', min: 0, max: 6, step: 0.0625, unit: 'rem' },
          },
        ],
      },
    ],
  },
  {
    id: 'font',
    label: 'Font',
    tiers: [
      {
        id: 'raw',
        label: 'Font Sizes',
        items: [
          {
            id: 'astroexample-text-base',
            cssVar: '--astroexample-text-base',
            label: 'Body Text',
            group: 'font-size',
            default: '1rem',
            type: { kind: 'length', min: 0.75, max: 1.5, step: 0.0625, unit: 'rem' },
          },
          {
            id: 'astroexample-text-heading',
            cssVar: '--astroexample-text-heading',
            label: 'Heading Text',
            group: 'font-size',
            default: '1.75rem',
            type: { kind: 'length', min: 1, max: 4, step: 0.0625, unit: 'rem' },
          },
        ],
      },
    ],
  },
  {
    id: 'size',
    label: 'Size',
    tiers: [
      {
        id: 'raw',
        label: 'Border Radius',
        items: [
          {
            id: 'astroexample-radius',
            cssVar: '--astroexample-radius',
            label: 'Border Radius',
            group: 'radius',
            default: '0.5rem',
            type: { kind: 'length', min: 0, max: 2, step: 0.0625, unit: 'rem' },
          },
        ],
      },
    ],
  },
  {
    id: 'color',
    label: 'Color',
    // Color tab is driven by colorCluster — no tiers needed here.
    tiers: [],
  },
];
