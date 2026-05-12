/**
 * Demo tab config for the Vite + React example.
 *
 * Every `cssVar` is a `--vitereact-*` name. These line up byte-for-byte
 * with the declarations in `src/styles/tokens.css` so the panel can rewrite
 * the same names live and the apply pipeline can rewrite them on disk.
 *
 * Migrated in Wave 5 from TokenManifest to TabConfig[].
 */

import type { PanelConfig } from '@takazudo/zudo-design-token-panel';

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
            id: 'vitereact-spacing-md',
            cssVar: '--vitereact-spacing-md',
            label: 'Spacing M',
            group: 'hsp',
            default: '1rem',
            type: { kind: 'length', min: 0, max: 4, step: 0.0625, unit: 'rem' },
          },
          {
            id: 'vitereact-spacing-lg',
            cssVar: '--vitereact-spacing-lg',
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
            id: 'vitereact-text-base',
            cssVar: '--vitereact-text-base',
            label: 'Body Text',
            group: 'font-size',
            default: '1rem',
            type: { kind: 'length', min: 0.75, max: 1.5, step: 0.0625, unit: 'rem' },
          },
          {
            id: 'vitereact-text-heading',
            cssVar: '--vitereact-text-heading',
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
            id: 'vitereact-radius',
            cssVar: '--vitereact-radius',
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
