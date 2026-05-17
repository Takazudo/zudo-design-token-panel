/**
 * About page of the Vite + React example.
 *
 * Introduces this example app: its purpose (demonstrating
 * @takazudo/zudo-design-token-panel in a plain Vite + React host), the
 * token namespace it uses, and where to find the panel.
 */

export function About() {
  return (
    <div className="vr-page">
      <div>
        <div role="heading" aria-level={1} className="vr-page-title">
          About this example
        </div>
        <div className="vr-body">
          This Vite + React example demonstrates{' '}
          <code>@takazudo/zudo-design-token-panel</code> running inside a plain
          React 18 host — no Tailwind, no design-system integration, just
          React and Preact coexisting in the same Vite build.
        </div>
      </div>

      <div>
        <div role="heading" aria-level={2} className="vr-section-title">
          How the panel is mounted
        </div>
        <div className="vr-body">
          The panel adapter runs from a single <code>useEffect</code> in{' '}
          <code>AppShell</code>. It lazily imports the panel package and
          registers the console API on <code>window.vr</code>. Because the
          panel's DOM root is appended <em>outside</em> the React tree by the
          adapter, React reconciliation can never disturb the panel — tweaks
          survive rerenders and subtree mount/unmount cycles alike.
        </div>
      </div>

      <div>
        <div role="heading" aria-level={2} className="vr-section-title">
          Token namespace
        </div>
        <div className="vr-body">
          All design tokens use the <code>--vr-*</code> prefix. Token values
          live in <code>src/styles/tokens.css</code>; the apply pipeline
          rewrites that file on disk when you click Apply in the panel. The
          frozen component-class vocabulary (selectors that only consume{' '}
          <code>--vr-*</code> vars) lives in{' '}
          <code>src/styles/components.css</code>.
        </div>
      </div>

      <div>
        <div role="heading" aria-level={2} className="vr-section-title">
          Opening the panel
        </div>
        <div className="vr-body">
          Use the <strong>Open Design Token Panel</strong> button in the
          topbar, or call <code>window.vr.toggleDesignPanel()</code> from the
          browser console. Storage prefix:{' '}
          <code>vite-react-example-tokens</code>.
        </div>
      </div>
    </div>
  );
}
