/**
 * Home page of the zfb example. Renders cards / buttons / palette swatches
 * driven entirely by `--zfb-*` tokens, so opening the panel and
 * tweaking any token rewrites the page in real time.
 *
 * Layout shell
 * ------------
 * The page is wrapped in `<AppShell>`, which renders the HTML document shell,
 * topbar (panel-open button), sidenav, and main content area.
 *
 * Apply-endpoint note
 * -------------------
 * `panelConfig.applyEndpoint` is set to the FULL base-prefixed URL (see
 * `config/panel-config.ts`). This differs from the other three examples.
 * See README.md and `PROBE-REPORT.md` for the rationale.
 */

import { AppShell } from '../components/app-shell';
import { useState } from 'preact/hooks';

const BASE_PATH = '/pj/zudo-design-token-panel/examples/zfb/';

const PALETTE_INDICES = Array.from({ length: 16 }, (_, i) => i);

/**
 * Interactive easing demo card.
 *
 * Clicking the card toggles it between resting and active position.
 * The transition uses `var(--zfb-easing-tab-open)` so changing the
 * Easing tab's "Tab Open" semantic role updates the perceived motion live.
 */
function EasingDemoCard() {
  const [active, setActive] = useState(false);
  return (
    <button
      type="button"
      class={active ? 'zfb-easing-card is-active' : 'zfb-easing-card'}
      onClick={() => setActive((v) => !v)}
      aria-pressed={active}
    >
      <span class="zfb-easing-card-label">
        {active ? 'Click to rest ←' : '→ Click to animate'}
      </span>
    </button>
  );
}

export default function HomePage() {
  return (
    <AppShell
      title="zfb Example — Design Token Panel"
      activePath={BASE_PATH}
    >
      <div class="zfb-stack">
        <header>
          <h1 class="zfb-heading">Live token tweaking, in zfb (zudo-front-builder)</h1>
          <p>
            Every visible element on this page is driven by a{' '}
            <code>--zfb-*</code> CSS custom property. Open the panel
            from the button above and drag any slider — the change applies
            before the next paint.
          </p>
          <p class="zfb-meta">
            Console API: <code>window.zfb.toggleDesignPanel()</code>. Storage prefix:{' '}
            <code>zfb-example-tokens</code>.
          </p>
        </header>

        <section>
          <h2 class="zfb-heading">Cards (spacing + radius + surface)</h2>
          <div class="zfb-card">
            <strong>Card A.</strong> Padding driven by{' '}
            <code>--zfb-spacing-md</code>, corners by{' '}
            <code>--zfb-radius</code>, background by{' '}
            <code>--zfb-color-surface</code>.
          </div>
          <div class="zfb-card">
            <strong>Card B.</strong> Stack gap driven by{' '}
            <code>--zfb-spacing-lg</code>; outline by{' '}
            <code>--zfb-color-muted</code>.
          </div>
        </section>

        <section>
          <h2 class="zfb-heading">Buttons (accent / primary)</h2>
          <p>
            <button class="zfb-button" type="button">
              Action button
            </button>
          </p>
        </section>

        <section>
          <h2 class="zfb-heading">Easing demo</h2>
          <p>
            Click the card below to animate it. The motion uses{' '}
            <code>transition-timing-function: var(--zfb-easing-tab-open)</code>.
            Open the panel, switch to the <strong>Easing</strong> tab, and change the
            semantic "Tab Open" role — the perceived animation speed changes live.
          </p>
          <EasingDemoCard />
        </section>

        <section>
          <h2 class="zfb-heading">Palette swatches</h2>
          <div class="zfb-swatch-row">
            {PALETTE_INDICES.map((i) => (
              <div
                key={i}
                class="zfb-swatch"
                // reason: dynamic var name from loop index — no static utility possible;
                // text-shadow is swatch-label legibility over any palette color — no token covers overlay shadows
                style={`background: var(--zfb-palette-${i}); text-shadow: 0 1px 2px rgba(0,0,0,0.7);`}
              >
                {i}
              </div>
            ))}
          </div>
          <p class="zfb-meta">
            Each swatch reads <code>--zfb-palette-{'{n}'}</code>. The cluster's{' '}
            <code>paletteCssVarTemplate</code> is the only thing that decides this name — change
            it in <code>config/default-cluster.ts</code> and the apply pipeline writes a different
            variable on the next palette tweak.
          </p>
        </section>
      </div>
    </AppShell>
  );
}
