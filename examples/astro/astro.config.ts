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
 *
 * Deploy `base`
 * -------------
 * `base: '/pj/zudo-design-token-panel/astro/'` mirrors the production deploy path under the
 * monorepo's docs site (see issue #18). Astro applies this prefix to every
 * emitted asset URL and to the dev server's served paths, so navigation
 * links inside `src/pages` use `import.meta.env.BASE_URL` to stay portable.
 *
 * Importantly, Astro's `base` does NOT prefix Vite's proxy match path —
 * `/api/dev/apply` above is matched against the request path as Vite sees
 * it (i.e. literal, unprefixed). The panel config's `applyEndpoint` MUST
 * therefore remain a literal `/api/dev/apply` (not base-prefixed). The
 * proxy is a dev-time concern and unrelated to the static deploy prefix.
 */
export default defineConfig({
  output: 'static',
  base: '/pj/zudo-design-token-panel/astro/',
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
