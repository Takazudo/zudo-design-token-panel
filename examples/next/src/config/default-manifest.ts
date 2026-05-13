/**
 * Demo tab config for the Next.js example.
 *
 * Every `cssVar` is a `--nx-*` name. These line up byte-for-byte
 * with the declarations in `src/styles/tokens.css` so the panel can rewrite
 * the same names live and the apply pipeline can rewrite them on disk.
 *
 * The color tab uses a 2-tier setup (Wave 7):
 *   - Tier `palette`: 16 hex swatches (kind: 'color')
 *   - Tier `semantic` (referencesTier: 'palette'): semantic role rows
 * Color extras (schemes, base roles, etc.) are on colorExtras.
 *
 * Migrated in Wave 5 from TokenManifest to TabConfig[].
 * Color cluster migrated to TabConfig in Wave 7.
 */

import type { PanelConfig } from '@takazudo/zudo-design-token-panel';
import { defaultCluster } from './default-cluster';

type TabConfig = PanelConfig['tabs'][number];

export const defaultTabs: readonly TabConfig[] = [
  {
    id: 'spacing',
    label: 'Spacing',
    tiers: [
      {
        id: 'hsp-scale',
        label: 'Horizontal Spacing',
        items: [
          {
            id: 'nx-spacing-md',
            cssVar: '--nx-spacing-md',
            label: 'Spacing M',
            default: '1rem',
            type: { kind: 'length', min: 0, max: 4, step: 0.0625, unit: 'rem' },
          },
        ],
      },
      {
        id: 'vsp-scale',
        label: 'Vertical Spacing',
        items: [
          {
            id: 'nx-spacing-lg',
            cssVar: '--nx-spacing-lg',
            label: 'Spacing L',
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
            id: 'nx-text-base',
            cssVar: '--nx-text-base',
            label: 'Body Text',
            default: '1rem',
            type: { kind: 'length', min: 0.75, max: 1.5, step: 0.0625, unit: 'rem' },
          },
          {
            id: 'nx-text-heading',
            cssVar: '--nx-text-heading',
            label: 'Heading Text',
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
        id: 'radius-scale',
        label: 'Radius',
        items: [
          {
            id: 'nx-radius',
            cssVar: '--nx-radius',
            label: 'Border Radius',
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
          { id: 'nx-palette-0',  cssVar: '--nx-palette-0',  label: 'Palette 0',  default: '#1e1e1e', type: { kind: 'color' as const } },
          { id: 'nx-palette-1',  cssVar: '--nx-palette-1',  label: 'Palette 1',  default: '#2d6cdf', type: { kind: 'color' as const } },
          { id: 'nx-palette-2',  cssVar: '--nx-palette-2',  label: 'Palette 2',  default: '#3aa676', type: { kind: 'color' as const } },
          { id: 'nx-palette-3',  cssVar: '--nx-palette-3',  label: 'Palette 3',  default: '#d97706', type: { kind: 'color' as const } },
          { id: 'nx-palette-4',  cssVar: '--nx-palette-4',  label: 'Palette 4',  default: '#9b5de5', type: { kind: 'color' as const } },
          { id: 'nx-palette-5',  cssVar: '--nx-palette-5',  label: 'Palette 5',  default: '#e63946', type: { kind: 'color' as const } },
          { id: 'nx-palette-6',  cssVar: '--nx-palette-6',  label: 'Palette 6',  default: '#1d3557', type: { kind: 'color' as const } },
          { id: 'nx-palette-7',  cssVar: '--nx-palette-7',  label: 'Palette 7',  default: '#06b6d4', type: { kind: 'color' as const } },
          { id: 'nx-palette-8',  cssVar: '--nx-palette-8',  label: 'Palette 8',  default: '#475569', type: { kind: 'color' as const } },
          { id: 'nx-palette-9',  cssVar: '--nx-palette-9',  label: 'Palette 9',  default: '#94a3b8', type: { kind: 'color' as const } },
          { id: 'nx-palette-10', cssVar: '--nx-palette-10', label: 'Palette 10', default: '#cbd5e1', type: { kind: 'color' as const } },
          { id: 'nx-palette-11', cssVar: '--nx-palette-11', label: 'Palette 11', default: '#e2e8f0', type: { kind: 'color' as const } },
          { id: 'nx-palette-12', cssVar: '--nx-palette-12', label: 'Palette 12', default: '#f1f5f9', type: { kind: 'color' as const } },
          { id: 'nx-palette-13', cssVar: '--nx-palette-13', label: 'Palette 13', default: '#fef3c7', type: { kind: 'color' as const } },
          { id: 'nx-palette-14', cssVar: '--nx-palette-14', label: 'Palette 14', default: '#bbf7d0', type: { kind: 'color' as const } },
          { id: 'nx-palette-15', cssVar: '--nx-palette-15', label: 'Palette 15', default: '#f8fafc', type: { kind: 'color' as const } },
        ],
      },
      {
        id: 'semantic',
        label: 'Semantic',
        referencesTier: 'palette',
        items: [
          { id: 'primary', cssVar: '--nx-color-primary', label: '--nx-color-primary', default: 'nx-palette-1', type: { kind: 'color' as const } },
          { id: 'accent',  cssVar: '--nx-color-accent',  label: '--nx-color-accent',  default: 'nx-palette-3', type: { kind: 'color' as const } },
          { id: 'surface', cssVar: '--nx-color-surface', label: '--nx-color-surface', default: 'nx-palette-0', type: { kind: 'color' as const } },
          { id: 'muted',   cssVar: '--nx-color-muted',   label: '--nx-color-muted',   default: 'nx-palette-8', type: { kind: 'color' as const } },
          { id: 'danger',  cssVar: '--nx-color-danger',  label: '--nx-color-danger',  default: 'nx-palette-5', type: { kind: 'color' as const } },
        ],
      },
    ],
  },
];
