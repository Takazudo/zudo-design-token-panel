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
    <AppShell
      title="zfb + Tailwind v4 Example — Design Token Panel"
      activePath={BASE_PATH}
    >
      {/* reason: page-content max-width is a layout constant for this demo; no structural token covers prose-container widths */}
      <div class="flex flex-col gap-spacing-lg max-w-[56rem] mx-auto">
        <header>
          <h1 class="text-heading font-bold mb-spacing-md text-primary">
            Live token tweaking, in zfb + Tailwind v4
          </h1>
          <p>
            Every visible element on this page is driven by a{' '}
            <code>--zfbtailwindexample-*</code> CSS custom property, consumed via
            Tailwind v4 utility classes. Open the panel from the button above
            and drag any slider — the change applies before the next paint.
          </p>
          <p class="text-small text-muted mt-spacing-md">
            Console API:{' '}
            <code>window.zfbTailwindExample.toggleDesignPanel()</code>. Storage
            prefix: <code>zfb-tailwind-example-tokens</code>.
          </p>
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
                class="w-16 h-16 rounded-md flex items-end justify-center text-micro text-fg p-spacing-xs"
                // reason: dynamic var name from loop index — no static utility possible;
                // text-shadow is swatch-label legibility over any palette color — no token covers overlay shadows
                style={`background: var(--zfbtailwindexample-palette-${i}); text-shadow: 0 1px 2px rgba(0,0,0,0.7);`}
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
      </div>
    </AppShell>
  );
}
