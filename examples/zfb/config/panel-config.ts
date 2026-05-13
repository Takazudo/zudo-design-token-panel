/**
 * Assembles the `PanelConfig` consumed by the zfb example.
 *
 * The five identifier fields (`storagePrefix`, `consoleNamespace`,
 * `modalClassPrefix`, `schemaId`, `exportFilenameBase`) all share a
 * `zfb-example*` namespace so localStorage entries, exported JSON, and
 * modal classnames cannot collide with any other host's panel deployment.
 *
 * `applyEndpoint` — CRITICAL DIFFERENCE vs. astro / vite-react / next
 * -----------------------------------------------------------------------
 * The other three examples set `applyEndpoint` to the bare relative path
 * `/api/dev/apply`, which their respective proxy mechanisms (Vite's
 * `server.proxy`, Next's API route) intercept WITHOUT a base prefix.
 *
 * zfb's `devMiddleware` hook, per issue #229 (fix commit `b1049ef`), mounts
 * registered paths under the project `base`. A bare `/api/dev/apply` is
 * never reached by the zfb dev server; only the FULL base-prefixed URL:
 *
 *   /pj/zudo-design-token-panel/examples/zfb/api/dev/apply
 *
 * is routed to the `dev-apply-proxy` plugin. The panel's POST must therefore
 * use this full path. See `zfb.config.ts`, `plugins/dev-apply-proxy.mjs`,
 * README.md, and `PROBE-REPORT.md` for the full rationale.
 *
 * This is a configuration requirement for this project, NOT a zfb bug.
 *
 * `applyRouting` shares the SAME JSON file the bin sidecar reads at startup
 * (`scaffold.routing.json`). The host UI and the apply server therefore
 * agree byte-for-byte on which CSS-var prefix maps to which file.
 */

import type { PanelConfig } from '@takazudo/zudo-design-token-panel/astro';
import { defaultTabs } from './default-manifest';

// Inlined from scaffold.routing.json — mirrors the same routing object the
// bin sidecar reads at startup. Kept in sync byte-for-byte with
// `scaffold.routing.json` so the host UI and the apply server agree on
// which CSS-var prefix maps to which file.
//
// Note: not imported as JSON because zfb's esbuild bundler pass currently
// resolves relative JSON imports from the temp entry dir, not the source
// file's directory. Inlining avoids the resolution issue without losing
// the semantic link to the routing contract.
const scaffoldRouting: Record<string, string> = {
  zfb: 'styles/global.css',
  // Easing tokens (Wave 7 demo) — same file as the other tokens.
  'zfb-easing': 'styles/global.css',
};

export const panelConfig: PanelConfig = {
  storagePrefix: 'zfb-example-tokens',
  consoleNamespace: 'zfb',
  modalClassPrefix: 'zfb-example-design-token-panel-modal',
  schemaId: 'zfb-example-design-tokens/v1',
  exportFilenameBase: 'zfb-example-design-tokens',
  tabs: defaultTabs,
  // Full base-prefixed URL — NOT the bare `/api/dev/apply` the other examples
  // use. Required because zfb's devMiddleware mounts handlers under `base`.
  // See the block comment above and PROBE-REPORT.md for the full rationale.
  applyEndpoint: '/pj/zudo-design-token-panel/examples/zfb/api/dev/apply',
  applyRouting: scaffoldRouting,
};
