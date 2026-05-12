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
 * The color tab uses a 2-tier setup (Wave 7):
 *   - Tier `palette`: 16 hex swatches (kind: 'color')
 *   - Tier `semantic` (referencesTier: 'palette'): semantic role rows
 * Color extras (schemes, base roles, etc.) are on colorExtras.
 *
 * Migrated in Wave 5 from TokenManifest to TabConfig[].
 * Color cluster migrated to TabConfig in Wave 7.
 */

import type { PanelConfig } from '@takazudo/zudo-design-token-panel/astro';
import { defaultCluster } from './default-cluster';

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
    // colorExtras carries the non-tier metadata (formerly on ColorClusterDataConfig).
    colorExtras: {
      id: defaultCluster.id,
      label: defaultCluster.label,
      baseRoles: defaultCluster.baseRoles,
      baseDefaults: defaultCluster.baseDefaults,
      defaultShikiTheme: defaultCluster.defaultShikiTheme,
      colorSchemes: defaultCluster.colorSchemes,
      panelSettings: defaultCluster.panelSettings,
    },
    tiers: [
      {
        id: 'palette',
        label: 'Palette',
        items: [
          { id: 'zfbexample-palette-0',  cssVar: '--zfbexample-palette-0',  label: 'Palette 0',  default: '#1e1e1e', type: { kind: 'color' as const } },
          { id: 'zfbexample-palette-1',  cssVar: '--zfbexample-palette-1',  label: 'Palette 1',  default: '#2d6cdf', type: { kind: 'color' as const } },
          { id: 'zfbexample-palette-2',  cssVar: '--zfbexample-palette-2',  label: 'Palette 2',  default: '#3aa676', type: { kind: 'color' as const } },
          { id: 'zfbexample-palette-3',  cssVar: '--zfbexample-palette-3',  label: 'Palette 3',  default: '#d97706', type: { kind: 'color' as const } },
          { id: 'zfbexample-palette-4',  cssVar: '--zfbexample-palette-4',  label: 'Palette 4',  default: '#9b5de5', type: { kind: 'color' as const } },
          { id: 'zfbexample-palette-5',  cssVar: '--zfbexample-palette-5',  label: 'Palette 5',  default: '#e63946', type: { kind: 'color' as const } },
          { id: 'zfbexample-palette-6',  cssVar: '--zfbexample-palette-6',  label: 'Palette 6',  default: '#1d3557', type: { kind: 'color' as const } },
          { id: 'zfbexample-palette-7',  cssVar: '--zfbexample-palette-7',  label: 'Palette 7',  default: '#06b6d4', type: { kind: 'color' as const } },
          { id: 'zfbexample-palette-8',  cssVar: '--zfbexample-palette-8',  label: 'Palette 8',  default: '#475569', type: { kind: 'color' as const } },
          { id: 'zfbexample-palette-9',  cssVar: '--zfbexample-palette-9',  label: 'Palette 9',  default: '#94a3b8', type: { kind: 'color' as const } },
          { id: 'zfbexample-palette-10', cssVar: '--zfbexample-palette-10', label: 'Palette 10', default: '#cbd5e1', type: { kind: 'color' as const } },
          { id: 'zfbexample-palette-11', cssVar: '--zfbexample-palette-11', label: 'Palette 11', default: '#e2e8f0', type: { kind: 'color' as const } },
          { id: 'zfbexample-palette-12', cssVar: '--zfbexample-palette-12', label: 'Palette 12', default: '#f1f5f9', type: { kind: 'color' as const } },
          { id: 'zfbexample-palette-13', cssVar: '--zfbexample-palette-13', label: 'Palette 13', default: '#fef3c7', type: { kind: 'color' as const } },
          { id: 'zfbexample-palette-14', cssVar: '--zfbexample-palette-14', label: 'Palette 14', default: '#bbf7d0', type: { kind: 'color' as const } },
          { id: 'zfbexample-palette-15', cssVar: '--zfbexample-palette-15', label: 'Palette 15', default: '#f8fafc', type: { kind: 'color' as const } },
        ],
      },
      {
        id: 'semantic',
        label: 'Semantic',
        // Semantic items reference the palette tier — each default is a palette item id.
        referencesTier: 'palette',
        items: [
          { id: 'primary', cssVar: '--zfbexample-color-primary', label: '--zfbexample-color-primary', default: 'zfbexample-palette-1', type: { kind: 'color' as const } },
          { id: 'accent',  cssVar: '--zfbexample-color-accent',  label: '--zfbexample-color-accent',  default: 'zfbexample-palette-3', type: { kind: 'color' as const } },
          { id: 'surface', cssVar: '--zfbexample-color-surface', label: '--zfbexample-color-surface', default: 'zfbexample-palette-0', type: { kind: 'color' as const } },
          { id: 'muted',   cssVar: '--zfbexample-color-muted',   label: '--zfbexample-color-muted',   default: 'zfbexample-palette-8', type: { kind: 'color' as const } },
          { id: 'danger',  cssVar: '--zfbexample-color-danger',  label: '--zfbexample-color-danger',  default: 'zfbexample-palette-5', type: { kind: 'color' as const } },
        ],
      },
    ],
  },
  {
    id: 'easing',
    label: 'Easing',
    tiers: [
      {
        id: 'raw',
        label: 'RAW EASINGS',
        items: [
          { id: 'ease-in',    cssVar: '--zfbexample-easing-ease-in',    label: 'Ease In',    default: 'cubic-bezier(0.42, 0, 1, 1)',    type: { kind: 'text' as const } },
          { id: 'ease-out',   cssVar: '--zfbexample-easing-ease-out',   label: 'Ease Out',   default: 'cubic-bezier(0, 0, 0.58, 1)',    type: { kind: 'text' as const } },
          { id: 'ease-inout', cssVar: '--zfbexample-easing-ease-inout', label: 'Ease InOut', default: 'cubic-bezier(0.42, 0, 0.58, 1)', type: { kind: 'text' as const } },
          { id: 'linear',     cssVar: '--zfbexample-easing-linear',     label: 'Linear',     default: 'linear',                         type: { kind: 'text' as const } },
        ],
      },
      {
        id: 'semantic',
        label: 'SEMANTIC',
        referencesTier: 'raw',
        items: [
          { id: 'tab-open',    cssVar: '--zfbexample-easing-tab-open',    label: 'Tab Open',   default: 'ease-in',    type: { kind: 'text' as const } },
          { id: 'tab-close',   cssVar: '--zfbexample-easing-tab-close',   label: 'Tab Close',  default: 'ease-out',   type: { kind: 'text' as const } },
          { id: 'modal-enter', cssVar: '--zfbexample-easing-modal',       label: 'Modal',      default: 'ease-inout', type: { kind: 'text' as const } },
        ],
      },
    ],
  },
];
