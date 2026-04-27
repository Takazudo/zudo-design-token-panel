'use client';

/*
 * Home page for the Next.js example.
 *
 * Ports the structure of `examples/vite-react/src/App.tsx` (cards, buttons,
 * palette swatches, "verify across rerender" section) into the App Router
 * idiom. Marked `'use client'` so the rerender-verify counter's `useState`
 * actually rerenders on click — the panel's persistence across React state
 * changes is the demonstration this section exists for.
 *
 * The mount-panel call has been relocated to `app/_components/PanelBootstrap.tsx`
 * (rendered in `app/layout.tsx`) so the panel adapter binds for every route
 * in the app — including `/about`, the soft-navigation sibling that proves
 * the panel state survives Next's client-routed navigations. See the block
 * comment in `PanelBootstrap.tsx` for why the boundary lives in the layout.
 *
 * Soft-navigation note: the Vite + React analog of "view-transitions don't
 * disturb panel state" is Next's client-side navigation between pages via
 * `next/link`. The link to `/about` below — combined with `/about`'s link
 * back to `/` — is what proves the equivalence in the demo runtime.
 */

import Link from 'next/link';
import { useCallback, useState } from 'react';

const PALETTE_INDICES = Array.from({ length: 16 }, (_, i) => i);

export default function HomePage() {
  return (
    <main className="nextexample-stack">
      <header>
        <h1 className="nextexample-heading">Live token tweaking, in plain Next.js + React</h1>
        <p>
          Every visible element on this page is driven by a{' '}
          <code>--nextexample-*</code> CSS custom property. Open the panel from
          the browser console and drag any slider — the change applies before
          the next paint, and survives React rerenders because the CSS vars
          live on <code>:root</code>, not in React state.
        </p>
        <p className="nextexample-meta">
          Console API: <code>window.nextExample.toggleDesignPanel()</code>.
          Storage prefix: <code>next-example-tokens</code>.
        </p>
        <p>
          Soft-navigation analog of view-transitions:{' '}
          <Link className="nextexample-link" href="/about">
            visit the /about page
          </Link>{' '}
          to verify panel state survives Next's client-routed navigation.
        </p>
      </header>

      <section>
        <h2 className="nextexample-heading">Cards (spacing + radius + surface)</h2>
        <div className="nextexample-card">
          <strong>Card A.</strong> Padding driven by{' '}
          <code>--nextexample-spacing-md</code>, corners by{' '}
          <code>--nextexample-radius</code>, background by{' '}
          <code>--nextexample-color-surface</code>.
        </div>
        <div className="nextexample-card">
          <strong>Card B.</strong> Stack gap driven by{' '}
          <code>--nextexample-spacing-lg</code>; outline by{' '}
          <code>--nextexample-color-muted</code>.
        </div>
      </section>

      <section>
        <h2 className="nextexample-heading">Buttons + links (accent / primary)</h2>
        <p>
          <button className="nextexample-button" type="button">
            Action button
          </button>
        </p>
        <p>
          The styled{' '}
          <a className="nextexample-link" href="#rerender-verify">
            rerender-verify section
          </a>{' '}
          below proves the panel's tokens persist across React state changes.
        </p>
      </section>

      <section>
        <h2 className="nextexample-heading">Palette swatches</h2>
        <div className="nextexample-swatch-row">
          {PALETTE_INDICES.map((i) => (
            <div
              key={i}
              className="nextexample-swatch"
              style={{ background: `var(--nextexample-palette-${i})` }}
            >
              {i}
            </div>
          ))}
        </div>
        <p className="nextexample-meta">
          Each swatch reads <code>--nextexample-palette-{'{n}'}</code>. The
          cluster's <code>paletteCssVarTemplate</code> is the only thing that
          decides this name — change it in <code>default-cluster.ts</code> and
          the apply pipeline writes a different variable on the next palette
          tweak.
        </p>
      </section>

      <RerenderVerify />
    </main>
  );
}

/**
 * Verify across rerender. This component mirrors the Vite + React example's
 * `RerenderVerify` component. Its purpose is to confirm:
 *
 *   1. A `setState`-driven rerender keeps the panel's `:root` overrides in
 *      place (the React tree doesn't own those vars, so it can't lose
 *      them).
 *   2. A child subtree that mounts/unmounts arbitrarily on the same render
 *      cycle does not disturb the panel either — the panel's mount root is
 *      a sibling appended by the panel adapter, not a child of the React
 *      tree, so React reconciliation cannot touch it.
 */
function RerenderVerify() {
  const [count, setCount] = useState(0);
  const [showChild, setShowChild] = useState(true);

  const bump = useCallback(() => {
    setCount((c) => c + 1);
  }, []);

  const toggleChild = useCallback(() => {
    setShowChild((v) => !v);
  }, []);

  return (
    <section id="rerender-verify">
      <h2 className="nextexample-heading">Verify across rerender</h2>
      <div className="nextexample-card">
        Click the button to trigger a React rerender. Tweak any panel slider,
        then click again — the tweaked value should still apply, because the
        page reads CSS custom properties from <code>:root</code> rather than
        from React props. Toggle the child subtree to confirm React mount
        churn doesn't disturb the panel either.
      </div>
      <p>
        <button type="button" className="nextexample-button" onClick={bump}>
          Rerender ({' '}
          <span className="nextexample-rerender-counter">{count}</span> )
        </button>{' '}
        <button type="button" className="nextexample-button" onClick={toggleChild}>
          Toggle child subtree
        </button>
      </p>
      {showChild && (
        <div className="nextexample-card">
          <strong>Child subtree present.</strong> This block mounts and
          unmounts on every toggle. The panel's own DOM root is appended by
          the adapter outside the React tree, so React reconciliation can
          never touch it.
        </div>
      )}
    </section>
  );
}
