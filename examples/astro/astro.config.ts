import { defineConfig } from 'astro/config';
import preact from '@astrojs/preact';

/**
 * Astro example for @takazudo/zudo-design-token-panel.
 *
 * Deliberately minimal: NO Tailwind, NO design-system integration, NO MDX.
 * The example proves the panel package works inside any Astro consumer that
 * supplies just `@astrojs/preact` + a `PanelConfig`.
 *
 * Apply-pipeline proxy
 * --------------------
 * `panelConfig.applyEndpoint` is set to the relative path `/api/dev/apply` so
 * the panel POSTs to the same origin as the Astro dev server (no CORS
 * preflight, no hardcoded port in the runtime config). The Vite dev server
 * underneath Astro proxies that path to the bin sidecar on port 24682. This
 * keeps the example app static-output and avoids pulling in an SSR adapter
 * just to host one dev-only POST endpoint.
 */
export default defineConfig({
  output: 'static',
  devToolbar: { enabled: false },
  integrations: [preact()],
  server: {
    port: 44324,
  },
  vite: {
    server: {
      proxy: {
        '/api/dev/apply': {
          target: 'http://127.0.0.1:24682',
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/api\/dev\/apply/, '/apply'),
        },
      },
    },
  },
});
