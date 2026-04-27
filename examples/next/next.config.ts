import type { NextConfig } from 'next';

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
 */
const nextConfig: NextConfig = {
  reactStrictMode: true,
};

export default nextConfig;
