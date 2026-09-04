import type { ColorScheme, TabConfig, TierItem } from '@takazudo/zdtp';

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

const color = (index: number, value: string): TierItem => ({
  id: `zfb-palette-${index}`,
  cssVar: `--zfb-palette-${index}`,
  label: `Palette ${index}`,
  default: value,
  type: { kind: 'color' },
});

const palette: ColorScheme['palette'] = [
  '#f8fafc', '#2563eb', '#16a34a', '#d97706', '#7c3aed', '#dc2626', '#0f172a', '#0891b2',
  '#64748b', '#94a3b8', '#cbd5e1', '#e2e8f0', '#f1f5f9', '#fef3c7', '#bbf7d0', '#ffffff',
];

const lightColorScheme = {
  background: 0,
  foreground: 6,
  cursor: 4,
  selectionBg: 1,
  selectionFg: 15,
  palette,
  shikiTheme: 'github-light',
};

const darkPalette: ColorScheme['palette'] = [
  '#0f172a', '#60a5fa', '#4ade80', '#fbbf24', '#a78bfa', '#f87171', '#f8fafc', '#22d3ee',
  '#94a3b8', '#64748b', '#475569', '#334155', '#1e293b', '#78350f', '#14532d', '#020617',
];

const darkColorScheme = {
  background: 0,
  foreground: 6,
  cursor: 4,
  selectionBg: 1,
  selectionFg: 15,
  palette: darkPalette,
  shikiTheme: 'github-dark',
};

export const defaultTabs: readonly TabConfig[] = [
  {
    id: 'spacing',
    label: 'Spacing',
    tiers: [
      {
        id: 'hsp-scale',
        label: 'Horizontal spacing',
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
        items: [
          { id: 'zfb-leading-tight', cssVar: '--zfb-leading-tight', label: 'Tight', default: '1.2', type: { kind: 'number', step: 0.05 } },
          { id: 'zfb-leading-body', cssVar: '--zfb-leading-body', label: 'Body', default: '1.6', type: { kind: 'number', step: 0.05 } },
          { id: 'zfb-leading-relaxed', cssVar: '--zfb-leading-relaxed', label: 'Relaxed', default: '1.8', type: { kind: 'number', step: 0.05 } },
        ],
      },
      {
        id: 'font-weight',
        label: 'Font weight',
        items: [
          { id: 'zfb-weight-body', cssVar: '--zfb-weight-body', label: 'Body', default: '400', type: { kind: 'select', options: ['300', '400', '500', '600', '700'] } },
          { id: 'zfb-weight-heading', cssVar: '--zfb-weight-heading', label: 'Heading', default: '700', type: { kind: 'select', options: ['400', '500', '600', '700', '800'] } },
        ],
      },
      {
        id: 'font-family',
        label: 'Font family',
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
        items: [
          length('zfb-radius-sm', '--zfb-radius-sm', 'Small', '0.25rem'),
          length('zfb-radius-md', '--zfb-radius-md', 'Medium', '0.5rem'),
          length('zfb-radius-lg', '--zfb-radius-lg', 'Large', '1rem'),
        ],
      },
      {
        id: 'transition',
        label: 'Transition',
        items: [
          length('zfb-transition-fast', '--zfb-transition-fast', 'Fast', '120ms', 10, 'ms'),
          length('zfb-transition-normal', '--zfb-transition-normal', 'Normal', '220ms', 10, 'ms'),
        ],
      },
    ],
  },
  {
    id: 'color',
    label: 'Color',
    colorExtras: {
      id: 'zfb-playground',
      label: 'zfb playground',
      baseRoles: { background: '--zfb-bg', foreground: '--zfb-fg' },
      baseDefaults: { background: 0, foreground: 6 },
      defaultShikiTheme: 'github-light',
      colorSchemes: { Light: lightColorScheme, Dark: darkColorScheme },
      panelSettings: {
        colorScheme: 'Light',
        colorMode: { defaultMode: 'light', lightScheme: 'Light', darkScheme: 'Dark' },
      },
    },
    tiers: [
      {
        id: 'palette',
        label: 'Palette',
        items: palette.map((value, index) => color(index, value)),
      },
      {
        id: 'semantic',
        label: 'Semantic',
        referencesTier: 'palette',
        items: [
          { ...color(1, palette[1]), id: 'primary', cssVar: '--zfb-color-primary', label: 'Primary', default: 'zfb-palette-1' },
          { ...color(3, palette[3]), id: 'accent', cssVar: '--zfb-color-accent', label: 'Accent', default: 'zfb-palette-3' },
          { ...color(15, palette[15]), id: 'surface', cssVar: '--zfb-color-surface', label: 'Surface', default: 'zfb-palette-15' },
          { ...color(8, palette[8]), id: 'muted', cssVar: '--zfb-color-muted', label: 'Muted', default: 'zfb-palette-8' },
          { ...color(2, palette[2]), id: 'success', cssVar: '--zfb-color-success', label: 'Success', default: 'zfb-palette-2' },
          { ...color(5, palette[5]), id: 'danger', cssVar: '--zfb-color-danger', label: 'Danger', default: 'zfb-palette-5' },
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
