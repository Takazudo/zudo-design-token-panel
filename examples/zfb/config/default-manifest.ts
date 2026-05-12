/**
 * Demo tab config for the zfb example.
 *
 * Every `cssVar` is a `--zfbexample-*` name. These line up byte-for-byte
 * with the declarations in `styles/global.css` so the panel can rewrite
 * the same names live and the apply pipeline can rewrite them on disk.
 *
 * The font tab uses a 2-tier setup (Wave 5):
 *   - Tier `raw` (in advancedTiers disclosure): 6 scale items
 *   - Tier `semantic` (referencesTier: 'raw'): text-base and text-heading
 *     each default to a scale item id and emit var(--zfbexample-scale-*)
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
            id: 'zfbexample-spacing-md',
            cssVar: '--zfbexample-spacing-md',
            label: 'Spacing M',
            group: 'hsp',
            default: '1rem',
            type: { kind: 'length', min: 0, max: 4, step: 0.0625, unit: 'rem' },
          },
          {
            id: 'zfbexample-spacing-lg',
            cssVar: '--zfbexample-spacing-lg',
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
    // Raw scale tier is an advanced (disclosed) section; semantic roles are
    // shown at the top level. advancedTiers matches the tier id 'raw'.
    advancedTiers: ['raw'],
    tiers: [
      {
        id: 'raw',
        label: 'Type Scale',
        items: [
          {
            id: 'zfbexample-scale-xs',
            cssVar: '--zfbexample-scale-xs',
            label: 'Scale XS',
            group: 'font-scale',
            default: '0.75rem',
            type: { kind: 'length', min: 0.5, max: 2, step: 0.0625, unit: 'rem' },
          },
          {
            id: 'zfbexample-scale-sm',
            cssVar: '--zfbexample-scale-sm',
            label: 'Scale SM',
            group: 'font-scale',
            default: '0.875rem',
            type: { kind: 'length', min: 0.5, max: 2, step: 0.0625, unit: 'rem' },
          },
          {
            id: 'zfbexample-scale-base',
            cssVar: '--zfbexample-scale-base',
            label: 'Scale Base',
            group: 'font-scale',
            default: '1rem',
            type: { kind: 'length', min: 0.5, max: 2, step: 0.0625, unit: 'rem' },
          },
          {
            id: 'zfbexample-scale-lg',
            cssVar: '--zfbexample-scale-lg',
            label: 'Scale LG',
            group: 'font-scale',
            default: '1.25rem',
            type: { kind: 'length', min: 0.75, max: 3, step: 0.0625, unit: 'rem' },
          },
          {
            id: 'zfbexample-scale-xl',
            cssVar: '--zfbexample-scale-xl',
            label: 'Scale XL',
            group: 'font-scale',
            default: '1.75rem',
            type: { kind: 'length', min: 1, max: 4, step: 0.0625, unit: 'rem' },
          },
          {
            id: 'zfbexample-scale-2xl',
            cssVar: '--zfbexample-scale-2xl',
            label: 'Scale 2XL',
            group: 'font-scale',
            default: '2.5rem',
            type: { kind: 'length', min: 1.5, max: 6, step: 0.0625, unit: 'rem' },
          },
        ],
      },
      {
        id: 'semantic',
        label: 'Semantic Roles',
        // Each item's value is the id of a raw-tier item; emitted as var(--cssVar).
        referencesTier: 'raw',
        items: [
          {
            id: 'zfbexample-text-base',
            cssVar: '--zfbexample-text-base',
            label: 'Body Text',
            group: 'font-role',
            // References the raw item id 'zfbexample-scale-base'
            default: 'zfbexample-scale-base',
            type: { kind: 'text' },
          },
          {
            id: 'zfbexample-text-heading',
            cssVar: '--zfbexample-text-heading',
            label: 'Heading Text',
            group: 'font-role',
            // References the raw item id 'zfbexample-scale-xl'
            default: 'zfbexample-scale-xl',
            type: { kind: 'text' },
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
            id: 'zfbexample-radius',
            cssVar: '--zfbexample-radius',
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
