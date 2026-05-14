/**
 * Home page of the zfb-tailwind example. Renders cards / buttons / palette
 * swatches driven entirely by `--zfbtw-*` tokens via Tailwind v4
 * utility classes, so opening the panel and tweaking any token rewrites the
 * page in real time.
 *
 * Tailwind utility strategy
 * -------------------------
 * All visual styling uses utility classes that resolve back to the
 * --zfbtw-* tokens via the @theme block in styles/global.css:
 *
 *   bg-surface  → background-color: var(--color-surface)
 *               → var(--zfbtw-color-surface)
 *
 *   px-hsp-md py-vsp-md → padding: var(--spacing-hsp-md) / var(--spacing-vsp-md)
 *                       → var(--zfbtw-hsp-md) / var(--zfbtw-vsp-md)
 *
 *   rounded-md  → border-radius: var(--radius-md)
 *               → var(--zfbtw-radius)
 *
 * Layout shell
 * ------------
 * The page is wrapped in `<AppShell>`, which renders the HTML document shell,
 * topbar (panel-open button), sidenav, and main content area. Page content
 * only needs to render the actual page body.
 *
 * Apply-endpoint note
 * -------------------
 * `panelConfig.applyEndpoint` is set to the FULL base-prefixed URL (see
 * `config/panel-config.ts`). This differs from the other three examples.
 * See README.md for the rationale.
 */

import { AppShell } from '../components/app-shell';
import { useState } from 'preact/hooks';

const BASE_PATH = '/pj/zudo-design-token-panel/examples/zfb-tailwind/';

const PALETTE_INDICES = Array.from({ length: 16 }, (_, i) => i);

/**
 * Interactive easing demo card.
 *
 * Clicking the card toggles it between resting and active position.
 * The transition uses `var(--zfbtw-easing-tab-open)` so changing
 * the Easing tab's "Tab Open" semantic role updates the perceived motion live.
 */
function EasingDemoCard() {
  const [active, setActive] = useState(false);
  return (
    <button
      type="button"
      class={active ? 'zfbtw-easing-card is-active' : 'zfbtw-easing-card'}
      onClick={() => setActive((v) => !v)}
      aria-pressed={active}
    >
      <span class="zfbtw-easing-card-label">
        {active ? 'Click to rest ←' : '→ Click to animate'}
      </span>
    </button>
  );
}

