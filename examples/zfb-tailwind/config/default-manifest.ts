/**
 * Demo tab config for the zfb-tailwind example.
 *
 * Every `cssVar` is a `--zfbtw-*` name. These line up byte-for-byte
 * with the declarations in `styles/global.css` so the panel can rewrite
 * the same names live and the apply pipeline can rewrite them on disk.
 *
 * The spacing tab uses a 2-tier setup:
 *   - Tier `hsp-scale`: 5-step horizontal spacing scale (xs..xl)
 *   - Tier `vsp-scale`: 7-step vertical spacing scale (2xs..2xl)
 * Both scales are declared in styles/global.css and re-exported as
 * Tailwind theme tokens (--spacing-hsp-*, --spacing-vsp-*).
 *
 * The font tab uses a 2-tier setup:
 *   - Tier `raw`: 7 scale items (Tier 1, abstract)
 *   - Tier `semantic` (referencesTier: 'raw'): 6 concrete-purpose font roles
 *     (page-title, section-title, subsection-title, body, helper, annotation)
 *     each defaulting to a scale item id; emits var(--zfbtw-scale-*).
 *     Names follow the three-tier-font-size-strategy contract: Tier 2 describes
 *     WHAT the size is for, not which HTML element it lands on.
 *
 * The color tab uses a 2-tier setup (Wave 7):
 *   - Tier `palette`: 16 hex swatches (kind: 'color')
 *   - Tier `semantic` (referencesTier: 'palette'): semantic role rows
 * Color extras (schemes, base roles, etc.) are on colorExtras.
 *
 * Migrated in Wave 5 from TokenManifest to TabConfig[].
 * Color cluster migrated to TabConfig in Wave 7.
 * Spacing hsp/vsp scales surfaced as separate tiers in Wave 8 (panel-hardening).
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
        id: 'hsp-scale',
        label: 'Horizontal spacing',
        items: [
          {
            id: 'zfbtw-hsp-xs',
            cssVar: '--zfbtw-hsp-xs',
            label: 'H-Spacing XS',
            default: '0.25rem',
            type: { kind: 'length', min: 0, max: 1, step: 0.0625, unit: 'rem' },
          },
          {
            id: 'zfbtw-hsp-sm',
            cssVar: '--zfbtw-hsp-sm',
            label: 'H-Spacing S',
            default: '0.5rem',
            type: { kind: 'length', min: 0, max: 2, step: 0.0625, unit: 'rem' },
          },
          {
            id: 'zfbtw-hsp-md',
            cssVar: '--zfbtw-hsp-md',
            label: 'H-Spacing M',
            default: '1rem',
            type: { kind: 'length', min: 0, max: 4, step: 0.0625, unit: 'rem' },
          },
          {
            id: 'zfbtw-hsp-lg',
            cssVar: '--zfbtw-hsp-lg',
            label: 'H-Spacing L',
            default: '1.5rem',
            type: { kind: 'length', min: 0, max: 6, step: 0.0625, unit: 'rem' },
          },
          {
            id: 'zfbtw-hsp-xl',
            cssVar: '--zfbtw-hsp-xl',
            label: 'H-Spacing XL',
            default: '2rem',
            type: { kind: 'length', min: 0, max: 8, step: 0.125, unit: 'rem' },
          },
        ],
      },
      {
        id: 'vsp-scale',
        label: 'Vertical spacing',
        items: [
          {
            id: 'zfbtw-vsp-2xs',
            cssVar: '--zfbtw-vsp-2xs',
            label: 'V-Spacing 2XS',
            default: '0.25rem',
            type: { kind: 'length', min: 0, max: 1, step: 0.0625, unit: 'rem' },
          },
          {
            id: 'zfbtw-vsp-xs',
            cssVar: '--zfbtw-vsp-xs',
            label: 'V-Spacing XS',
            default: '0.5rem',
            type: { kind: 'length', min: 0, max: 2, step: 0.0625, unit: 'rem' },
          },
          {
            id: 'zfbtw-vsp-sm',
            cssVar: '--zfbtw-vsp-sm',
            label: 'V-Spacing S',
            default: '0.75rem',
            type: { kind: 'length', min: 0, max: 2, step: 0.0625, unit: 'rem' },
          },
          {
            id: 'zfbtw-vsp-md',
            cssVar: '--zfbtw-vsp-md',
            label: 'V-Spacing M',
            default: '1rem',
            type: { kind: 'length', min: 0, max: 4, step: 0.0625, unit: 'rem' },
          },
          {
            id: 'zfbtw-vsp-lg',
            cssVar: '--zfbtw-vsp-lg',
            label: 'V-Spacing L',
            default: '1.75rem',
            type: { kind: 'length', min: 0, max: 6, step: 0.0625, unit: 'rem' },
          },
          {
            id: 'zfbtw-vsp-xl',
            cssVar: '--zfbtw-vsp-xl',
            label: 'V-Spacing XL',
            default: '2.5rem',
            type: { kind: 'length', min: 0, max: 8, step: 0.125, unit: 'rem' },
          },
          {
            id: 'zfbtw-vsp-2xl',
            cssVar: '--zfbtw-vsp-2xl',
            label: 'V-Spacing 2XL',
            default: '3.5rem',
            type: { kind: 'length', min: 0, max: 10, step: 0.25, unit: 'rem' },
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
        label: 'Font scale',
        items: [
          {
            id: 'zfbtw-scale-xs',
            cssVar: '--zfbtw-scale-xs',
            label: 'Scale XS',
            default: '0.75rem',
            type: { kind: 'length', min: 0.5, max: 2, step: 0.0625, unit: 'rem' },
          },
          {
            id: 'zfbtw-scale-sm',
            cssVar: '--zfbtw-scale-sm',
            label: 'Scale SM',
            default: '0.875rem',
            type: { kind: 'length', min: 0.5, max: 2, step: 0.0625, unit: 'rem' },
          },
          {
            id: 'zfbtw-scale-base',
            cssVar: '--zfbtw-scale-base',
            label: 'Scale Base',
            default: '1rem',
            type: { kind: 'length', min: 0.5, max: 2, step: 0.0625, unit: 'rem' },
          },
          {
            id: 'zfbtw-scale-md',
            cssVar: '--zfbtw-scale-md',
            label: 'Scale MD',
            default: '1.125rem',
            type: { kind: 'length', min: 0.5, max: 2.5, step: 0.0625, unit: 'rem' },
          },
          {
            id: 'zfbtw-scale-lg',
            cssVar: '--zfbtw-scale-lg',
            label: 'Scale LG',
            default: '1.25rem',
            type: { kind: 'length', min: 0.75, max: 3, step: 0.0625, unit: 'rem' },
          },
          {
            id: 'zfbtw-scale-xl',
            cssVar: '--zfbtw-scale-xl',
            label: 'Scale XL',
            default: '1.75rem',
            type: { kind: 'length', min: 1, max: 4, step: 0.0625, unit: 'rem' },
          },
          {
            id: 'zfbtw-scale-2xl',
            cssVar: '--zfbtw-scale-2xl',
            label: 'Scale 2XL',
            default: '2.5rem',
            type: { kind: 'length', min: 1.5, max: 6, step: 0.0625, unit: 'rem' },
          },
        ],
      },
      {
        id: 'semantic',
        label: 'Font role',
        // Each item's value is the id of a raw-tier item; emitted as var(--cssVar).
        // Concrete-purpose role names — see header comment for the tier 2 contract.
        referencesTier: 'raw',
        items: [
          {
            id: 'zfbtw-text-page-title',
            cssVar: '--zfbtw-text-page-title',
            label: 'Page Title',
            default: 'zfbtw-scale-xl',
            type: { kind: 'text' },
          },
          {
            id: 'zfbtw-text-section-title',
            cssVar: '--zfbtw-text-section-title',
            label: 'Section Title',
            default: 'zfbtw-scale-lg',
            type: { kind: 'text' },
          },
          {
            id: 'zfbtw-text-subsection-title',
            cssVar: '--zfbtw-text-subsection-title',
            label: 'Sub-section / Table Header',
            default: 'zfbtw-scale-md',
            type: { kind: 'text' },
          },
          {
            id: 'zfbtw-text-body',
            cssVar: '--zfbtw-text-body',
            label: 'Body',
            default: 'zfbtw-scale-base',
            type: { kind: 'text' },
          },
          {
            id: 'zfbtw-text-helper',
            cssVar: '--zfbtw-text-helper',
            label: 'Helper / Caption',
            default: 'zfbtw-scale-sm',
            type: { kind: 'text' },
          },
          {
            id: 'zfbtw-text-annotation',
            cssVar: '--zfbtw-text-annotation',
            label: 'Annotation',
            default: 'zfbtw-scale-xs',
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
        id: 'size-scale',
        label: 'Size',
        items: [
          {
            id: 'zfbtw-size-sidenav-w',
            cssVar: '--zfbtw-size-sidenav-w',
            label: 'Sidenav Width',
            default: '14rem',
            type: { kind: 'length', min: 8, max: 24, step: 0.5, unit: 'rem' },
          },
          {
            id: 'zfbtw-size-header-h',
            cssVar: '--zfbtw-size-header-h',
            label: 'Header Height',
            default: '3.5rem',
            type: { kind: 'length', min: 2, max: 6, step: 0.25, unit: 'rem' },
          },
          {
            id: 'zfbtw-size-avatar-sm',
            cssVar: '--zfbtw-size-avatar-sm',
            label: 'Avatar SM',
            default: '2rem',
            type: { kind: 'length', min: 1, max: 4, step: 0.25, unit: 'rem' },
          },
          {
            id: 'zfbtw-size-avatar-md',
            cssVar: '--zfbtw-size-avatar-md',
            label: 'Avatar MD',
            default: '2.5rem',
            type: { kind: 'length', min: 1, max: 5, step: 0.25, unit: 'rem' },
          },
          {
            id: 'zfbtw-size-icon-sm',
            cssVar: '--zfbtw-size-icon-sm',
            label: 'Icon SM',
            default: '1rem',
            type: { kind: 'length', min: 0.5, max: 2, step: 0.0625, unit: 'rem' },
          },
          {
            id: 'zfbtw-size-icon-md',
            cssVar: '--zfbtw-size-icon-md',
            label: 'Icon MD',
            default: '1.25rem',
            type: { kind: 'length', min: 0.5, max: 2.5, step: 0.0625, unit: 'rem' },
          },
        ],
      },
      {
        id: 'radius-scale',
        label: 'Radius',
        items: [
          {
            id: 'zfbtw-radius',
            cssVar: '--zfbtw-radius',
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
          { id: 'zfbtw-palette-0',  cssVar: '--zfbtw-palette-0',  label: 'Palette 0',  default: '#1e1e1e', type: { kind: 'color' as const } },
          { id: 'zfbtw-palette-1',  cssVar: '--zfbtw-palette-1',  label: 'Palette 1',  default: '#2d6cdf', type: { kind: 'color' as const } },
          { id: 'zfbtw-palette-2',  cssVar: '--zfbtw-palette-2',  label: 'Palette 2',  default: '#3aa676', type: { kind: 'color' as const } },
          { id: 'zfbtw-palette-3',  cssVar: '--zfbtw-palette-3',  label: 'Palette 3',  default: '#d97706', type: { kind: 'color' as const } },
          { id: 'zfbtw-palette-4',  cssVar: '--zfbtw-palette-4',  label: 'Palette 4',  default: '#9b5de5', type: { kind: 'color' as const } },
          { id: 'zfbtw-palette-5',  cssVar: '--zfbtw-palette-5',  label: 'Palette 5',  default: '#e63946', type: { kind: 'color' as const } },
          { id: 'zfbtw-palette-6',  cssVar: '--zfbtw-palette-6',  label: 'Palette 6',  default: '#1d3557', type: { kind: 'color' as const } },
          { id: 'zfbtw-palette-7',  cssVar: '--zfbtw-palette-7',  label: 'Palette 7',  default: '#06b6d4', type: { kind: 'color' as const } },
          { id: 'zfbtw-palette-8',  cssVar: '--zfbtw-palette-8',  label: 'Palette 8',  default: '#475569', type: { kind: 'color' as const } },
          { id: 'zfbtw-palette-9',  cssVar: '--zfbtw-palette-9',  label: 'Palette 9',  default: '#94a3b8', type: { kind: 'color' as const } },
          { id: 'zfbtw-palette-10', cssVar: '--zfbtw-palette-10', label: 'Palette 10', default: '#cbd5e1', type: { kind: 'color' as const } },
          { id: 'zfbtw-palette-11', cssVar: '--zfbtw-palette-11', label: 'Palette 11', default: '#e2e8f0', type: { kind: 'color' as const } },
          { id: 'zfbtw-palette-12', cssVar: '--zfbtw-palette-12', label: 'Palette 12', default: '#f1f5f9', type: { kind: 'color' as const } },
          { id: 'zfbtw-palette-13', cssVar: '--zfbtw-palette-13', label: 'Palette 13', default: '#fef3c7', type: { kind: 'color' as const } },
          { id: 'zfbtw-palette-14', cssVar: '--zfbtw-palette-14', label: 'Palette 14', default: '#bbf7d0', type: { kind: 'color' as const } },
          { id: 'zfbtw-palette-15', cssVar: '--zfbtw-palette-15', label: 'Palette 15', default: '#f8fafc', type: { kind: 'color' as const } },
        ],
      },
      {
        id: 'semantic',
        label: 'Semantic',
        referencesTier: 'palette',
        items: [
          { id: 'primary', cssVar: '--zfbtw-color-primary', label: '--zfbtw-color-primary', default: 'zfbtw-palette-1', type: { kind: 'color' as const } },
          { id: 'accent',  cssVar: '--zfbtw-color-accent',  label: '--zfbtw-color-accent',  default: 'zfbtw-palette-3', type: { kind: 'color' as const } },
          { id: 'surface', cssVar: '--zfbtw-color-surface', label: '--zfbtw-color-surface', default: 'zfbtw-palette-0', type: { kind: 'color' as const } },
          { id: 'muted',   cssVar: '--zfbtw-color-muted',   label: '--zfbtw-color-muted',   default: 'zfbtw-palette-8', type: { kind: 'color' as const } },
          { id: 'success', cssVar: '--zfbtw-color-success', label: '--zfbtw-color-success', default: 'zfbtw-palette-2', type: { kind: 'color' as const } },
          { id: 'warning', cssVar: '--zfbtw-color-warning', label: '--zfbtw-color-warning', default: 'zfbtw-palette-3', type: { kind: 'color' as const } },
          { id: 'danger',  cssVar: '--zfbtw-color-danger',  label: '--zfbtw-color-danger',  default: 'zfbtw-palette-5', type: { kind: 'color' as const } },
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
          { id: 'ease-in',    cssVar: '--zfbtw-easing-ease-in',    label: 'Ease In',    default: 'cubic-bezier(0.42, 0, 1, 1)',    type: { kind: 'text' as const } },
          { id: 'ease-out',   cssVar: '--zfbtw-easing-ease-out',   label: 'Ease Out',   default: 'cubic-bezier(0, 0, 0.58, 1)',    type: { kind: 'text' as const } },
          { id: 'ease-inout', cssVar: '--zfbtw-easing-ease-inout', label: 'Ease InOut', default: 'cubic-bezier(0.42, 0, 0.58, 1)', type: { kind: 'text' as const } },
          { id: 'linear',     cssVar: '--zfbtw-easing-linear',     label: 'Linear',     default: 'linear',                         type: { kind: 'text' as const } },
        ],
      },
      {
        id: 'semantic',
        label: 'SEMANTIC',
        referencesTier: 'raw',
        items: [
          { id: 'tab-open',    cssVar: '--zfbtw-easing-tab-open',    label: 'Tab Open',   default: 'ease-in',    type: { kind: 'text' as const } },
          { id: 'tab-close',   cssVar: '--zfbtw-easing-tab-close',   label: 'Tab Close',  default: 'ease-out',   type: { kind: 'text' as const } },
          { id: 'modal-enter', cssVar: '--zfbtw-easing-modal',       label: 'Modal',      default: 'ease-inout', type: { kind: 'text' as const } },
        ],
      },
    ],
  },
];
