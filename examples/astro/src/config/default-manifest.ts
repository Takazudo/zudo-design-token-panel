/**
 * Demo tab config for the Astro example.
 *
 * Every `cssVar` is an `--astro-*` name. These line up byte-for-byte
 * with the declarations in `src/styles/tokens.css` so the panel can rewrite
 * the same names live and the apply pipeline can rewrite them on disk.
 *
 * Mirrors the tab/tier layout of examples/zfb-tailwind/config/default-manifest.ts
 * with --zfbtw-* → --astro-* prefix substitution.
 *
 * The spacing tab uses a 2-tier setup:
 *   - Tier `hsp-scale`: 5-step horizontal spacing scale (xs..xl)
 *   - Tier `vsp-scale`: 7-step vertical spacing scale (2xs..2xl)
 *
 * The font tab uses a 2-tier setup:
 *   - Tier `raw`: 7 scale items (Tier 1, abstract)
 *   - Tier `semantic` (referencesTier: 'raw'): 6 concrete-purpose font roles
 *     (page-title, section-title, subsection-title, body, helper, annotation)
 *     each defaulting to a scale item id; emits var(--astro-scale-*).
 *
 * The color tab uses a 2-tier setup:
 *   - Tier `palette`: 16 hex swatches (kind: 'color')
 *   - Tier `semantic` (referencesTier: 'palette'): semantic role rows
 * Color extras (schemes, base roles, etc.) are on colorExtras.
 *
 * Migrated in Wave 5 from TokenManifest to TabConfig[].
 * Color cluster migrated to TabConfig in Wave 7.
 * Spacing hsp/vsp scales surfaced as separate tiers in Wave 8 (panel-hardening).
 * Extended to zfb-tailwind parity in framework-demo-parity wave (#185).
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
            id: 'astro-hsp-xs',
            cssVar: '--astro-hsp-xs',
            label: 'H-Spacing XS',
            default: '0.25rem',
            type: { kind: 'length', min: 0, max: 1, step: 0.0625, unit: 'rem' },
          },
          {
            id: 'astro-hsp-sm',
            cssVar: '--astro-hsp-sm',
            label: 'H-Spacing S',
            default: '0.5rem',
            type: { kind: 'length', min: 0, max: 2, step: 0.0625, unit: 'rem' },
          },
          {
            id: 'astro-hsp-md',
            cssVar: '--astro-hsp-md',
            label: 'H-Spacing M',
            default: '1rem',
            type: { kind: 'length', min: 0, max: 4, step: 0.0625, unit: 'rem' },
          },
          {
            id: 'astro-hsp-lg',
            cssVar: '--astro-hsp-lg',
            label: 'H-Spacing L',
            default: '1.5rem',
            type: { kind: 'length', min: 0, max: 6, step: 0.0625, unit: 'rem' },
          },
          {
            id: 'astro-hsp-xl',
            cssVar: '--astro-hsp-xl',
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
            id: 'astro-vsp-2xs',
            cssVar: '--astro-vsp-2xs',
            label: 'V-Spacing 2XS',
            default: '0.25rem',
            type: { kind: 'length', min: 0, max: 1, step: 0.0625, unit: 'rem' },
          },
          {
            id: 'astro-vsp-xs',
            cssVar: '--astro-vsp-xs',
            label: 'V-Spacing XS',
            default: '0.5rem',
            type: { kind: 'length', min: 0, max: 2, step: 0.0625, unit: 'rem' },
          },
          {
            id: 'astro-vsp-sm',
            cssVar: '--astro-vsp-sm',
            label: 'V-Spacing S',
            default: '0.75rem',
            type: { kind: 'length', min: 0, max: 2, step: 0.0625, unit: 'rem' },
          },
          {
            id: 'astro-vsp-md',
            cssVar: '--astro-vsp-md',
            label: 'V-Spacing M',
            default: '1rem',
            type: { kind: 'length', min: 0, max: 4, step: 0.0625, unit: 'rem' },
          },
          {
            id: 'astro-vsp-lg',
            cssVar: '--astro-vsp-lg',
            label: 'V-Spacing L',
            default: '1.75rem',
            type: { kind: 'length', min: 0, max: 6, step: 0.0625, unit: 'rem' },
          },
          {
            id: 'astro-vsp-xl',
            cssVar: '--astro-vsp-xl',
            label: 'V-Spacing XL',
            default: '2.5rem',
            type: { kind: 'length', min: 0, max: 8, step: 0.125, unit: 'rem' },
          },
          {
            id: 'astro-vsp-2xl',
            cssVar: '--astro-vsp-2xl',
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
            id: 'astro-scale-xs',
            cssVar: '--astro-scale-xs',
            label: 'Scale XS',
            default: '0.75rem',
            type: { kind: 'length', min: 0.5, max: 2, step: 0.0625, unit: 'rem' },
          },
          {
            id: 'astro-scale-sm',
            cssVar: '--astro-scale-sm',
            label: 'Scale SM',
            default: '0.875rem',
            type: { kind: 'length', min: 0.5, max: 2, step: 0.0625, unit: 'rem' },
          },
          {
            id: 'astro-scale-base',
            cssVar: '--astro-scale-base',
            label: 'Scale Base',
            default: '1rem',
            type: { kind: 'length', min: 0.5, max: 2, step: 0.0625, unit: 'rem' },
          },
          {
            id: 'astro-scale-md',
            cssVar: '--astro-scale-md',
            label: 'Scale MD',
            default: '1.125rem',
            type: { kind: 'length', min: 0.5, max: 2.5, step: 0.0625, unit: 'rem' },
          },
          {
            id: 'astro-scale-lg',
            cssVar: '--astro-scale-lg',
            label: 'Scale LG',
            default: '1.25rem',
            type: { kind: 'length', min: 0.75, max: 3, step: 0.0625, unit: 'rem' },
          },
          {
            id: 'astro-scale-xl',
            cssVar: '--astro-scale-xl',
            label: 'Scale XL',
            default: '1.75rem',
            type: { kind: 'length', min: 1, max: 4, step: 0.0625, unit: 'rem' },
          },
          {
            id: 'astro-scale-2xl',
            cssVar: '--astro-scale-2xl',
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
            id: 'astro-text-page-title',
            cssVar: '--astro-text-page-title',
            label: 'Page Title',
            default: 'astro-scale-xl',
            type: { kind: 'text' },
          },
          {
            id: 'astro-text-section-title',
            cssVar: '--astro-text-section-title',
            label: 'Section Title',
            default: 'astro-scale-lg',
            type: { kind: 'text' },
          },
          {
            id: 'astro-text-subsection-title',
            cssVar: '--astro-text-subsection-title',
            label: 'Sub-section / Table Header',
            default: 'astro-scale-md',
            type: { kind: 'text' },
          },
          {
            id: 'astro-text-body',
            cssVar: '--astro-text-body',
            label: 'Body',
            default: 'astro-scale-base',
            type: { kind: 'text' },
          },
          {
            id: 'astro-text-helper',
            cssVar: '--astro-text-helper',
            label: 'Helper / Caption',
            default: 'astro-scale-sm',
            type: { kind: 'text' },
          },
          {
            id: 'astro-text-annotation',
            cssVar: '--astro-text-annotation',
            label: 'Annotation',
            default: 'astro-scale-xs',
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
            id: 'astro-size-sidenav-w',
            cssVar: '--astro-size-sidenav-w',
            label: 'Sidenav Width',
            default: '14rem',
            type: { kind: 'length', min: 8, max: 24, step: 0.5, unit: 'rem' },
          },
          {
            id: 'astro-size-header-h',
            cssVar: '--astro-size-header-h',
            label: 'Header Height',
            default: '3.5rem',
            type: { kind: 'length', min: 2, max: 6, step: 0.25, unit: 'rem' },
          },
          {
            id: 'astro-size-avatar-sm',
            cssVar: '--astro-size-avatar-sm',
            label: 'Avatar SM',
            default: '2rem',
            type: { kind: 'length', min: 1, max: 4, step: 0.25, unit: 'rem' },
          },
          {
            id: 'astro-size-avatar-md',
            cssVar: '--astro-size-avatar-md',
            label: 'Avatar MD',
            default: '2.5rem',
            type: { kind: 'length', min: 1, max: 5, step: 0.25, unit: 'rem' },
          },
          {
            id: 'astro-size-icon-sm',
            cssVar: '--astro-size-icon-sm',
            label: 'Icon SM',
            default: '1rem',
            type: { kind: 'length', min: 0.5, max: 2, step: 0.0625, unit: 'rem' },
          },
          {
            id: 'astro-size-icon-md',
            cssVar: '--astro-size-icon-md',
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
            id: 'astro-radius',
            cssVar: '--astro-radius',
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
          { id: 'astro-palette-0',  cssVar: '--astro-palette-0',  label: 'Palette 0',  default: '#1e1e1e', type: { kind: 'color' as const } },
          { id: 'astro-palette-1',  cssVar: '--astro-palette-1',  label: 'Palette 1',  default: '#2d6cdf', type: { kind: 'color' as const } },
          { id: 'astro-palette-2',  cssVar: '--astro-palette-2',  label: 'Palette 2',  default: '#3aa676', type: { kind: 'color' as const } },
          { id: 'astro-palette-3',  cssVar: '--astro-palette-3',  label: 'Palette 3',  default: '#d97706', type: { kind: 'color' as const } },
          { id: 'astro-palette-4',  cssVar: '--astro-palette-4',  label: 'Palette 4',  default: '#9b5de5', type: { kind: 'color' as const } },
          { id: 'astro-palette-5',  cssVar: '--astro-palette-5',  label: 'Palette 5',  default: '#e63946', type: { kind: 'color' as const } },
          { id: 'astro-palette-6',  cssVar: '--astro-palette-6',  label: 'Palette 6',  default: '#1d3557', type: { kind: 'color' as const } },
          { id: 'astro-palette-7',  cssVar: '--astro-palette-7',  label: 'Palette 7',  default: '#06b6d4', type: { kind: 'color' as const } },
          { id: 'astro-palette-8',  cssVar: '--astro-palette-8',  label: 'Palette 8',  default: '#475569', type: { kind: 'color' as const } },
          { id: 'astro-palette-9',  cssVar: '--astro-palette-9',  label: 'Palette 9',  default: '#94a3b8', type: { kind: 'color' as const } },
          { id: 'astro-palette-10', cssVar: '--astro-palette-10', label: 'Palette 10', default: '#cbd5e1', type: { kind: 'color' as const } },
          { id: 'astro-palette-11', cssVar: '--astro-palette-11', label: 'Palette 11', default: '#e2e8f0', type: { kind: 'color' as const } },
          { id: 'astro-palette-12', cssVar: '--astro-palette-12', label: 'Palette 12', default: '#f1f5f9', type: { kind: 'color' as const } },
          { id: 'astro-palette-13', cssVar: '--astro-palette-13', label: 'Palette 13', default: '#fef3c7', type: { kind: 'color' as const } },
          { id: 'astro-palette-14', cssVar: '--astro-palette-14', label: 'Palette 14', default: '#bbf7d0', type: { kind: 'color' as const } },
          { id: 'astro-palette-15', cssVar: '--astro-palette-15', label: 'Palette 15', default: '#f8fafc', type: { kind: 'color' as const } },
        ],
      },
      {
        id: 'semantic',
        label: 'Semantic',
        referencesTier: 'palette',
        items: [
          { id: 'primary', cssVar: '--astro-color-primary', label: '--astro-color-primary', default: 'astro-palette-1', type: { kind: 'color' as const } },
          { id: 'accent',  cssVar: '--astro-color-accent',  label: '--astro-color-accent',  default: 'astro-palette-3', type: { kind: 'color' as const } },
          { id: 'surface', cssVar: '--astro-color-surface', label: '--astro-color-surface', default: 'astro-palette-0', type: { kind: 'color' as const } },
          { id: 'muted',   cssVar: '--astro-color-muted',   label: '--astro-color-muted',   default: 'astro-palette-8', type: { kind: 'color' as const } },
          { id: 'success', cssVar: '--astro-color-success', label: '--astro-color-success', default: 'astro-palette-2', type: { kind: 'color' as const } },
          { id: 'warning', cssVar: '--astro-color-warning', label: '--astro-color-warning', default: 'astro-palette-3', type: { kind: 'color' as const } },
          { id: 'danger',  cssVar: '--astro-color-danger',  label: '--astro-color-danger',  default: 'astro-palette-5', type: { kind: 'color' as const } },
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
          { id: 'ease-in',    cssVar: '--astro-easing-ease-in',    label: 'Ease In',    default: 'cubic-bezier(0.42, 0, 1, 1)',    type: { kind: 'text' as const } },
          { id: 'ease-out',   cssVar: '--astro-easing-ease-out',   label: 'Ease Out',   default: 'cubic-bezier(0, 0, 0.58, 1)',    type: { kind: 'text' as const } },
          { id: 'ease-inout', cssVar: '--astro-easing-ease-inout', label: 'Ease InOut', default: 'cubic-bezier(0.42, 0, 0.58, 1)', type: { kind: 'text' as const } },
          { id: 'linear',     cssVar: '--astro-easing-linear',     label: 'Linear',     default: 'linear',                         type: { kind: 'text' as const } },
        ],
      },
      {
        id: 'semantic',
        label: 'SEMANTIC',
        referencesTier: 'raw',
        items: [
          { id: 'tab-open',    cssVar: '--astro-easing-tab-open',    label: 'Tab Open',   default: 'ease-in',    type: { kind: 'text' as const } },
          { id: 'tab-close',   cssVar: '--astro-easing-tab-close',   label: 'Tab Close',  default: 'ease-out',   type: { kind: 'text' as const } },
          { id: 'modal-enter', cssVar: '--astro-easing-modal',       label: 'Modal',      default: 'ease-inout', type: { kind: 'text' as const } },
        ],
      },
    ],
  },
];
