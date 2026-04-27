/**
 * Assembles the `PanelConfig` consumed by `<DesignTokenPanelHost>`.
 *
 * The five identifier fields (`storagePrefix`, `consoleNamespace`,
 * `modalClassPrefix`, `schemaId`, `exportFilenameBase`) all share an
 * `astro-example*` namespace so localStorage entries, exported JSON, and
 * modal classnames cannot collide with any other host's panel deployment.
 *
 * `applyEndpoint` is the relative path `/api/dev/apply`. `astro.config.ts`
 * proxies it to the bin sidecar on port 24682, so the panel's POST stays on
 * the same origin as the page it was served from — no CORS preflight, no
 * runtime URL coupling between the panel config and the sidecar's port.
 *
 * `applyRouting` shares the SAME JSON file the bin sidecar reads at startup
 * (`scaffold.routing.json`). The host UI and the apply server therefore
 * agree byte-for-byte on which CSS-var prefix maps to which file.
 */

import type { PanelConfig } from '@takazudo/zudo-design-token-panel/astro';
import { defaultManifest } from './default-manifest';
import { defaultCluster } from './default-cluster';
import scaffoldRouting from '../../scaffold.routing.json';

export const panelConfig: PanelConfig = {
  storagePrefix: 'astro-example-tokens',
  consoleNamespace: 'astroExample',
  modalClassPrefix: 'astro-example-design-token-panel-modal',
  schemaId: 'astro-example-design-tokens/v1',
  exportFilenameBase: 'astro-example-design-tokens',
  tokens: defaultManifest,
  colorCluster: defaultCluster,
  applyEndpoint: '/api/dev/apply',
  applyRouting: scaffoldRouting,
  // Explicit opt-out for the secondary color cluster — the demo ships a
  // single primary palette only. `null` (NOT `undefined`) is the documented
  // signal that the host has no secondary cluster.
  secondaryColorCluster: null,
};
