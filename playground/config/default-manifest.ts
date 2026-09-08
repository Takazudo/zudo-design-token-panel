import type { TabConfig, TierItem } from '@takazudo/zdtp';

const length = (
  id: string,
  cssVar: string,
  label: string,
  defaultValue: string,
  step = 0.0625,
  unit = 'rem',
): TierItem => ({
  id,
  cssVar,
  label,
  default: defaultValue,
  type: { kind: 'length', step, unit },
});

const text = (id: string, cssVar: string, label: string, defaultValue: string): TierItem => ({
  id,
  cssVar,
  label,
  default: defaultValue,
  type: { kind: 'text' },
});

const color = (id: string, cssVar: string, label: string, value: string): TierItem => ({
  id,
  cssVar,
  label,
  default: value,
  type: { kind: 'color', format: 'oklch' },
});

const ramp = (group: string, label: string, values: readonly string[], labels?: readonly string[]) => ({
  id: group,
  label,
  items: values.map((value, index) =>
    color(`${group}-${index}`, `--zfb-palette-${group}-${index}`, labels?.[index] ?? `${label} ${index}`, value)),
});

const semantic = (id: string, label: string, ref: string, cssVar = `--zfb-color-${id}`) =>
  color(id, cssVar, label, ref);

// Per-mode var() literals keep both modes connected to the immutable Tier-1 ramps.
const perMode = (light: string, dark: string) => ({
  literal: { light: `var(--zfb-palette-${light})`, dark: `var(--zfb-palette-${dark})` },
});

