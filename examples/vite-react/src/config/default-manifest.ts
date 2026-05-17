/**
 * Demo tab config for the Vite + React example.
 *
 * Every `cssVar` is a `--vr-*` name. These line up byte-for-byte
 * with the declarations in `src/styles/tokens.css` so the panel can rewrite
 * the same names live and the apply pipeline can rewrite them on disk.
 *
 * The spacing tab uses a 2-tier setup:
 *   - Tier `hsp-scale`: 5-step horizontal spacing scale (xs..xl)
 *   - Tier `vsp-scale`: 7-step vertical spacing scale (2xs..2xl)
 * Both scales are declared in tokens.css.
 *
 * The font tab uses a 2-tier setup:
 *   - Tier `raw`: 7 scale items (Tier 1, abstract)
 *   - Tier `semantic` (referencesTier: 'raw'): 6 concrete-purpose font roles
 *     (page-title, section-title, subsection-title, body, helper, annotation)
 *     each defaulting to a scale item id; emits var(--vr-scale-*).
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
 * Spacing hsp/vsp scales and full font/size/easing tabs added in Wave 2
 * framework-demo-parity (#187) to match zfb-tailwind vocabulary.
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
            id: 'vr-hsp-xs',
            cssVar: '--vr-hsp-xs',
            label: 'H-Spacing XS',
            default: '0.25rem',
            type: { kind: 'length', min: 0, max: 1, step: 0.0625, unit: 'rem' },
          },
          {
            id: 'vr-hsp-sm',
            cssVar: '--vr-hsp-sm',
            label: 'H-Spacing S',
            default: '0.5rem',
            type: { kind: 'length', min: 0, max: 2, step: 0.0625, unit: 'rem' },
          },
          {
            id: 'vr-hsp-md',
            cssVar: '--vr-hsp-md',
            label: 'H-Spacing M',
            default: '1rem',
            type: { kind: 'length', min: 0, max: 4, step: 0.0625, unit: 'rem' },
          },
          {
            id: 'vr-hsp-lg',
            cssVar: '--vr-hsp-lg',
            label: 'H-Spacing L',
            default: '1.5rem',
            type: { kind: 'length', min: 0, max: 6, step: 0.0625, unit: 'rem' },
          },
          {
            id: 'vr-hsp-xl',
            cssVar: '--vr-hsp-xl',
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
            id: 'vr-vsp-2xs',
            cssVar: '--vr-vsp-2xs',
            label: 'V-Spacing 2XS',
            default: '0.25rem',
            type: { kind: 'length', min: 0, max: 1, step: 0.0625, unit: 'rem' },
          },
          {
            id: 'vr-vsp-xs',
            cssVar: '--vr-vsp-xs',
            label: 'V-Spacing XS',
            default: '0.5rem',
            type: { kind: 'length', min: 0, max: 2, step: 0.0625, unit: 'rem' },
          },
          {
            id: 'vr-vsp-sm',
            cssVar: '--vr-vsp-sm',
            label: 'V-Spacing S',
            default: '0.75rem',
            type: { kind: 'length', min: 0, max: 2, step: 0.0625, unit: 'rem' },
          },
          {
            id: 'vr-vsp-md',
            cssVar: '--vr-vsp-md',
            label: 'V-Spacing M',
            default: '1rem',
            type: { kind: 'length', min: 0, max: 4, step: 0.0625, unit: 'rem' },
          },
          {
            id: 'vr-vsp-lg',
            cssVar: '--vr-vsp-lg',
            label: 'V-Spacing L',
            default: '1.75rem',
            type: { kind: 'length', min: 0, max: 6, step: 0.0625, unit: 'rem' },
          },
          {
            id: 'vr-vsp-xl',
            cssVar: '--vr-vsp-xl',
            label: 'V-Spacing XL',
            default: '2.5rem',
            type: { kind: 'length', min: 0, max: 8, step: 0.125, unit: 'rem' },
          },
          {
            id: 'vr-vsp-2xl',
            cssVar: '--vr-vsp-2xl',
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
            id: 'vr-scale-xs',
            cssVar: '--vr-scale-xs',
            label: 'Scale XS',
            default: '0.75rem',
            type: { kind: 'length', min: 0.5, max: 2, step: 0.0625, unit: 'rem' },
          },
          {
            id: 'vr-scale-sm',
            cssVar: '--vr-scale-sm',
            label: 'Scale SM',
            default: '0.875rem',
            type: { kind: 'length', min: 0.5, max: 2, step: 0.0625, unit: 'rem' },
          },
          {
            id: 'vr-scale-base',
            cssVar: '--vr-scale-base',
            label: 'Scale Base',
            default: '1rem',
            type: { kind: 'length', min: 0.5, max: 2, step: 0.0625, unit: 'rem' },
          },
          {
            id: 'vr-scale-md',
            cssVar: '--vr-scale-md',
            label: 'Scale MD',
            default: '1.125rem',
            type: { kind: 'length', min: 0.5, max: 2.5, step: 0.0625, unit: 'rem' },
          },
          {
            id: 'vr-scale-lg',
            cssVar: '--vr-scale-lg',
            label: 'Scale LG',
            default: '1.25rem',
            type: { kind: 'length', min: 0.75, max: 3, step: 0.0625, unit: 'rem' },
          },
          {
            id: 'vr-scale-xl',
            cssVar: '--vr-scale-xl',
            label: 'Scale XL',
            default: '1.75rem',
            type: { kind: 'length', min: 1, max: 4, step: 0.0625, unit: 'rem' },
          },
          {
            id: 'vr-scale-2xl',
            cssVar: '--vr-scale-2xl',
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
        // Concrete-purpose role names — Tier 2 describes WHAT the size is for.
        referencesTier: 'raw',
        items: [
          {
            id: 'vr-text-page-title',
            cssVar: '--vr-text-page-title',
            label: 'Page Title',
            default: 'vr-scale-xl',
            type: { kind: 'text' },
          },
          {
            id: 'vr-text-section-title',
            cssVar: '--vr-text-section-title',
            label: 'Section Title',
            default: 'vr-scale-lg',
            type: { kind: 'text' },
          },
          {
            id: 'vr-text-subsection-title',
            cssVar: '--vr-text-subsection-title',
            label: 'Sub-section / Table Header',
            default: 'vr-scale-md',
            type: { kind: 'text' },
          },
          {
            id: 'vr-text-body',
            cssVar: '--vr-text-body',
            label: 'Body',
            default: 'vr-scale-base',
            type: { kind: 'text' },
          },
          {
            id: 'vr-text-helper',
            cssVar: '--vr-text-helper',
            label: 'Helper / Caption',
            default: 'vr-scale-sm',
            type: { kind: 'text' },
          },
          {
            id: 'vr-text-annotation',
            cssVar: '--vr-text-annotation',
            label: 'Annotation',
            default: 'vr-scale-xs',
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
            id: 'vr-size-sidenav-w',
            cssVar: '--vr-size-sidenav-w',
            label: 'Sidenav Width',
            default: '14rem',
            type: { kind: 'length', min: 8, max: 24, step: 0.5, unit: 'rem' },
          },
          {
            id: 'vr-size-header-h',
            cssVar: '--vr-size-header-h',
            label: 'Header Height',
            default: '3.5rem',
            type: { kind: 'length', min: 2, max: 6, step: 0.25, unit: 'rem' },
          },
          {
            id: 'vr-size-avatar-sm',
            cssVar: '--vr-size-avatar-sm',
            label: 'Avatar SM',
            default: '2rem',
            type: { kind: 'length', min: 1, max: 4, step: 0.25, unit: 'rem' },
          },
          {
            id: 'vr-size-avatar-md',
            cssVar: '--vr-size-avatar-md',
            label: 'Avatar MD',
            default: '2.5rem',
            type: { kind: 'length', min: 1, max: 5, step: 0.25, unit: 'rem' },
          },
          {
            id: 'vr-size-icon-sm',
            cssVar: '--vr-size-icon-sm',
            label: 'Icon SM',
            default: '1rem',
            type: { kind: 'length', min: 0.5, max: 2, step: 0.0625, unit: 'rem' },
          },
          {
            id: 'vr-size-icon-md',
            cssVar: '--vr-size-icon-md',
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
            id: 'vr-radius',
            cssVar: '--vr-radius',
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
          { id: 'vr-palette-0',  cssVar: '--vr-palette-0',  label: 'Palette 0',  default: '#1e1e1e', type: { kind: 'color' as const } },
          { id: 'vr-palette-1',  cssVar: '--vr-palette-1',  label: 'Palette 1',  default: '#2d6cdf', type: { kind: 'color' as const } },
          { id: 'vr-palette-2',  cssVar: '--vr-palette-2',  label: 'Palette 2',  default: '#3aa676', type: { kind: 'color' as const } },
          { id: 'vr-palette-3',  cssVar: '--vr-palette-3',  label: 'Palette 3',  default: '#d97706', type: { kind: 'color' as const } },
          { id: 'vr-palette-4',  cssVar: '--vr-palette-4',  label: 'Palette 4',  default: '#9b5de5', type: { kind: 'color' as const } },
          { id: 'vr-palette-5',  cssVar: '--vr-palette-5',  label: 'Palette 5',  default: '#e63946', type: { kind: 'color' as const } },
          { id: 'vr-palette-6',  cssVar: '--vr-palette-6',  label: 'Palette 6',  default: '#1d3557', type: { kind: 'color' as const } },
          { id: 'vr-palette-7',  cssVar: '--vr-palette-7',  label: 'Palette 7',  default: '#06b6d4', type: { kind: 'color' as const } },
          { id: 'vr-palette-8',  cssVar: '--vr-palette-8',  label: 'Palette 8',  default: '#475569', type: { kind: 'color' as const } },
          { id: 'vr-palette-9',  cssVar: '--vr-palette-9',  label: 'Palette 9',  default: '#94a3b8', type: { kind: 'color' as const } },
          { id: 'vr-palette-10', cssVar: '--vr-palette-10', label: 'Palette 10', default: '#cbd5e1', type: { kind: 'color' as const } },
          { id: 'vr-palette-11', cssVar: '--vr-palette-11', label: 'Palette 11', default: '#e2e8f0', type: { kind: 'color' as const } },
          { id: 'vr-palette-12', cssVar: '--vr-palette-12', label: 'Palette 12', default: '#f1f5f9', type: { kind: 'color' as const } },
          { id: 'vr-palette-13', cssVar: '--vr-palette-13', label: 'Palette 13', default: '#fef3c7', type: { kind: 'color' as const } },
          { id: 'vr-palette-14', cssVar: '--vr-palette-14', label: 'Palette 14', default: '#bbf7d0', type: { kind: 'color' as const } },
          { id: 'vr-palette-15', cssVar: '--vr-palette-15', label: 'Palette 15', default: '#f8fafc', type: { kind: 'color' as const } },
        ],
      },
      {
        id: 'semantic',
        label: 'Semantic',
        referencesTier: 'palette',
        items: [
          { id: 'primary', cssVar: '--vr-color-primary', label: '--vr-color-primary', default: 'vr-palette-1', type: { kind: 'color' as const } },
          { id: 'accent',  cssVar: '--vr-color-accent',  label: '--vr-color-accent',  default: 'vr-palette-3', type: { kind: 'color' as const } },
          { id: 'surface', cssVar: '--vr-color-surface', label: '--vr-color-surface', default: 'vr-palette-0', type: { kind: 'color' as const } },
          { id: 'muted',   cssVar: '--vr-color-muted',   label: '--vr-color-muted',   default: 'vr-palette-8', type: { kind: 'color' as const } },
          { id: 'success', cssVar: '--vr-color-success', label: '--vr-color-success', default: 'vr-palette-2', type: { kind: 'color' as const } },
          { id: 'warning', cssVar: '--vr-color-warning', label: '--vr-color-warning', default: 'vr-palette-3', type: { kind: 'color' as const } },
          { id: 'danger',  cssVar: '--vr-color-danger',  label: '--vr-color-danger',  default: 'vr-palette-5', type: { kind: 'color' as const } },
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
          { id: 'ease-in',    cssVar: '--vr-easing-ease-in',    label: 'Ease In',    default: 'cubic-bezier(0.42, 0, 1, 1)',    type: { kind: 'text' as const } },
          { id: 'ease-out',   cssVar: '--vr-easing-ease-out',   label: 'Ease Out',   default: 'cubic-bezier(0, 0, 0.58, 1)',    type: { kind: 'text' as const } },
          { id: 'ease-inout', cssVar: '--vr-easing-ease-inout', label: 'Ease InOut', default: 'cubic-bezier(0.42, 0, 0.58, 1)', type: { kind: 'text' as const } },
          { id: 'linear',     cssVar: '--vr-easing-linear',     label: 'Linear',     default: 'linear',                         type: { kind: 'text' as const } },
        ],
      },
      {
        id: 'semantic',
        label: 'SEMANTIC',
        referencesTier: 'raw',
        items: [
          { id: 'tab-open',    cssVar: '--vr-easing-tab-open',  label: 'Tab Open',  default: 'ease-in',    type: { kind: 'text' as const } },
          { id: 'tab-close',   cssVar: '--vr-easing-tab-close', label: 'Tab Close', default: 'ease-out',   type: { kind: 'text' as const } },
          { id: 'modal-enter', cssVar: '--vr-easing-modal',     label: 'Modal',     default: 'ease-inout', type: { kind: 'text' as const } },
        ],
      },
    ],
  },
];
