/**
 * Assembles the `PanelConfig` consumed by the Vite + React example.
 *
 * Unlike the Astro example — which inlines this object as JSON via a
 * `<script type="application/json">` tag and reads it back from the host
 * adapter — this React example consumes the config directly as a TS module.
 * `src/main.tsx` calls `configurePanel(panelConfig)` BEFORE the first React
 * render, and `src/lib/mount-panel.ts` reads it via `getPanelConfig()`.
 *
 * The five identifier fields (`storagePrefix`, `consoleNamespace`,
 * `modalClassPrefix`, `schemaId`, `exportFilenameBase`) all share a
 * `vite-react-example*` namespace so localStorage entries, exported JSON,
 * and modal classnames cannot collide with any other host's panel
 * deployment.
 *
 * `applyEndpoint` is the relative path `/api/dev/apply`. `vite.config.ts`
 * proxies it to the bin sidecar on port 24683, so the panel's POST stays on
 * the same origin as the page it was served from — no CORS preflight, no
 * runtime URL coupling between the panel config and the sidecar's port.
 *
 * `applyRouting` shares the SAME JSON file the bin sidecar reads at startup
 * (`scaffold.routing.json`). The host UI and the apply server therefore
 * agree byte-for-byte on which CSS-var prefix maps to which file.
 */

import type { PanelConfig } from '@takazudo/zudo-design-token-panel';
import { defaultManifest } from './default-manifest';
import { defaultCluster } from './default-cluster';
import scaffoldRouting from '../../scaffold.routing.json';

export const panelConfig: PanelConfig = {
  storagePrefix: 'vite-react-example-tokens',
  consoleNamespace: 'viteReactExample',
  modalClassPrefix: 'vite-react-example-design-token-panel-modal',
  schemaId: 'vite-react-example-design-tokens/v1',
  exportFilenameBase: 'vite-react-example-design-tokens',
  tokens: defaultManifest,
  colorCluster: defaultCluster,
  applyEndpoint: '/api/dev/apply',
  applyRouting: scaffoldRouting,
  // Explicit opt-out for the secondary color cluster — the demo ships a
  // single primary palette only. `null` (NOT `undefined`) is the documented
  // signal that the host has no secondary cluster.
  secondaryColorCluster: null,
};
