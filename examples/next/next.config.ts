import type { NextConfig } from 'next';
import { fileURLToPath } from 'node:url';
import { dirname } from 'node:path';

/*
 * Next.js config for the Next + React 19 example app.
 *
 * Deliberately minimal: NO bundler aliases, NO MDX, NO Tailwind, NO design
 * system. The example proves @takazudo/zudo-design-token-panel works inside a
 * vanilla Next 15 App Router consumer that ships:
 *
 *   - real React 19 (no `react -> preact/compat` alias),
 *   - `preact` as a peer for the panel's own render tree, and
 *   - a single PanelConfig assembled at the host (src/config/panel-config.ts).
 *
 * IMPORTANT: do NOT alias `react` -> `preact/compat`. The example must use
 * real React 19 — that is the entire point of the example. The panel mounts
 * as a Preact island under a `'use client'` boundary (app/_components/
 * PanelBootstrap.tsx); its own Preact runtime renders inside the panel root
 * element, fully isolated from the host React tree. Aliasing React would
 * collapse the two trees into one runtime and defeat the host-agnosticism
 * contract this example exists to prove.
 *
 * `outputFileTracingRoot` is pinned to this example's directory so Next's
 * file-tracing scoper doesn't auto-walk up to the monorepo root and pick a
 * different (older) lockfile. The worktree layout this repo uses leaves a
 * pnpm-lock.yaml in the parent directory — pinning silences the
 * "multiple lockfiles" warning during `next build` without changing what
 * gets traced into the deployable bundle.
 *
 * Deploy paths
 * ------------
 * The example is hosted at `https://takazudomodular.com/pj/zudo-design-token-panel/next/`, so
 * `basePath` and `assetPrefix` are both pinned to `/pj/zudo-design-token-panel/next`. Next
 * normalizes the leading-slash form internally; do NOT add a trailing slash
 * to `basePath` — Next rejects that. `trailingSlash: true` is on so the
 * static export emits `<route>/index.html` files, which work cleanly under
 * any plain static host (no per-route rewrite rules required).
 *
 * Static export + dev-only API route
 * ----------------------------------
 * `output: 'export'` is gated on `NEXT_BUILD_TARGET=export` so `pnpm dev`
 * keeps the dev server (and its API routes) working while `pnpm build` (which
 * sets the env var via package.json) emits a static `out/` directory.
 *
 * The catch: `output: 'export'` cannot include dynamic API routes like
 * `app/api/dev/apply/route.ts` — the Next exporter rejects them at build
 * time. The dev-only POST proxy to the bin sidecar is therefore stored as
 * `route.dev.ts` and `pageExtensions` is widened in dev mode to pick up
 * the `dev.ts` suffix; in export mode `pageExtensions` is the default
 * (`ts` / `tsx` only), so the file is invisible to the exporter and never
 * reaches `out/`. The route is recovered automatically the next time
 * `next dev` runs. README.md documents the choice.
 */
const isExportBuild = process.env.NEXT_BUILD_TARGET === 'export';

const nextConfig: NextConfig = {
  reactStrictMode: true,
  outputFileTracingRoot: dirname(fileURLToPath(import.meta.url)),
  basePath: '/pj/zudo-design-token-panel/next',
  assetPrefix: '/pj/zudo-design-token-panel/next',
  trailingSlash: true,
  // In dev mode, widen pageExtensions so `route.dev.ts` (the dev-only POST
  // proxy) is picked up alongside the regular `route.ts` filenames. In
  // export mode, fall back to the Next defaults so the dev-only file is
  // invisible to the static exporter and `out/` never carries it.
  pageExtensions: isExportBuild ? ['ts', 'tsx'] : ['ts', 'tsx', 'dev.ts', 'dev.tsx'],
  ...(isExportBuild ? { output: 'export' as const } : {}),
};

export default nextConfig;
