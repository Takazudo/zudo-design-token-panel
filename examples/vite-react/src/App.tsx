/**
 * Root component for the Vite + React example.
 *
 * Mounts the design-token panel adapter from a `useEffect` (the React-shaped
 * equivalent of the `<script>` block the Astro example ships in
 * `DesignTokenPanelHost.astro`). The effect runs once after the first paint,
 * is StrictMode-safe via the per-`storagePrefix` bind flag pinned on
 * `window.__zudoDesignTokenPanelAdapter`, and has no cleanup function — the
 * panel adapter installs window-level state that lives for the page
 * lifetime, so a per-mount cleanup would be wrong.
 *
 * The page renders three flavors of demo content:
 *
 *   - Cards, buttons, palette swatches — the same shape the Astro home
 *     page ships, mirrored under the `--vitereact-*` namespace.
 *   - A "verify across rerender" section with a counter button. Clicking
 *     it triggers a React `setState` re-render. Because every visible
 *     element reads `--vitereact-*` from `:root` (NOT from React props),
 *     panel-driven token tweaks survive the rerender unchanged. This is
 *     the Vite + React analog of the Astro example's `/about` page that
 *     proves view-transitions don't disturb panel state.
 *   - Panel state survives unmount/remount of arbitrary subtrees too —
 *     the rerender section also toggles a child component to confirm.
 */

import { useCallback, useEffect, useState } from 'react';
import { mountPanel } from './lib/mount-panel';

const PALETTE_INDICES = Array.from({ length: 16 }, (_, i) => i);

export function App() {
  useEffect(() => {
    mountPanel();
    // No cleanup: the panel adapter installs window-level console handlers
    // and (lazily) a singleton panel module. Both are intended to live for
    // the page lifetime, so a tear-down on unmount would defeat the whole
    // contract. StrictMode double-invocation is handled inside mountPanel
    // via the per-storagePrefix bind flag.
  }, []);

  return (
    <main className="vitereact-stack">
      <header>
        <h1 className="vitereact-heading">Live token tweaking, in plain Vite + React</h1>
        <p>
          Every visible element on this page is driven by a{' '}
          <code>--vitereact-*</code> CSS custom property. Open the panel from
          the browser console and drag any slider — the change applies before
          the next paint, and survives React rerenders because the CSS vars
          live on <code>:root</code>, not in React state.
        </p>
        <p className="vitereact-meta">
          Console API: <code>window.viteReactExample.toggleDesignPanel()</code>.
          Storage prefix: <code>vite-react-example-tokens</code>.
        </p>
      </header>

      <section>
        <h2 className="vitereact-heading">Cards (spacing + radius + surface)</h2>
        <div className="vitereact-card">
          <strong>Card A.</strong> Padding driven by{' '}
          <code>--vitereact-spacing-md</code>, corners by{' '}
          <code>--vitereact-radius</code>, background by{' '}
          <code>--vitereact-color-surface</code>.
        </div>
        <div className="vitereact-card">
          <strong>Card B.</strong> Stack gap driven by{' '}
          <code>--vitereact-spacing-lg</code>; outline by{' '}
          <code>--vitereact-color-muted</code>.
        </div>
      </section>

      <section>
        <h2 className="vitereact-heading">Buttons + links (accent / primary)</h2>
        <p>
          <button className="vitereact-button" type="button">
            Action button
          </button>
        </p>
        <p>
          The styled{' '}
          <a className="vitereact-link" href="#rerender-verify">
            rerender-verify section
          </a>{' '}
          below proves the panel's tokens persist across React state changes.
        </p>
      </section>

      <section>
        <h2 className="vitereact-heading">Palette swatches</h2>
        <div className="vitereact-swatch-row">
          {PALETTE_INDICES.map((i) => (
            <div
              key={i}
              className="vitereact-swatch"
              style={{ background: `var(--vitereact-palette-${i})` }}
            >
              {i}
            </div>
          ))}
        </div>
        <p className="vitereact-meta">
          Each swatch reads <code>--vitereact-palette-{'{n}'}</code>. The
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
 * Verify across rerender. This component is the Vite + React analog of the
 * Astro example's `/about` page (which exists to confirm view-transitions
 * don't disturb panel state). Vite + React has no view-transitions; instead
 * we verify that:
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
      <h2 className="vitereact-heading">Verify across rerender</h2>
      <div className="vitereact-card">
        Click the button to trigger a React rerender. Tweak any panel slider,
        then click again — the tweaked value should still apply, because the
        page reads CSS custom properties from <code>:root</code> rather than
        from React props. Toggle the child subtree to confirm React mount
        churn doesn't disturb the panel either.
      </div>
      <p>
        <button type="button" className="vitereact-button" onClick={bump}>
          Rerender ({' '}
          <span className="vitereact-rerender-counter">{count}</span> )
        </button>{' '}
        <button type="button" className="vitereact-button" onClick={toggleChild}>
          Toggle child subtree
        </button>
      </p>
      {showChild && (
        <div className="vitereact-card">
          <strong>Child subtree present.</strong> This block mounts and
          unmounts on every toggle. The panel's own DOM root is appended by
          the adapter outside the React tree, so React reconciliation can
          never touch it.
        </div>
      )}
    </section>
  );
}
