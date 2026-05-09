import { defineConfig } from "@takazudo/zfb/config";

/**
 * zfb + Tailwind v4 example for @takazudo/zudo-design-token-panel.
 *
 * Mirrors examples/zfb/ but with Tailwind v4 enabled via
 * `tailwind: { enabled: true }`. This flag instructs zfb to integrate
 * @tailwindcss/vite into the build pipeline so that `@import "tailwindcss"`
 * and `@theme { ... }` blocks in CSS files are processed correctly.
 *
 * Content collections
 * -------------------
 * The `collections` entry declares a "prose" collection (mapped to
 * `content/prose/`). zfb's collection mechanism enables the `getCollection`
 * helper in page components, mirroring how Sub 5 (#45) wires MDX in the
 * plain zfb example.
 *
 * Apply-pipeline (dev only)
 * -------------------------
 * Same pattern as examples/zfb/ — the `dev-apply-proxy` plugin intercepts
 * POST requests at the full base-prefixed path:
 *
 *   /pj/zudo-design-token-panel/examples/zfb-tailwind/api/dev/apply
 *
 * Per zfb issue #229 (fixed in commit `b1049ef`), `devMiddleware`-registered
 * paths are scoped under the project `base`. The bare path `/api/dev/apply`
 * resolves to 405; the FULL base-prefixed path is what reaches the handler.
 * See README.md for the full rationale.
 *
 * Port 24686 (tokens-bin) and 44328 (zfb dev) are offset by +1 from the
 * plain zfb demo to avoid collision when both run simultaneously.
 *
 * Deploy `base`
 * -------------
 * `base: '/pj/zudo-design-token-panel/examples/zfb-tailwind/'` mirrors the
 * production deploy path under the monorepo's docs site (see issue #18). zfb
 * applies this prefix to every emitted asset URL and to the dev server's
 * served paths, so the example deploys cleanly under the shared Cloudflare
 * Pages project.
 */
export default defineConfig({
  framework: "preact",
  base: "/pj/zudo-design-token-panel/examples/zfb-tailwind/",
  tailwind: { enabled: true },
  collections: [{ name: "prose", path: "content/prose" }],
  plugins: [
    {
      name: "./plugins/dev-apply-proxy.mjs",
    },
  ],
});
