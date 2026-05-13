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
import PanelOpenButton from './_components/PanelOpenButton';

const PALETTE_INDICES = Array.from({ length: 16 }, (_, i) => i);

export default function HomePage() {
  return (
    <main className="nx-stack">
      <header>
        <h1 className="nx-heading">Live token tweaking, in plain Next.js + React</h1>
        <p>
          <PanelOpenButton />
        </p>
        <p>
          Every visible element on this page is driven by a{' '}
          <code>--nx-*</code> CSS custom property. Open the panel from
          the browser console and drag any slider — the change applies before
          the next paint, and survives React rerenders because the CSS vars
          live on <code>:root</code>, not in React state.
        </p>
        <p className="nx-meta">
          Console API: <code>window.nx.toggleDesignPanel()</code>.
          Storage prefix: <code>next-example-tokens</code>.
        </p>
        <p>
          Soft-navigation analog of view-transitions:{' '}
          <Link className="nx-link" href="/about">
            visit the /about page
          </Link>{' '}
          to verify panel state survives Next's client-routed navigation.
        </p>
        <p>
          See the{' '}
          <Link className="nx-link" href="/prose">
            prose demo page
          </Link>{' '}
          for typography tokens in action.
        </p>
      </header>

      <section>
        <h2 className="nx-heading">Cards (spacing + radius + surface)</h2>
        <div className="nx-card">
          <strong>Card A.</strong> Padding driven by{' '}
          <code>--nx-spacing-md</code>, corners by{' '}
          <code>--nx-radius</code>, background by{' '}
          <code>--nx-color-surface</code>.
        </div>
        <div className="nx-card">
          <strong>Card B.</strong> Stack gap driven by{' '}
          <code>--nx-spacing-lg</code>; outline by{' '}
          <code>--nx-color-muted</code>.
        </div>
      </section>

      <section>
        <h2 className="nx-heading">Buttons + links (accent / primary)</h2>
        <p>
          <button className="nx-button" type="button">
            Action button
          </button>
        </p>
        <p>
          The styled{' '}
          <a className="nx-link" href="#rerender-verify">
            rerender-verify section
          </a>{' '}
          below proves the panel's tokens persist across React state changes.
        </p>
      </section>

      <section>
        <h2 className="nx-heading">Palette swatches</h2>
        <div className="nx-swatch-row">
          {PALETTE_INDICES.map((i) => (
            <div
              key={i}
              className="nx-swatch"
              style={{ background: `var(--nx-palette-${i})` }}
            >
              {i}
            </div>
          ))}
        </div>
        <p className="nx-meta">
          Each swatch reads <code>--nx-palette-{'{n}'}</code>. The
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
      <h2 className="nx-heading">Verify across rerender</h2>
      <div className="nx-card">
        Click the button to trigger a React rerender. Tweak any panel slider,
        then click again — the tweaked value should still apply, because the
        page reads CSS custom properties from <code>:root</code> rather than
        from React props. Toggle the child subtree to confirm React mount
        churn doesn't disturb the panel either.
      </div>
      <p>
        <button type="button" className="nx-button" onClick={bump}>
          Rerender ({' '}
          <span className="nx-rerender-counter">{count}</span> )
        </button>{' '}
        <button type="button" className="nx-button" onClick={toggleChild}>
          Toggle child subtree
        </button>
      </p>
      {showChild && (
        <div className="nx-card">
          <strong>Child subtree present.</strong> This block mounts and
          unmounts on every toggle. The panel's own DOM root is appended by
          the adapter outside the React tree, so React reconciliation can
          never touch it.
        </div>
      )}
    </section>
  );
}
