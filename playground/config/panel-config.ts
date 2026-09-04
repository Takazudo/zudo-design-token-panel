import type { PanelConfig } from '@takazudo/zdtp';
import { defaultTabs } from './default-manifest';

export const panelConfig: PanelConfig = {
  storagePrefix: 'zfb-playground-tokens',
  consoleNamespace: 'zfb',
  modalClassPrefix: 'zfb-playground-design-token-panel-modal',
  schemaId: 'zfb-playground-design-tokens/v1',
  exportFilenameBase: 'zfb-playground-design-tokens',
  tabs: defaultTabs,
  applyEndpoint: '/api/dev/apply',
  applyRouting: { zfb: 'styles/global.css' },
};
