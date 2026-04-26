#!/usr/bin/env node
/**
 * Postbuild step.
 *
 * Vite lib mode does not compile .astro files. The package's exports map
 * points `./astro` at `dist/astro/index.js`, whose re-export
 * (`export { default as DesignTokenPanelHost } from './DesignTokenPanelHost.astro'`)
 * is left as a literal because `vite.config.ts` marks `*.astro` external.
 *
 * This script copies the raw `.astro` source alongside the emitted JS so
 * the consumer's Astro toolchain can resolve the relative import at build
 * time.
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
