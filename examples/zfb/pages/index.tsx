/**
 * Home page of the zfb example. Renders cards / buttons / palette swatches
 * driven entirely by `--zfbexample-*` tokens, so opening the panel and
 * tweaking any token rewrites the page in real time.
 *
 * Panel mount
 * -----------
 * `<PanelMount>` is a `"use client"` component that bootstraps the panel
 * adapter from a `useEffect`. It returns `null` — the adapter appends its own
 * DOM root outside the Preact tree.
 *
 * `ssrFallback={null}` switches the Island to skip-SSR mode (the zfb
 * equivalent of Astro's `client:only`). This is required because `PanelMount`
 * uses `preact/hooks`, and during SSR the hooks fail with a Preact
 * `__H`-undefined error caused by a dual-preact-instance boundary between the
 * project's `preact` and zfb's SSR renderer's preact. Passing any
 * `ssrFallback` (even `null`) prevents the child from being evaluated at SSR
 * time; the hydration runtime mounts it client-side when `when="visible"` fires.
 *
 * Because `<PanelMount>` sits at the end of `<body>`, the IntersectionObserver
 * fires shortly after first paint — effectively an idle-ish strategy that does
 * not block the critical-path chunk.
 *
 * Apply-endpoint note
 * -------------------
 * `panelConfig.applyEndpoint` is set to the FULL base-prefixed URL (see
 * `config/panel-config.ts`). This differs from the other three examples.
 * See README.md and `PROBE-REPORT.md` for the rationale.
 */

import { Island, type IslandProps } from '@takazudo/zfb';
import PanelMount from '../components/panel-mount';
import '../styles/global.css';

const PALETTE_INDICES = Array.from({ length: 16 }, (_, i) => i);

export default function HomePage() {
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>zfb Example — Design Token Panel</title>
      </head>
      <body>
        <main class="zfbexample-stack">
          <header>
            <h1 class="zfbexample-heading">Live token tweaking, in zfb (zudo-front-builder)</h1>
            <p>
              Every visible element on this page is driven by a{' '}
              <code>--zfbexample-*</code> CSS custom property. Open the panel
              from the browser console and drag any slider — the change applies
              before the next paint.
            </p>
            <p class="zfbexample-meta">
              Console API: <code>window.zfbExample.toggleDesignPanel()</code>. Storage prefix:{' '}
              <code>zfb-example-tokens</code>.
            </p>
            <p>
              <a href="/pj/zudo-design-token-panel/examples/zfb/prose" class="zfbexample-link">
                View Prose Demo →
              </a>
            </p>
          </header>

          <section>
            <h2 class="zfbexample-heading">Cards (spacing + radius + surface)</h2>
            <div class="zfbexample-card">
              <strong>Card A.</strong> Padding driven by{' '}
              <code>--zfbexample-spacing-md</code>, corners by{' '}
              <code>--zfbexample-radius</code>, background by{' '}
              <code>--zfbexample-color-surface</code>.
            </div>
            <div class="zfbexample-card">
              <strong>Card B.</strong> Stack gap driven by{' '}
              <code>--zfbexample-spacing-lg</code>; outline by{' '}
              <code>--zfbexample-color-muted</code>.
            </div>
          </section>

          <section>
            <h2 class="zfbexample-heading">Buttons (accent / primary)</h2>
            <p>
              <button class="zfbexample-button" type="button">
                Action button
              </button>
            </p>
          </section>

          <section>
            <h2 class="zfbexample-heading">Palette swatches</h2>
            <div class="zfbexample-swatch-row">
              {PALETTE_INDICES.map((i) => (
                <div
                  key={i}
                  class="zfbexample-swatch"
                  style={`background: var(--zfbexample-palette-${i});`}
                >
                  {i}
                </div>
              ))}
            </div>
            <p class="zfbexample-meta">
              Each swatch reads <code>--zfbexample-palette-{'{n}'}</code>. The cluster's{' '}
              <code>paletteCssVarTemplate</code> is the only thing that decides this name — change
              it in <code>config/default-cluster.ts</code> and the apply pipeline writes a different
              variable on the next palette tweak.
            </p>
          </section>
        </main>

        {/*
          PanelMount is the `"use client"` island that bootstraps the panel adapter.
          Uses `ssrFallback={null}` (the zfb equivalent of Astro's `client:only`)
          so the island's internals are NOT evaluated at SSR time. PanelMount
          returns null and only runs a useEffect — it has no meaningful SSR output —
          and the hooks it uses (preact/hooks) would fail during SSR due to the
          dual-preact-instance boundary between the project's preact and the
          zfb SSR renderer's preact. Skipping SSR is the correct solution.
          `when="visible"` defers hydration until the element enters the viewport;
          since the island is at the bottom of <body>, this fires shortly after
          first paint.
        */}
        <Island when="visible" ssrFallback={null}>
          {/*
            Cast bridges a structural-vs-nominal type mismatch between Preact's
            VNode (type: string | ComponentType<any>) and zfb's framework-agnostic
            structural VNode (type: string | ((...args: unknown[]) => unknown)).
            They are runtime-compatible — the Island only walks props.children at
            hydration time and never invokes `type` itself in this position.
          */}
          {(<PanelMount />) as unknown as IslandProps['children']}
        </Island>
      </body>
    </html>
  );
}
