import type { PanelConfig } from '@takazudo/zdtp';
import { defaultTabs } from './default-manifest';
import { DEPLOY_MODE } from './build-info.generated';

export const panelConfig: PanelConfig = {
  storagePrefix: 'zdtp-demo-zudowind-tokens-v1',
  consoleNamespace: 'zdtpZudowind',
  modalClassPrefix: 'zdtp-demo-zudowind-modal',
  schemaId: 'zdtp-demo-zudowind-design-tokens/v1',
  exportFilenameBase: 'zdtp-demo-zudowind-design-tokens',
  tabs: defaultTabs,
  applyEndpoint: DEPLOY_MODE ? undefined : '/api/dev/apply',
  applyRouting: DEPLOY_MODE ? undefined : { demo: 'styles/tokens.css' },
};
