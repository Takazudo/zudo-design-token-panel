import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

/**
 * Vite + React example for @takazudo/zudo-design-token-panel.
 *
 * Deliberately minimal: NO Tailwind, NO design-system integration, NO MDX,
 * NO `react -> preact/compat` alias. The example proves the panel package
 * works inside any Vite + React consumer that supplies just a `PanelConfig`
 * and ships `preact` alongside React for the panel's own render tree.
 *
 * Apply-pipeline proxy
 * --------------------
 * `panelConfig.applyEndpoint` is set to the relative path `/api/dev/apply` so
 * the panel POSTs to the same origin as the Vite dev server (no CORS
 * preflight, no hardcoded port in the runtime config). Vite proxies that
 * path to the bin sidecar on port 24683. This keeps the example app a
 * vanilla static-output Vite build and avoids pulling in a Node server just
 * to host one dev-only POST endpoint.
 *
 * IMPORTANT: do NOT alias `react` -> `preact/compat`. The example must use
 * real React 18 — that is the entire point of the example. The panel renders
 * via its own Preact runtime inside the panel root element, fully isolated
 * from the host React tree.
 *
 * Deploy base path
 * ----------------
 * `base: '/pj/zudo-design-token-panel/vite-react/'` is applied to the production build only —
 * Vite's dev server still serves at `/`, so the dev-only `/api/dev/apply`
 * proxy above is unaffected. The build output is intended to be hosted under
 * `https://<host>/pj/zudo-design-token-panel/vite-react/`.
 *
 * `panelConfig.applyEndpoint` deliberately stays as the bare relative path
 * `/api/dev/apply` — it is a dev-server-only proxy target that does not exist
 * in the production deploy, so it must NOT be base-prefixed.
 */
export default defineConfig({
  base: '/pj/zudo-design-token-panel/vite-react/',
  plugins: [react()],
  server: {
    port: 44325,
    proxy: {
      '/api/dev/apply': {
        target: 'http://127.0.0.1:24683',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/dev\/apply/, '/apply'),
      },
    },
  },
});
