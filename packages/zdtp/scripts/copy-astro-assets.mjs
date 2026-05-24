#!/usr/bin/env node
/**
 * Postbuild step.
 *
 * Vite lib mode does not compile .astro files. The host component ships as
 * a raw `.astro` file exposed via the `./astro/DesignTokenPanelHost.astro`
 * subexport in the package's exports map. Consumers import it directly
 * (`import DesignTokenPanelHost from '@takazudo/zdtp/astro/DesignTokenPanelHost.astro'`)
 * so their own Astro toolchain compiles it. The sibling `dist/astro/index.js`
 * JS entry deliberately does NOT import this `.astro` (zdtp#308 — a static
 * `.astro` import crashed real npm consumers at prerender).
 *
 * This script copies the raw `.astro` source into dist so the subexport
 * resolves.
 *
 * The sibling `dist/astro/host-adapter.js` file emitted by the Vite library
 * build is part of the package's public surface — exposed via the
 * `./astro/host-adapter` entry in the exports map and consumed via a
 * `<script>import` line in the consumer's wrapper layout.
 *
 * Kept dependency-free on purpose — no `shx`, `cpy`, or
 * `vite-plugin-static-copy`. Build dependency surface stays small.
 */

import { copyFileSync, existsSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, '..');

const assets = [
  {
    src: join(root, 'src/astro/DesignTokenPanelHost.astro'),
    dest: join(root, 'dist/astro/DesignTokenPanelHost.astro'),
  },
];

for (const { src, dest } of assets) {
  if (!existsSync(src)) {
    console.error(`[zudo-design-token-panel] copy-astro-assets: missing source ${src}`);
    process.exit(1);
  }
  mkdirSync(dirname(dest), { recursive: true });
  copyFileSync(src, dest);
  console.log(`[zudo-design-token-panel] Copied ${src} -> ${dest}`);
}
