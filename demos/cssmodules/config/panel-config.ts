import type { PanelConfig } from '@takazudo/zdtp';
import { defaultTabs } from './default-manifest';
import { DEPLOY_MODE } from './build-info.generated';

export const panelConfig: PanelConfig = {
  storagePrefix: 'zdtp-demo-cssmodules-tokens-v1',
  consoleNamespace: 'zdtpCssmodules',
  modalClassPrefix: 'zdtp-demo-cssmodules-modal',
  schemaId: 'zdtp-demo-cssmodules-design-tokens/v1',
  exportFilenameBase: 'zdtp-demo-cssmodules-design-tokens',
  tabs: defaultTabs,
  applyEndpoint: DEPLOY_MODE ? undefined : '/api/dev/apply',
  applyRouting: DEPLOY_MODE ? undefined : { demo: 'styles/tokens.css' },
};
