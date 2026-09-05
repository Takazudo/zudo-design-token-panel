import type { PanelConfig } from '@takazudo/zdtp';
import { defaultTabs } from './default-manifest';
import { DEPLOY_MODE } from './build-info.generated';

export const panelConfig: PanelConfig = {
  storagePrefix: 'zfb-playground-tokens',
  consoleNamespace: 'zfb',
  modalClassPrefix: 'zfb-playground-design-token-panel-modal',
  schemaId: 'zfb-playground-design-tokens/v1',
  exportFilenameBase: 'zfb-playground-design-tokens',
  tabs: defaultTabs,
  applyEndpoint: DEPLOY_MODE ? undefined : '/api/dev/apply',
  applyRouting: DEPLOY_MODE ? undefined : { zfb: 'styles/global.css' },
};
