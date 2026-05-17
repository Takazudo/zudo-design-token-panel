/**
 * Demo tab config for the Next.js example.
 *
 * Every `cssVar` is a `--nx-*` name. These line up byte-for-byte
 * with the declarations in `src/styles/tokens.css` so the panel can rewrite
 * the same names live and the apply pipeline can rewrite them on disk.
 *
 * The spacing tab uses a 2-tier setup:
 *   - Tier `hsp-scale`: 5-step horizontal spacing scale (xs..xl)
 *   - Tier `vsp-scale`: 7-step vertical spacing scale (2xs..2xl)
 * Both scales are declared in src/styles/tokens.css.
 *
 * The font tab uses a 2-tier setup:
 *   - Tier `raw`: 7 scale items (Tier 1, abstract)
 *   - Tier `semantic` (referencesTier: 'raw'): 6 concrete-purpose font roles
 *     (page-title, section-title, subsection-title, body, helper, annotation)
 *     each defaulting to a scale item id; emits var(--nx-scale-*).
 *     Names follow the three-tier-font-size-strategy contract: Tier 2 describes
 *     WHAT the size is for, not which HTML element it lands on.
 *
 * The color tab uses a 2-tier setup:
 *   - Tier `palette`: 16 hex swatches (kind: 'color')
 *   - Tier `semantic` (referencesTier: 'palette'): semantic role rows
 * Color extras (schemes, base roles, etc.) are on colorExtras.
 *
 * Migrated in Wave 5 from TokenManifest to TabConfig[].
 * Color cluster migrated to TabConfig in Wave 7.
 * Spacing hsp/vsp scales, font scale+semantic tiers, size, easing surfaced to
 * full zfb-tailwind parity in Wave 2 (framework-demo-parity #186).
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
        label: 'Horizontal spacing',
        items: [
          {
            id: 'nx-hsp-xs',
            cssVar: '--nx-hsp-xs',
            label: 'H-Spacing XS',
            default: '0.25rem',
            type: { kind: 'length', min: 0, max: 1, step: 0.0625, unit: 'rem' },
          },
          {
            id: 'nx-hsp-sm',
            cssVar: '--nx-hsp-sm',
            label: 'H-Spacing S',
            default: '0.5rem',
            type: { kind: 'length', min: 0, max: 2, step: 0.0625, unit: 'rem' },
          },
          {
            id: 'nx-hsp-md',
            cssVar: '--nx-hsp-md',
            label: 'H-Spacing M',
            default: '1rem',
            type: { kind: 'length', min: 0, max: 4, step: 0.0625, unit: 'rem' },
          },
          {
            id: 'nx-hsp-lg',
            cssVar: '--nx-hsp-lg',
            label: 'H-Spacing L',
            default: '1.5rem',
            type: { kind: 'length', min: 0, max: 6, step: 0.0625, unit: 'rem' },
          },
          {
            id: 'nx-hsp-xl',
            cssVar: '--nx-hsp-xl',
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
            id: 'nx-vsp-2xs',
            cssVar: '--nx-vsp-2xs',
            label: 'V-Spacing 2XS',
            default: '0.25rem',
            type: { kind: 'length', min: 0, max: 1, step: 0.0625, unit: 'rem' },
          },
          {
            id: 'nx-vsp-xs',
            cssVar: '--nx-vsp-xs',
            label: 'V-Spacing XS',
            default: '0.5rem',
            type: { kind: 'length', min: 0, max: 2, step: 0.0625, unit: 'rem' },
          },
          {
            id: 'nx-vsp-sm',
            cssVar: '--nx-vsp-sm',
            label: 'V-Spacing S',
            default: '0.75rem',
            type: { kind: 'length', min: 0, max: 2, step: 0.0625, unit: 'rem' },
          },
          {
            id: 'nx-vsp-md',
            cssVar: '--nx-vsp-md',
            label: 'V-Spacing M',
            default: '1rem',
            type: { kind: 'length', min: 0, max: 4, step: 0.0625, unit: 'rem' },
          },
          {
            id: 'nx-vsp-lg',
            cssVar: '--nx-vsp-lg',
            label: 'V-Spacing L',
            default: '1.75rem',
            type: { kind: 'length', min: 0, max: 6, step: 0.0625, unit: 'rem' },
          },
          {
            id: 'nx-vsp-xl',
            cssVar: '--nx-vsp-xl',
            label: 'V-Spacing XL',
            default: '2.5rem',
            type: { kind: 'length', min: 0, max: 8, step: 0.125, unit: 'rem' },
          },
          {
            id: 'nx-vsp-2xl',
            cssVar: '--nx-vsp-2xl',
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
            id: 'nx-scale-xs',
            cssVar: '--nx-scale-xs',
            label: 'Scale XS',
            default: '0.75rem',
            type: { kind: 'length', min: 0.5, max: 2, step: 0.0625, unit: 'rem' },
          },
          {
            id: 'nx-scale-sm',
            cssVar: '--nx-scale-sm',
            label: 'Scale SM',
            default: '0.875rem',
            type: { kind: 'length', min: 0.5, max: 2, step: 0.0625, unit: 'rem' },
          },
          {
            id: 'nx-scale-base',
            cssVar: '--nx-scale-base',
            label: 'Scale Base',
            default: '1rem',
            type: { kind: 'length', min: 0.5, max: 2, step: 0.0625, unit: 'rem' },
          },
          {
            id: 'nx-scale-md',
            cssVar: '--nx-scale-md',
            label: 'Scale MD',
            default: '1.125rem',
            type: { kind: 'length', min: 0.5, max: 2.5, step: 0.0625, unit: 'rem' },
          },
          {
            id: 'nx-scale-lg',
            cssVar: '--nx-scale-lg',
            label: 'Scale LG',
            default: '1.25rem',
            type: { kind: 'length', min: 0.75, max: 3, step: 0.0625, unit: 'rem' },
          },
          {
            id: 'nx-scale-xl',
            cssVar: '--nx-scale-xl',
            label: 'Scale XL',
            default: '1.75rem',
            type: { kind: 'length', min: 1, max: 4, step: 0.0625, unit: 'rem' },
          },
          {
            id: 'nx-scale-2xl',
            cssVar: '--nx-scale-2xl',
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
            id: 'nx-text-page-title',
            cssVar: '--nx-text-page-title',
            label: 'Page Title',
            default: 'nx-scale-xl',
            type: { kind: 'text' },
          },
          {
            id: 'nx-text-section-title',
            cssVar: '--nx-text-section-title',
            label: 'Section Title',
            default: 'nx-scale-lg',
            type: { kind: 'text' },
          },
          {
            id: 'nx-text-subsection-title',
            cssVar: '--nx-text-subsection-title',
            label: 'Sub-section / Table Header',
            default: 'nx-scale-md',
            type: { kind: 'text' },
          },
          {
            id: 'nx-text-body',
            cssVar: '--nx-text-body',
            label: 'Body',
            default: 'nx-scale-base',
            type: { kind: 'text' },
          },
          {
            id: 'nx-text-helper',
            cssVar: '--nx-text-helper',
            label: 'Helper / Caption',
            default: 'nx-scale-sm',
            type: { kind: 'text' },
          },
          {
            id: 'nx-text-annotation',
            cssVar: '--nx-text-annotation',
            label: 'Annotation',
            default: 'nx-scale-xs',
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
            id: 'nx-size-sidenav-w',
            cssVar: '--nx-size-sidenav-w',
            label: 'Sidenav Width',
            default: '14rem',
            type: { kind: 'length', min: 8, max: 24, step: 0.5, unit: 'rem' },
          },
          {
            id: 'nx-size-header-h',
            cssVar: '--nx-size-header-h',
            label: 'Header Height',
            default: '3.5rem',
            type: { kind: 'length', min: 2, max: 6, step: 0.25, unit: 'rem' },
          },
          {
            id: 'nx-size-avatar-sm',
            cssVar: '--nx-size-avatar-sm',
            label: 'Avatar SM',
            default: '2rem',
            type: { kind: 'length', min: 1, max: 4, step: 0.25, unit: 'rem' },
          },
          {
            id: 'nx-size-avatar-md',
            cssVar: '--nx-size-avatar-md',
            label: 'Avatar MD',
            default: '2.5rem',
            type: { kind: 'length', min: 1, max: 5, step: 0.25, unit: 'rem' },
          },
          {
            id: 'nx-size-icon-md',
            cssVar: '--nx-size-icon-md',
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
          { id: 'success', cssVar: '--nx-color-success', label: '--nx-color-success', default: 'nx-palette-2', type: { kind: 'color' as const } },
          { id: 'warning', cssVar: '--nx-color-warning', label: '--nx-color-warning', default: 'nx-palette-3', type: { kind: 'color' as const } },
          { id: 'danger',  cssVar: '--nx-color-danger',  label: '--nx-color-danger',  default: 'nx-palette-5', type: { kind: 'color' as const } },
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
          { id: 'ease-in',    cssVar: '--nx-easing-ease-in',    label: 'Ease In',    default: 'cubic-bezier(0.42, 0, 1, 1)',    type: { kind: 'text' as const } },
          { id: 'ease-out',   cssVar: '--nx-easing-ease-out',   label: 'Ease Out',   default: 'cubic-bezier(0, 0, 0.58, 1)',    type: { kind: 'text' as const } },
          { id: 'ease-inout', cssVar: '--nx-easing-ease-inout', label: 'Ease InOut', default: 'cubic-bezier(0.42, 0, 0.58, 1)', type: { kind: 'text' as const } },
          { id: 'linear',     cssVar: '--nx-easing-linear',     label: 'Linear',     default: 'linear',                         type: { kind: 'text' as const } },
        ],
      },
      {
        id: 'semantic',
        label: 'SEMANTIC',
        referencesTier: 'raw',
        items: [
          { id: 'tab-open',    cssVar: '--nx-easing-tab-open',  label: 'Tab Open',  default: 'ease-in',    type: { kind: 'text' as const } },
          { id: 'tab-close',   cssVar: '--nx-easing-tab-close', label: 'Tab Close', default: 'ease-out',   type: { kind: 'text' as const } },
          { id: 'modal-enter', cssVar: '--nx-easing-modal',     label: 'Modal',     default: 'ease-inout', type: { kind: 'text' as const } },
        ],
      },
    ],
  },
];
