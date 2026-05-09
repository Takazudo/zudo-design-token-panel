import { defineConfig } from "@takazudo/zfb/config";

/**
 * zfb example for @takazudo/zudo-design-token-panel.
 *
 * Deliberately minimal: NO Tailwind, NO collections. The example proves the
 * panel package works inside any zfb consumer that supplies just a
 * `PanelConfig` and mounts the panel adapter as a `"use client"` island.
 *
 * Apply-pipeline (dev only)
 * -------------------------
 * Unlike the astro/vite-react/next examples — which proxy `/api/dev/apply`
 * through Vite's built-in proxy mechanism — zfb exposes the `devMiddleware`
 * plugin hook. The `dev-apply-proxy` plugin registered here intercepts POST
 * requests at the FULL base-prefixed path:
 *
 *   /pj/zudo-design-token-panel/examples/zfb/api/dev/apply
 *
 * Per zfb issue #229 (fixed in commit `b1049ef`), `devMiddleware`-registered
 * paths are scoped under the project `base`. The bare path `/api/dev/apply`
 * resolves to 405; the FULL base-prefixed path is what reaches the handler.
 * This is the key difference vs. the other three examples — see README.md
 * and `examples/zfb/PROBE-REPORT.md` for the full rationale.
 *
 * The `panelConfig.applyEndpoint` is therefore set to the full prefixed URL
 * (see `config/panel-config.ts`), not the bare relative path the other
 * examples use.
 *
 * Deploy `base`
 * -------------
 * `base: '/pj/zudo-design-token-panel/examples/zfb/'` mirrors the production
 * deploy path under the monorepo's docs site (see issue #18). zfb applies
 * this prefix to every emitted asset URL and to the dev server's served paths,
 * so the example deploys cleanly under the shared Cloudflare Pages project.
 */
export default defineConfig({
  framework: "preact",
  base: "/pj/zudo-design-token-panel/examples/zfb/",
  plugins: [
    {
      name: "./plugins/dev-apply-proxy.mjs",
    },
  ],
});