export const defaultTabs: readonly TabConfig[] = [
  {
    id: 'spacing',
    label: 'Spacing',
    tiers: [
      {
        id: 'hsp-scale',
        label: 'Horizontal spacing',
        preview: 'bar',
        items: [
          length('zfb-hsp-xs', '--zfb-hsp-xs', 'H-Spacing XS', '0.25rem'),
          length('zfb-hsp-sm', '--zfb-hsp-sm', 'H-Spacing S', '0.5rem'),
          length('zfb-hsp-md', '--zfb-hsp-md', 'H-Spacing M', '1rem'),
          length('zfb-hsp-lg', '--zfb-hsp-lg', 'H-Spacing L', '1.5rem'),
          length('zfb-hsp-xl', '--zfb-hsp-xl', 'H-Spacing XL', '2rem', 0.125),
        ],
      },
      {
        id: 'vsp-scale',
        label: 'Vertical spacing',
        preview: 'bar',
        items: [
          length('zfb-vsp-2xs', '--zfb-vsp-2xs', 'V-Spacing 2XS', '0.25rem'),
          length('zfb-vsp-xs', '--zfb-vsp-xs', 'V-Spacing XS', '0.5rem'),
          length('zfb-vsp-sm', '--zfb-vsp-sm', 'V-Spacing S', '0.75rem'),
          length('zfb-vsp-md', '--zfb-vsp-md', 'V-Spacing M', '1rem'),
          length('zfb-vsp-lg', '--zfb-vsp-lg', 'V-Spacing L', '1.75rem'),
          length('zfb-vsp-xl', '--zfb-vsp-xl', 'V-Spacing XL', '2.5rem', 0.125),
          length('zfb-vsp-2xl', '--zfb-vsp-2xl', 'V-Spacing 2XL', '3.5rem', 0.25),
        ],
      },
    ],
  },
  {
    id: 'font',
    label: 'Font',
    tiers: [
      {
        id: 'font-scale',
        label: 'Font scale',
        preview: 'size',
        items: [
          length('zfb-scale-xs', '--zfb-scale-xs', 'Scale XS', '0.75rem'),
          length('zfb-scale-sm', '--zfb-scale-sm', 'Scale SM', '0.875rem'),
          length('zfb-scale-base', '--zfb-scale-base', 'Scale Base', '1rem'),
          length('zfb-scale-md', '--zfb-scale-md', 'Scale MD', '1.125rem'),
          length('zfb-scale-lg', '--zfb-scale-lg', 'Scale LG', '1.25rem'),
          length('zfb-scale-xl', '--zfb-scale-xl', 'Scale XL', '1.75rem'),
          length('zfb-scale-2xl', '--zfb-scale-2xl', 'Scale 2XL', '2.5rem'),
        ],
      },
      {
        id: 'font-role',
        label: 'Font role',
        preview: 'size',
        referencesTier: 'font-scale',
        items: [
          text('zfb-text-page-title', '--zfb-text-page-title', 'Page title', 'zfb-scale-xl'),
          text('zfb-text-section-title', '--zfb-text-section-title', 'Section title', 'zfb-scale-lg'),
          text('zfb-text-subsection-title', '--zfb-text-subsection-title', 'Subsection title', 'zfb-scale-md'),
          text('zfb-text-body', '--zfb-text-body', 'Body', 'zfb-scale-base'),
          text('zfb-text-helper', '--zfb-text-helper', 'Helper', 'zfb-scale-sm'),
          text('zfb-text-annotation', '--zfb-text-annotation', 'Annotation', 'zfb-scale-xs'),
        ],
      },
      {
        id: 'line-height',
        label: 'Line height',
        preview: 'line-height',
        previewBase: '--zfb-scale-base',
        items: [
          { id: 'zfb-leading-tight', cssVar: '--zfb-leading-tight', label: 'Tight', default: '1.2', type: { kind: 'number', step: 0.05 } },
          { id: 'zfb-leading-body', cssVar: '--zfb-leading-body', label: 'Body', default: '1.6', type: { kind: 'number', step: 0.05 } },
          { id: 'zfb-leading-relaxed', cssVar: '--zfb-leading-relaxed', label: 'Relaxed', default: '1.8', type: { kind: 'number', step: 0.05 } },
        ],
      },
      {
        id: 'font-weight',
        label: 'Font weight',
        preview: 'weight',
        items: [
          { id: 'zfb-weight-body', cssVar: '--zfb-weight-body', label: 'Body', default: '400', type: { kind: 'select', options: ['300', '400', '500', '600', '700'] } },
          { id: 'zfb-weight-heading', cssVar: '--zfb-weight-heading', label: 'Heading', default: '700', type: { kind: 'select', options: ['400', '500', '600', '700', '800'] } },
        ],
      },
      {
        id: 'font-family',
        label: 'Font family',
        preview: 'family',
        items: [
          text('zfb-font-sans', '--zfb-font-sans', 'Sans', 'system-ui, sans-serif'),
          text('zfb-font-mono', '--zfb-font-mono', 'Mono', 'ui-monospace, monospace'),
        ],
      },
    ],
  },
  {
    id: 'size',
    label: 'Size',
    tiers: [
      {
        id: 'radius',
        label: 'Radius',
        preview: 'radius',
        items: [
          length('zfb-radius-sm', '--zfb-radius-sm', 'Small', '0.25rem'),
          length('zfb-radius-md', '--zfb-radius-md', 'Medium', '0.5rem'),
          length('zfb-radius-lg', '--zfb-radius-lg', 'Large', '1rem'),
        ],
      },
      {
        id: 'transition',
        label: 'Transition',
        preview: 'duration',
        items: [
          length('zfb-transition-fast', '--zfb-transition-fast', 'Fast', '120ms', 10, 'ms'),
          length('zfb-transition-normal', '--zfb-transition-normal', 'Normal', '220ms', 10, 'ms'),
        ],
      },
    ],
  },
  {
    id: 'palette',
    label: 'Palette',
    tiers: [
      ramp('base', 'Base', [
        'oklch(98.5% .003 264)', 'oklch(95% .004 264)', 'oklch(88% .006 264)',
        'oklch(62% .010 264)', 'oklch(38% .012 264)', 'oklch(22% .014 264)',
        'oklch(13% .012 264)',
      ]),
      ramp('brand', 'Brand', [
        'oklch(95% .03 250)', 'oklch(80% .10 250)', 'oklch(58% .19 250)',
        'oklch(45% .16 250)', 'oklch(32% .11 250)',
      ]),
      ramp('accent', 'Accent', [
        'oklch(95% .035 50)', 'oklch(78% .12 50)', 'oklch(62% .15 50)', 'oklch(45% .12 50)',
      ]),
      ramp('state', 'State', [
        'oklch(64% .15 150)', 'oklch(62% .19 25)', 'oklch(76% .14 82)', 'oklch(64% .14 245)',
      ], ['Success', 'Danger', 'Warning', 'Info']),
    ],
  },
  {
    id: 'color',
    label: 'Color',
    colorExtras: {
      id: 'zfb-playground',
      label: 'zfb playground',
      baseRoles: {},
      baseDefaults: {},
      defaultShikiTheme: 'github-light',
      colorSchemes: {},
      panelSettings: { colorScheme: 'default', colorMode: false },
      semanticDefaults: {
        bg: perMode('base-0', 'base-6'),
        fg: perMode('base-6', 'base-0'),
        surface: perMode('base-1', 'base-5'),
        border: perMode('base-2', 'base-4'),
        muted: perMode('base-4', 'base-2'),
        'code-bg': perMode('base-6', 'base-1'),
        'code-fg': perMode('base-0', 'base-6'),
        primary: perMode('brand-3', 'brand-1'),
        'primary-hover': perMode('brand-4', 'brand-0'),
        'primary-subtle': perMode('brand-0', 'brand-4'),
        accent: perMode('accent-3', 'accent-1'),
      },
    },
    tiers: [
      {
        id: 'semantic',
        label: 'Semantic',
        semantic: true,
        referencesRamps: [
          { tab: 'palette', tier: 'base' },
          { tab: 'palette', tier: 'brand' },
          { tab: 'palette', tier: 'accent' },
          { tab: 'palette', tier: 'state' },
        ],
        items: [
          semantic('bg', 'Background', 'base:base-0', '--zfb-bg'),
          semantic('fg', 'Foreground', 'base:base-6', '--zfb-fg'),
          semantic('surface', 'Surface', 'base:base-1'),
          semantic('border', 'Border', 'base:base-2'),
          semantic('muted', 'Muted', 'base:base-4'),
          semantic('code-bg', 'Code background', 'base:base-6'),
          semantic('code-fg', 'Code foreground', 'base:base-0'),
          semantic('primary', 'Primary', 'brand:brand-3'),
          semantic('primary-hover', 'Primary hover', 'brand:brand-4'),
          semantic('primary-subtle', 'Primary subtle', 'brand:brand-0'),
          semantic('accent', 'Accent', 'accent:accent-3'),
          // State colors are decorative swatches, never text or text-bearing fills.
          semantic('success', 'Success', 'state:state-0'),
          semantic('danger', 'Danger', 'state:state-1'),
          semantic('warning', 'Warning', 'state:state-2'),
          semantic('info', 'Info', 'state:state-3'),
        ],
      },
    ],
  },
  {
    id: 'easing',
    label: 'Easing',
    tiers: [
      {
        id: 'easing',
        label: 'Easing',
        items: [
          text('zfb-easing-standard', '--zfb-easing-standard', 'Standard', 'cubic-bezier(0.2, 0, 0, 1)'),
          text('zfb-easing-linear', '--zfb-easing-linear', 'Linear', 'linear'),
        ],
      },
    ],
  },
  {
    id: 'notes',
    label: 'Notes',
    tiers: [],
    notesExtras: {
      title: 'Playground manifest',
      html: '<p>This consumer uses the unpublished workspace panel. Choose the vendored zudo-doc manifest with <code>?manifest=zudo-doc</code>.</p>',
    },
  },
];