export default function HomePage() {
  return (
    <AppShell
      title="zfb + Tailwind v4 Example — Design Token Panel"
      activePath={BASE_PATH}
    >
      {/* reason: page-content max-width is a layout constant for this demo; no structural token covers prose-container widths */}
      <div class="flex flex-col gap-vsp-lg max-w-[56rem] mx-auto">
        <header>
          <h1 class="text-heading font-bold mb-vsp-md text-primary">
            Live token tweaking, in zfb + Tailwind v4
          </h1>
          <p>
            Every visible element on this page is driven by a{' '}
            <code>--zfbtw-*</code> CSS custom property, consumed via
            Tailwind v4 utility classes. Open the panel from the button above
            and drag any slider — the change applies before the next paint.
          </p>
          <p class="text-small text-muted mt-vsp-md">
            Console API:{' '}
            <code>window.zfbTw.toggleDesignPanel()</code>. Storage
            prefix: <code>zfb-tailwind-example-tokens</code>.
          </p>
        </header>

        <section>
          <h2 class="text-heading font-bold mb-vsp-md text-primary">
            Cards (spacing + radius + surface)
          </h2>
          <div class="flex flex-col gap-vsp-md">
            <div class="bg-surface text-fg px-hsp-md py-vsp-md rounded-md border border-muted">
              <strong>Card A.</strong> Padding driven by{' '}
              <code>px-hsp-md py-vsp-md</code> (→ <code>--zfbtw-hsp-md</code> / <code>--zfbtw-vsp-md</code>),
              corners by <code>rounded-md</code> (→ <code>--zfbtw-radius</code>),
              background by <code>bg-surface</code>.
            </div>
            <div class="bg-surface text-fg px-hsp-md py-vsp-md rounded-md border border-muted">
              <strong>Card B.</strong> Stack gap driven by{' '}
              <code>gap-vsp-lg</code>; outline by{' '}
              <code>border-muted</code>.
            </div>
          </div>
        </section>

        <section>
          <h2 class="text-heading font-bold mb-vsp-md text-primary">
            Buttons (accent / primary)
          </h2>
          <p>
            <button
              class="inline-block px-hsp-md py-vsp-md rounded-md bg-accent text-bg border-none cursor-pointer hover:bg-primary"
              type="button"
            >
              Action button
            </button>
          </p>
        </section>

        <section>
          <h2 class="text-heading font-bold mb-vsp-md text-primary">
            Easing demo
          </h2>
          <p>
            Click the card below to animate it. The motion uses{' '}
            <code>transition-timing-function: var(--zfbtw-easing-tab-open)</code>.
            Open the panel, switch to the <strong>Easing</strong> tab, and change the
            semantic "Tab Open" role — the perceived animation speed changes live.
          </p>
          <EasingDemoCard />
        </section>

        <section>
          <h2 class="text-heading font-bold mb-vsp-md text-primary">
            Palette swatches
          </h2>
          <div class="flex flex-wrap gap-x-hsp-md gap-y-vsp-md">
            {PALETTE_INDICES.map((i) => (
              <div
                key={i}
                class="w-16 h-16 rounded-md flex items-end justify-center text-micro text-fg px-hsp-xs py-vsp-xs"
                // reason: dynamic var name from loop index — no static utility possible;
                // text-shadow is swatch-label legibility over any palette color — no token covers overlay shadows
                style={`background: var(--zfbtw-palette-${i}); text-shadow: 0 1px 2px rgba(0,0,0,0.7);`}
              >
                {i}
              </div>
            ))}
          </div>
          <p class="text-small text-muted mt-vsp-md">
            Each swatch reads{' '}
            <code>--zfbtw-palette-{'{n}'}</code>. The cluster's{' '}
            <code>paletteCssVarTemplate</code> is the only thing that decides
            this name — change it in <code>config/default-cluster.ts</code>{' '}
            and the apply pipeline writes a different variable on the next
            palette tweak.
          </p>
        </section>

        {/* Raw-scale reference block — intentional Tier-1-direct usage.
            Per the three-tier font-size strategy, real components should use
            semantic tokens (text-h2, text-body, etc.) backed by Tier 2 — see
            the Prose page for that. This block is a per-scale demo so each
            of the seven raw scale tokens is visibly bound to a row, letting
            the Font tab's scale sliders be debugged in isolation. */}
        <section>
          <h2 class="text-heading font-bold mb-vsp-md text-primary">
            Font scale tokens (raw tier)
          </h2>
          <p class="mb-vsp-md">
            Raw <code>--zfbtw-scale-*</code> values exposed as
            <code>text-scale-*</code> utilities for slider debugging only.
            Open the Font tab and drag any scale slider — each row below
            tracks one scale token directly. Production code should NOT use
            <code>text-scale-*</code>; use semantic tokens
            (<code>text-h2</code>, <code>text-body</code>, etc.) instead —
            see the <a href={`${BASE_PATH}prose/`}>Prose page</a>, where the
            same scale sliders flow through Tier 2 into rendered prose.
          </p>
          <div class="flex flex-col gap-vsp-sm bg-surface px-hsp-md py-vsp-md rounded-md border border-muted">
            <p class="text-scale-2xl leading-tight text-fg">
              2xl — <code class="text-scale-sm">text-scale-2xl → --zfbtw-scale-2xl</code>
            </p>
            <p class="text-scale-xl leading-tight text-fg">
              xl — <code class="text-scale-sm">text-scale-xl → --zfbtw-scale-xl</code>
            </p>
            <p class="text-scale-lg leading-snug text-fg">
              lg — <code class="text-scale-sm">text-scale-lg → --zfbtw-scale-lg</code>
            </p>
            <p class="text-scale-md leading-snug text-fg">
              md — <code class="text-scale-sm">text-scale-md → --zfbtw-scale-md</code>
            </p>
            <p class="text-scale-base leading-relaxed text-fg">
              base — <code class="text-scale-sm">text-scale-base → --zfbtw-scale-base</code>
            </p>
            <p class="text-scale-sm text-fg">
              sm — <code>text-scale-sm → --zfbtw-scale-sm</code>
            </p>
            <p class="text-scale-xs text-muted">
              xs — <code>text-scale-xs → --zfbtw-scale-xs</code>
            </p>
          </div>
        </section>
      </div>
    </AppShell>
  );
}
