/**
 * Home page of the zfb-tailwind example. Renders cards / buttons / palette
 * swatches driven entirely by `--zfbtailwindexample-*` tokens via Tailwind v4
 * utility classes, so opening the panel and tweaking any token rewrites the
 * page in real time.
 *
 * Tailwind utility strategy
 * -------------------------
 * All visual styling uses utility classes that resolve back to the
 * --zfbtailwindexample-* tokens via the @theme block in styles/global.css:
 *
 *   bg-surface  → background-color: var(--color-surface)
 *               → var(--zfbtailwindexample-color-surface)
 *
 *   p-spacing-md → padding: var(--spacing-spacing-md)
 *                → var(--zfbtailwindexample-spacing-md)
 *
 *   rounded-md  → border-radius: var(--radius-md)
 *               → var(--zfbtailwindexample-radius)
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
 * Apply-endpoint note
 * -------------------
 * `panelConfig.applyEndpoint` is set to the FULL base-prefixed URL (see
 * `config/panel-config.ts`). This differs from the other three examples.
 * See README.md for the rationale.
 */

import { Island, type IslandProps } from '@takazudo/zfb';
import PanelMount from '../components/panel-mount';
import { useState } from 'preact/hooks';
import '../styles/global.css';

const PALETTE_INDICES = Array.from({ length: 16 }, (_, i) => i);

/**
 * Interactive easing demo card.
 *
 * Clicking the card toggles it between resting and active position.
 * The transition uses `var(--zfbtailwindexample-easing-tab-open)` so changing
 * the Easing tab's "Tab Open" semantic role updates the perceived motion live.
 */
function EasingDemoCard() {
  const [active, setActive] = useState(false);
  return (
    <button
      type="button"
      class={active ? 'zfbtailwindexample-easing-card is-active' : 'zfbtailwindexample-easing-card'}
      onClick={() => setActive((v) => !v)}
      aria-pressed={active}
    >
      <span class="zfbtailwindexample-easing-card-label">
        {active ? 'Click to rest ←' : '→ Click to animate'}
      </span>
    </button>
  );
}

export default function HomePage() {
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>zfb + Tailwind v4 Example — Design Token Panel</title>
      </head>
      <body class="p-spacing-lg">
        <main class="flex flex-col gap-spacing-lg max-w-[56rem] mx-auto">
          <header>
            <h1 class="text-heading font-bold mb-spacing-md text-primary">
              Live token tweaking, in zfb + Tailwind v4
            </h1>
            <p>
              Every visible element on this page is driven by a{' '}
              <code>--zfbtailwindexample-*</code> CSS custom property, consumed via
              Tailwind v4 utility classes. Open the panel from the browser console
              and drag any slider — the change applies before the next paint.
            </p>
            <p class="text-small text-muted mt-spacing-md">
              Console API:{' '}
              <code>window.zfbTailwindExample.toggleDesignPanel()</code>. Storage
              prefix: <code>zfb-tailwind-example-tokens</code>.
            </p>
            <nav class="mt-spacing-md">
              <a
                href="/pj/zudo-design-token-panel/examples/zfb-tailwind/prose/"
                class="text-accent underline"
              >
                View prose page
              </a>
            </nav>
          </header>

          <section>
            <h2 class="text-heading font-bold mb-spacing-md text-primary">
              Cards (spacing + radius + surface)
            </h2>
            <div class="flex flex-col gap-spacing-md">
              <div class="bg-surface text-fg p-spacing-md rounded-md border border-muted">
                <strong>Card A.</strong> Padding driven by{' '}
                <code>p-spacing-md</code> (→ <code>--zfbtailwindexample-spacing-md</code>),
                corners by <code>rounded-md</code> (→ <code>--zfbtailwindexample-radius</code>),
                background by <code>bg-surface</code>.
              </div>
              <div class="bg-surface text-fg p-spacing-md rounded-md border border-muted">
                <strong>Card B.</strong> Stack gap driven by{' '}
                <code>gap-spacing-lg</code>; outline by{' '}
                <code>border-muted</code>.
              </div>
            </div>
          </section>

          <section>
            <h2 class="text-heading font-bold mb-spacing-md text-primary">
              Buttons (accent / primary)
            </h2>
            <p>
              <button
                class="inline-block p-spacing-md rounded-md bg-accent text-bg border-none cursor-pointer hover:bg-primary"
                type="button"
              >
                Action button
              </button>
            </p>
          </section>

          <section>
            <h2 class="text-heading font-bold mb-spacing-md text-primary">
              Easing demo
            </h2>
            <p>
              Click the card below to animate it. The motion uses{' '}
              <code>transition-timing-function: var(--zfbtailwindexample-easing-tab-open)</code>.
              Open the panel, switch to the <strong>Easing</strong> tab, and change the
              semantic "Tab Open" role — the perceived animation speed changes live.
            </p>
            <EasingDemoCard />
          </section>

          <section>
            <h2 class="text-heading font-bold mb-spacing-md text-primary">
              Palette swatches
            </h2>
            <div class="flex flex-wrap gap-spacing-md">
              {PALETTE_INDICES.map((i) => (
                <div
                  key={i}
                  class="w-16 h-16 rounded-md flex items-end justify-center text-micro text-fg"
                  style={`background: var(--zfbtailwindexample-palette-${i}); text-shadow: 0 1px 2px rgba(0,0,0,0.7); padding: 0.25rem;`}
                >
                  {i}
                </div>
              ))}
            </div>
            <p class="text-small text-muted mt-spacing-md">
              Each swatch reads{' '}
              <code>--zfbtailwindexample-palette-{'{n}'}</code>. The cluster's{' '}
              <code>paletteCssVarTemplate</code> is the only thing that decides
              this name — change it in <code>config/default-cluster.ts</code>{' '}
              and the apply pipeline writes a different variable on the next
              palette tweak.
            </p>
          </section>

          <section>
            <h2 class="text-heading font-bold mb-spacing-md text-primary">
              Typography scale
            </h2>
            <div class="flex flex-col gap-vsp-sm bg-surface p-spacing-md rounded-md border border-muted">
              <p class="text-h2 leading-tight font-bold text-fg">Heading H2 — text-h2</p>
              <p class="text-h3 leading-tight font-semibold text-fg">Heading H3 — text-h3</p>
              <p class="text-h4 leading-snug font-semibold text-fg">Heading H4 — text-h4</p>
              <p class="text-body leading-relaxed text-fg">Body text — text-body leading-relaxed</p>
              <p class="text-small text-muted">Small text — text-small text-muted</p>
              <p class="text-micro text-muted">Micro text — text-micro text-muted</p>
            </div>
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
