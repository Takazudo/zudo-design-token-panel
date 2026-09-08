import type { PanelConfig } from '@takazudo/zdtp';

export const panelConfig = {
  storagePrefix: 'zdtp-minimal-palette-v2',
  consoleNamespace: 'zdtpMinimal',
  modalClassPrefix: 'zdtp-minimal-modal',
  schemaId: 'zdtp-minimal-tokens/v1',
  exportFilenameBase: 'zdtp-minimal-tokens',
  autoRememberOnOpen: false,
  tabs: [
    {
      id: 'palette', label: 'Palette',
      tiers: [
        {
          id: 'base', label: 'Base',
          items: [
            { id: 'base-0', cssVar: '--zdtpmin-palette-base-0', label: 'Base 0', default: 'oklch(98.5% .003 264)', type: { kind: 'color', format: 'oklch' } },
            { id: 'base-1', cssVar: '--zdtpmin-palette-base-1', label: 'Base 1', default: 'oklch(95% .004 264)', type: { kind: 'color', format: 'oklch' } },
            { id: 'base-2', cssVar: '--zdtpmin-palette-base-2', label: 'Base 2', default: 'oklch(88% .006 264)', type: { kind: 'color', format: 'oklch' } },
            { id: 'base-3', cssVar: '--zdtpmin-palette-base-3', label: 'Base 3', default: 'oklch(38% .012 264)', type: { kind: 'color', format: 'oklch' } },
            { id: 'base-4', cssVar: '--zdtpmin-palette-base-4', label: 'Base 4', default: 'oklch(13% .012 264)', type: { kind: 'color', format: 'oklch' } },
          ],
        },
        {
          id: 'accent', label: 'Accent',
          items: [
            { id: 'accent-0', cssVar: '--zdtpmin-palette-accent-0', label: 'Accent 0', default: 'oklch(95% .03 250)', type: { kind: 'color', format: 'oklch' } },
            { id: 'accent-1', cssVar: '--zdtpmin-palette-accent-1', label: 'Accent 1', default: 'oklch(58% .19 250)', type: { kind: 'color', format: 'oklch' } },
            { id: 'accent-2', cssVar: '--zdtpmin-palette-accent-2', label: 'Accent 2', default: 'oklch(45% .16 250)', type: { kind: 'color', format: 'oklch' } },
          ],
        },
      ],
    },
    {
      id: 'color', label: 'Color',
      tiers: [{
        id: 'semantic', label: 'Semantic', semantic: true,
        referencesRamps: [{ tab: 'palette', tier: 'base' }, { tab: 'palette', tier: 'accent' }],
        items: [
          { id: 'bg', cssVar: '--zdtpmin-bg', label: 'Bg', default: 'base:base-1', type: { kind: 'color', format: 'oklch' } },
          { id: 'ink', cssVar: '--zdtpmin-ink', label: 'Ink', default: 'base:base-4', type: { kind: 'color', format: 'oklch' } },
          { id: 'muted', cssVar: '--zdtpmin-muted', label: 'Muted', default: 'base:base-3', type: { kind: 'color', format: 'oklch' } },
          { id: 'surface', cssVar: '--zdtpmin-surface', label: 'Surface', default: 'base:base-0', type: { kind: 'color', format: 'oklch' } },
          { id: 'border', cssVar: '--zdtpmin-border', label: 'Border', default: 'base:base-2', type: { kind: 'color', format: 'oklch' } },
          { id: 'accent', cssVar: '--zdtpmin-accent', label: 'Accent', default: 'accent:accent-2', type: { kind: 'color', format: 'oklch' } },
        ],
      }],
      colorExtras: {
        id: 'zdtpmin-theme', label: 'Minimal theme',
        baseRoles: {}, baseDefaults: {}, colorSchemes: {},
        defaultShikiTheme: 'github-light',
        panelSettings: { colorScheme: 'default', colorMode: false },
        semanticDefaults: {
          bg: { literal: { light: 'var(--zdtpmin-palette-base-1)', dark: 'var(--zdtpmin-palette-base-4)' } },
          ink: { literal: { light: 'var(--zdtpmin-palette-base-4)', dark: 'var(--zdtpmin-palette-base-0)' } },
          muted: { literal: { light: 'var(--zdtpmin-palette-base-3)', dark: 'var(--zdtpmin-palette-base-2)' } },
          surface: { literal: { light: 'var(--zdtpmin-palette-base-0)', dark: 'var(--zdtpmin-palette-base-3)' } },
          accent: { literal: { light: 'var(--zdtpmin-palette-accent-2)', dark: 'var(--zdtpmin-palette-accent-0)' } },
        },
      },
    },
    {
      id: 'theme',
      label: 'Theme',
      tiers: [
        {
          id: 'spacing',
          label: 'Spacing',
          items: [
            { id: 'gap', cssVar: '--zdtpmin-gap', label: 'Gap', default: '20px', type: { kind: 'length', step: 1, unit: 'px' } },
            { id: 'radius', cssVar: '--zdtpmin-radius', label: 'Radius', default: '18px', type: { kind: 'length', step: 1, unit: 'px' } },
          ],
        },
      ],
    },
  ],
} satisfies PanelConfig;
