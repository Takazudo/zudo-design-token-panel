/**
 * Assembles the `PanelConfig` consumed by the Next.js example.
 *
 * Like the Vite + React sibling — and unlike the Astro example which inlines
 * this object as JSON via a `<script type="application/json">` tag — the
 * Next example consumes the config directly as a TS module. The
 * `'use client'` boundary in `app/_components/PanelBootstrap.tsx` calls into
 * `mountPanel()` (which lazy-imports the panel package), and the package's
 * main entry resolves `getPanelConfig()` via `configurePanel(panelConfig)`
 * from inside that dynamic-import resolution — see
 * `src/lib/mount-panel.ts` for the contract.
 *
 * The five identifier fields (`storagePrefix`, `consoleNamespace`,
 * `modalClassPrefix`, `schemaId`, `exportFilenameBase`) all share a
 * `next-example*` namespace so localStorage entries, exported JSON, and
 * modal classnames cannot collide with any other host's panel deployment.
 *
 * `applyEndpoint` is the bare relative path `/api/dev/apply` — kept WITHOUT
 * a basePath prefix per the deploy-paths spec, so the panel config stays
 * portable across deploy paths and matches the vite-react sibling exactly.
 * The Next.js API route at `app/api/dev/apply/route.dev.ts` (the `.dev.ts`
 * suffix excludes the file from `output: 'export'`; see `next.config.ts`
 * and the README) forwards the POST to the bin sidecar on port 24684, so
 * the panel's POST stays on the same origin as the page it was served
 * from — no CORS preflight, no runtime URL coupling between the panel
 * config and the sidecar's port. The route is dev-only; the production
 * static export under `/pj/zdtp/next/` does not ship it.
 *
 * `applyRouting` shares the SAME JSON file the bin sidecar reads at startup
 * (`scaffold.routing.json`). The host UI and the apply server therefore agree
 * byte-for-byte on which CSS-var prefix maps to which file.
 */

import type { PanelConfig } from '@takazudo/zudo-design-token-panel';
import { defaultManifest } from './default-manifest';
import { defaultCluster } from './default-cluster';
import scaffoldRouting from '../../scaffold.routing.json';

export const panelConfig: PanelConfig = {
  storagePrefix: 'next-example-tokens',
  consoleNamespace: 'nextExample',
  modalClassPrefix: 'next-example-design-token-panel-modal',
  schemaId: 'next-example-design-tokens/v1',
  exportFilenameBase: 'next-example-design-tokens',
  tokens: defaultManifest,
  colorCluster: defaultCluster,
  applyEndpoint: '/api/dev/apply',
  applyRouting: scaffoldRouting,
  // Explicit opt-out for the secondary color cluster — the demo ships a
  // single primary palette only. `null` (NOT `undefined`) is the documented
  // signal that the host has no secondary cluster.
  secondaryColorCluster: null,
};
