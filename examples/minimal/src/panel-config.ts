import type { PanelConfig } from '@takazudo/zdtp';

export const panelConfig = {
  storagePrefix: 'zdtp-minimal',
  consoleNamespace: 'zdtpMinimal',
  modalClassPrefix: 'zdtp-minimal-modal',
  schemaId: 'zdtp-minimal-tokens/v1',
  exportFilenameBase: 'zdtp-minimal-tokens',
  autoRememberOnOpen: false,
  tabs: [
    {
      id: 'theme',
      label: 'Theme',
      tiers: [
        {
          id: 'colors',
          label: 'Colors',
          items: [
            { id: 'ink', cssVar: '--zdtpmin-ink', label: 'Ink', default: '#172033', type: { kind: 'color' } },
            { id: 'muted', cssVar: '--zdtpmin-muted', label: 'Muted ink', default: '#59647a', type: { kind: 'color' } },
            { id: 'surface', cssVar: '--zdtpmin-surface', label: 'Surface', default: '#ffffff', type: { kind: 'color' } },
            { id: 'accent', cssVar: '--zdtpmin-accent', label: 'Accent', default: '#5b4be7', type: { kind: 'color' } },
          ],
        },
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
