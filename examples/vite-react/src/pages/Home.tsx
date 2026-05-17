/**
 * Home page of the Vite + React example.
 *
 * Lifted from the original App.tsx body: cards, buttons, palette swatches,
 * and the "verify across rerender" section. Each element reads --vr-* CSS
 * custom properties so panel-driven tweaks are visible before the next paint
 * and survive React rerenders because the CSS vars live on :root, not in
 * React state.
 */

import { useCallback, useState } from 'react';

const PALETTE_INDICES = Array.from({ length: 16 }, (_, i) => i);

export function Home() {
  return (
    <div className="vr-stack">
      <div>
        <div role="heading" aria-level={1} className="vr-page-title">
          Live token tweaking, in plain Vite + React
        </div>
        <div className="vr-body">
          Every visible element on this page is driven by a{' '}
          <code>--vr-*</code> CSS custom property. Open the panel from
          the button in the topbar and drag any slider — the change applies
          before the next paint, and survives React rerenders because the CSS
          vars live on <code>:root</code>, not in React state.
        </div>
        <div className="vr-helper" style={{ marginTop: 'var(--vr-vsp-xs)' }}>
          Console API: <code>window.vr.toggleDesignPanel()</code>.
          Storage prefix: <code>vite-react-example-tokens</code>.
        </div>
      </div>

      <div>
        <div role="heading" aria-level={2} className="vr-section-title">
          Cards (spacing + radius + surface)
        </div>
        <div className="vr-card">
          <strong>Card A.</strong> Padding driven by{' '}
          <code>--vr-spacing-md</code>, corners by{' '}
          <code>--vr-radius</code>, background by{' '}
          <code>--vr-color-surface</code>.
        </div>
        <div className="vr-card">
          <strong>Card B.</strong> Stack gap driven by{' '}
          <code>--vr-spacing-lg</code>; outline by{' '}
          <code>--vr-color-muted</code>.
        </div>
      </div>

      <div>
        <div role="heading" aria-level={2} className="vr-section-title">
          Buttons + links (accent / primary)
        </div>
        <div className="vr-body">
          <button className="vr-button" type="button">
            Action button
          </button>
        </div>
        <div className="vr-body">
          <button className="vr-button is-primary" type="button" style={{ marginLeft: 'var(--vr-hsp-sm)' }}>
            Primary variant
          </button>
        </div>
      </div>

      <div>
        <div role="heading" aria-level={2} className="vr-section-title">
          Palette swatches
        </div>
        <div className="vr-swatch-row">
          {PALETTE_INDICES.map((i) => (
            <div
              key={i}
              className="vr-swatch"
              style={{ background: `var(--vr-palette-${i})` }}
            >
              {i}
            </div>
          ))}
        </div>
        <div className="vr-helper" style={{ marginTop: 'var(--vr-vsp-sm)' }}>
          Each swatch reads <code>--vr-palette-{'{n}'}</code>. The
          cluster's <code>paletteCssVarTemplate</code> is the only thing that
          decides this name — change it in <code>default-cluster.ts</code> and
          the apply pipeline writes a different variable on the next palette
          tweak.
        </div>
      </div>

      <RerenderVerify />
    </div>
  );
}

/**
 * Verify across rerender: confirms that panel token tweaks persist across
 * React state changes and subtree mount/unmount cycles. Because every
 * visible element reads --vr-* from :root (NOT from React props), panel-driven
 * token tweaks survive the rerender unchanged.
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
    <div id="rerender-verify">
      <div role="heading" aria-level={2} className="vr-section-title">
        Verify across rerender
      </div>
      <div className="vr-card">
        Click the button to trigger a React rerender. Tweak any panel slider,
        then click again — the tweaked value should still apply, because the
        page reads CSS custom properties from <code>:root</code> rather than
        from React props. Toggle the child subtree to confirm React mount
        churn doesn't disturb the panel either.
      </div>
      <div style={{ marginTop: 'var(--vr-vsp-md)' }}>
        <button type="button" className="vr-button" onClick={bump}>
          Rerender ({' '}
          <span className="vr-rerender-counter">{count}</span> )
        </button>{' '}
        <button
          type="button"
          className="vr-button"
          onClick={toggleChild}
          style={{ marginLeft: 'var(--vr-hsp-sm)' }}
        >
          Toggle child subtree
        </button>
      </div>
      {showChild && (
        <div className="vr-card" style={{ marginTop: 'var(--vr-vsp-md)' }}>
          <strong>Child subtree present.</strong> This block mounts and
          unmounts on every toggle. The panel's own DOM root is appended by
          the adapter outside the React tree, so React reconciliation can
          never touch it.
        </div>
      )}
    </div>
  );
}
