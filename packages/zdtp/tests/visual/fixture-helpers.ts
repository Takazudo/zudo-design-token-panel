/**
 * Shared helpers for VRT fixture HTML generation.
 *
 * `buildPage(content)` wraps the given body HTML in a full document that:
 *   - Inlines dist/zdtp.css (built panel CSS, all @import resolved by Vite)
 *   - Sets a page background that responds to prefers-color-scheme so the
 *     light project shows the panel on a light host background and the dark
 *     project shows it on a dark host background — the meaningful distinction
 *     for a host-isolation regression gate
 *   - Applies a flat CSS reset so the page body has no UA margin/padding
 *
 * Calling code must run `pnpm build` before running VRT tests; dist/zdtp.css
 * is the fully Vite-bundled stylesheet (all @import resolved).
 */

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { resolve, dirname } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));

// dist/zdtp.css is two directories up from tests/visual/
const CSS_PATH = resolve(__dirname, '../../dist/zdtp.css');

let _cssCache: string | null = null;

function getPanelCss(): string {
  if (_cssCache) return _cssCache;
  _cssCache = readFileSync(CSS_PATH, 'utf8');
  return _cssCache;
}

/**
 * Build a full HTML document for page.setContent().
 *
 * @param content - HTML to place in <body>
 * @param extraStyles - Additional CSS injected after the panel CSS reset
 */
export function buildPage(content: string, extraStyles = ''): string {
  const css = getPanelCss();
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <style>
    /* UA reset */
    *, *::before, *::after { margin: 0; padding: 0; box-sizing: border-box; }

    /* Page background responds to color scheme so the panel chrome is
       captured against both host types (the panel itself is always dark). */
    @media (prefers-color-scheme: light) {
      body { background: #f2f2f2; }
    }
    @media (prefers-color-scheme: dark) {
      body { background: #111111; }
    }

    /* Breathing room around the captured element */
    body { padding: 16px; }

    ${extraStyles}
  </style>
  <style>${css}</style>
</head>
<body>
  ${content}
</body>
</html>`;
}
